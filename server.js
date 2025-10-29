const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 托管静态文件
app.use(express.static(path.join(__dirname, 'src/public')));
app.use('/res', express.static(path.join(__dirname, 'res')));

const parkingLots = [
    { name: "曦园停车点", lat: 36.365983, lng: 120.698848, info: "位于曦园正北靠近体育场" },
    { name: "振声苑停车点", lat: 36.367984, lng: 120.693701, info: "位于振声苑E座入口处 敦品大道" },
    { name: "会文北楼停车点", lat: 36.372686, lng: 120.698798, info: "位于会文北楼下正北靠近东门" },
    { name: "图书馆停车点", lat: 36.371637, lng: 120.694757, info: "位于图书馆西南角" }
];

// BD09 -> GCJ02
function bd09ToGcj02(bd_lat, bd_lng) {
    const x = bd_lng - 0.0065;
    const y = bd_lat - 0.006;
    const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * Math.PI);
    const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * Math.PI);
    const gg_lng = z * Math.cos(theta);
    const gg_lat = z * Math.sin(theta);
    return [gg_lat, gg_lng];
}

// GCJ02 -> WGS84
function gcj02ToWgs84(lat, lng) {
    const a = 6378245.0;
    const ee = 0.00669342162296594323;

    function transformLat(x, y) {
        let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y +
            0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * Math.PI) +
            20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(y * Math.PI) +
            40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(y / 12.0 * Math.PI) +
            320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
        return ret;
    }

    function transformLng(x, y) {
        let ret = 300.0 + x + 2.0 * y + 0.1 * x * x +
            0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * Math.PI) +
            20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(x * Math.PI) +
            40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(x / 12.0 * Math.PI) +
            300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
        return ret;
    }

    const dLat = transformLat(lng - 105.0, lat - 35.0);
    const dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    const mgLat = lat + (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
    const mgLng = lng + (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
    const wgLat = lat * 2 - mgLat;
    const wgLng = lng * 2 - mgLng;
    return [wgLat, wgLng];
}

// BD09 -> WGS84
function bd09ToWgs84(bd_lat, bd_lng) {
    const [gcj_lat, gcj_lng] = bd09ToGcj02(bd_lat, bd_lng);
    return gcj02ToWgs84(gcj_lat, gcj_lng);
}

// 随机生成车辆
function generateVehicles() {
    const vehicles = [];
    const prefixes = ['A', 'B', 'C', 'D', 'E', 'F'];

    for (let i = 0; i < 150; i++) {
        const baseLot = parkingLots[Math.floor(Math.random() * parkingLots.length)];
        const offsetLat = (Math.random() - 0.5) * 0.0004;
        const offsetLng = (Math.random() - 0.5) * 0.0004;

        vehicles.push({
            id: `${prefixes[Math.floor(Math.random() * prefixes.length)]}${String(i + 1).padStart(3, '0')}`,
            lat: baseLot.lat + offsetLat,
            lng: baseLot.lng + offsetLng,
            battery: Math.floor(Math.random() * 40) + 60 + '%', // 60%-100%
            status: Math.random() > 0.1 ? 'available' : 'in_use'
        });
    }
    return vehicles;
}

const vehicles = generateVehicles();
// 半正矢公式求地球上两点间的距离
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 获取所需停车场
app.get('/api/parking-lots', (req, res) => {
    const lotsWithCount = parkingLots.map(lot => {
        const vehiclesInLot = vehicles.filter(v => {
            const [wgsLat1, wgsLng1] = bd09ToWgs84(lot.lat, lot.lng);
            const [wgsLat2, wgsLng2] = bd09ToWgs84(v.lat, v.lng);
            const distance = calculateDistance(wgsLat1, wgsLng1, wgsLat2, wgsLng2);
            return distance <= 10 && v.status === 'available';
        });

        return {
            name: lot.name,
            lat: lot.lat,
            lng: lot.lng,
            info: lot.info,
            vehicleCount: vehiclesInLot.length
        };
    });

    res.json(lotsWithCount);
});

// 获取指定停车场详情
app.get('/api/parking-lots/:name/vehicles', (req, res) => {
    const lotName = decodeURIComponent(req.params.name);
    const lot = parkingLots.find(l => l.name === lotName);

    if (!lot) {
        return res.status(404).json({ error: '停车场不存在' });
    }

    const vehiclesInLot = vehicles.filter(v => {
        const [wgsLat1, wgsLng1] = bd09ToWgs84(lot.lat, lot.lng);
        const [wgsLat2, wgsLng2] = bd09ToWgs84(v.lat, v.lng);
        const distance = calculateDistance(wgsLat1, wgsLng1, wgsLat2, wgsLng2);

        return distance <= 10 && v.status === 'available';
    }).map(v => {
        const [wgsLat1, wgsLng1] = bd09ToWgs84(lot.lat, lot.lng);
        const [wgsLat2, wgsLng2] = bd09ToWgs84(v.lat, v.lng);
        const distance = calculateDistance(wgsLat1, wgsLng1, wgsLat2, wgsLng2);
        return {
            id: v.id,
            battery: v.battery,
            distance: Math.round(distance) + 'm',
            lat: v.lat,
            lng: v.lng
        };
    });

    res.json(vehiclesInLot);
});

// 根据用户位置筛选最近的停车场
app.post('/api/nearby-parking-lots', (req, res) => {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
        return res.status(400).json({ error: '缺少位置信息' });
    }

    const lotsWithDistance = parkingLots.map(lot => {
        const [wgsLat1, wgsLng1] = bd09ToWgs84(lat, lng);
        const [wgsLat2, wgsLng2] = bd09ToWgs84(lot.lat, lot.lng);
        const distance = calculateDistance(wgsLat1, wgsLng1, wgsLat2, wgsLng2);
        const vehiclesInLot = vehicles.filter(v => {
            const [wgsLat1, wgsLng1] = bd09ToWgs84(lot.lat, lot.lng);
            const [wgsLat2, wgsLng2] = bd09ToWgs84(v.lat, v.lng);
            const d = calculateDistance(wgsLat1, wgsLng1, wgsLat2, wgsLng2);
            return d <= 10 && v.status === 'available';
        });

        return {
            name: lot.name,
            lat: lot.lat,
            lng: lot.lng,
            info: lot.info,
            distance: Math.round(distance),
            vehicleCount: vehiclesInLot.length
        };
    });

    lotsWithDistance.sort((a, b) => a.distance - b.distance);
    res.json(lotsWithDistance.slice(0, 3));
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});