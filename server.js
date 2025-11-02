const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'src/public')));
app.use('/res', express.static(path.join(__dirname, 'res')));

const parkingLots = [
    {
        name: "凤凰居1号宿舍楼下", lat: 36.3593, lng: 120.6846, address: "凤凰居1号楼北侧指定停车区", polygon: [
            { lat: 36.3591, lng: 120.6844 },
            { lat: 36.3591, lng: 120.6848 },
            { lat: 36.3595, lng: 120.6848 },
            { lat: 36.3595, lng: 120.6844 },
            { lat: 36.3591, lng: 120.6844 }]
    },
    {
        name: "教学楼", lat: 36.3627, lng: 120.6823, address: "教学楼东楼", polygon: [
            { lat: 36.3625, lng: 120.6821 },
            { lat: 36.3625, lng: 120.6825 },
            { lat: 36.3629, lng: 120.6825 },
            { lat: 36.3629, lng: 120.6821 },
            { lat: 36.3625, lng: 120.6821 }]
    },
    {
        name: "食堂西门", lat: 36.3598, lng: 120.6878, address: "食堂北门出口处", polygon: [
            { lat: 36.3596, lng: 120.6876 },
            { lat: 36.3596, lng: 120.6880 },
            { lat: 36.3600, lng: 120.6880 },
            { lat: 36.3600, lng: 120.6876 },
            { lat: 36.3596, lng: 120.6876 }]
    },
    {
        name: "图书馆南门", lat: 36.3659, lng: 120.6836, address: "图书馆南门入口西侧", polygon: [
            { lat: 36.3657, lng: 120.6834 },
            { lat: 36.3657, lng: 120.6838 },
            { lat: 36.3661, lng: 120.6838 },
            { lat: 36.3661, lng: 120.6834 },
            { lat: 36.3657, lng: 120.6834 }]
    },
    {
        name: "校医院北侧", lat: 36.3587, lng: 120.6851, address: "校医院西侧非机动车停放区", polygon: [
            { lat: 36.3585, lng: 120.6849 },
            { lat: 36.3585, lng: 120.6853 },
            { lat: 36.3589, lng: 120.6853 },
            { lat: 36.3589, lng: 120.6849 },
            { lat: 36.3585, lng: 120.6849 }]
    },
    {
        name: "体育馆东门", lat: 36.3589, lng: 120.6813, address: "体育馆东门入口南侧", polygon: [
            { lat: 36.3587, lng: 120.6811 },
            { lat: 36.3587, lng: 120.6815 },
            { lat: 36.3591, lng: 120.6815 },
            { lat: 36.3591, lng: 120.6811 },
            { lat: 36.3587, lng: 120.6811 }]
    }
];

// 将WGS84转为BD09坐标
function wgs84ToBd09(lat, lng) {
    const a = 6378245.0;
    const ee = 0.00669342162296594323;

    const dLat = transformLat(lng - 105.0, lat - 35.0);
    const dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * Math.PI;
    const magic = Math.sin(radLat);
    const sqrtMagic = Math.sqrt(1 - ee * magic * magic);
    const mgLat = lat + (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
    const mgLng = lng + (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);

    const x = mgLng, y = mgLat;
    const z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * Math.PI * 3000.0 / 180.0);
    const theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * Math.PI * 3000.0 / 180.0);
    const bdLng = z * Math.cos(theta) + 0.0065;
    const bdLat = z * Math.sin(theta) + 0.006;

    return [bdLat, bdLng];
}

function transformLat(x, y) {
    return -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y +
        0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x)) +
        ((20.0 * Math.sin(6.0 * x * Math.PI) +
            20.0 * Math.sin(2.0 * x * Math.PI) +
            20.0 * Math.sin(y * Math.PI) +
            40.0 * Math.sin(y / 3.0 * Math.PI) +
            160.0 * Math.sin(y / 12.0 * Math.PI) +
            320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0);
}

function transformLng(x, y) {
    return 300.0 + x + 2.0 * y + 0.1 * x * x +
        0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x)) +
        ((20.0 * Math.sin(6.0 * x * Math.PI) +
            20.0 * Math.sin(2.0 * x * Math.PI) +
            20.0 * Math.sin(x * Math.PI) +
            40.0 * Math.sin(x / 3.0 * Math.PI) +
            150.0 * Math.sin(x / 12.0 * Math.PI) +
            300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0);
}

// 随机生成车辆
function generateVehicles() {
    const vehicles = [];
    const prefixes = ['A', 'B', 'C', 'D', 'E', 'F'];

    for (let i = 0; i < 300; i++) {
        const baseLot = parkingLots[Math.floor(Math.random() * parkingLots.length)];
        const offsetLat = (Math.random() - 0.5) * 0.0004;
        const offsetLng = (Math.random() - 0.5) * 0.0004;
        vehicles.push({
            id: `${prefixes[Math.floor(Math.random() * prefixes.length)]}${String(i + 1).padStart(3, '0')}`,
            lat: baseLot.lat + offsetLat,
            lng: baseLot.lng + offsetLng,
            battery: Math.ceil(Math.random() * 100) + '%',
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

// 获取停车场信息
app.get('/api/parking-lots', (req, res) => {
    const lotsWithCount = parkingLots.map(lot => {
        const vehiclesInLot = vehicles.filter(v => {
            const [lat1, lng1] = [lot.lat, lot.lng];
            const [lat2, lng2] = [v.lat, v.lng];
            const distance = calculateDistance(lat1, lng1, lat2, lng2);
            return distance <= 10 && v.status === 'available' && v.battery !== '0%';
        });
        const [bdLat, bdLng] = wgs84ToBd09(lot.lat, lot.lng);
        const bdPolygon = lot.polygon.map(p => {
            const [bdLat, bdLng] = wgs84ToBd09(p.lat, p.lng);
            return { lat: bdLat, lng: bdLng };
        });
        return {
            name: lot.name,
            lat: bdLat,
            lng: bdLng,
            address: lot.address,
            vehicleCount: vehiclesInLot.length,
            polygon: bdPolygon
        };
    });
    res.json(lotsWithCount);
});

// 获取指定停车场内的车辆详情
app.get('/api/parking-lots/:name/vehicles', (req, res) => {
    const lotName = decodeURIComponent(req.params.name);
    const lot = parkingLots.find(l => l.name === lotName);

    if (!lot) {
        return res.status(404).json({ error: '停车点不存在' });
    }

    const vehiclesInLot = vehicles.filter(v => {
        const [lat1, lng1] = [lot.lat, lot.lng];
        const [lat2, lng2] = [v.lat, v.lng];
        const distance = calculateDistance(lat1, lng1, lat2, lng2);
        return distance <= 10 && v.status === 'available' && v.battery !== '0%';
    }).map(v => {
        const [lat1, lng1] = [lot.lat, lot.lng];
        const [lat2, lng2] = [v.lat, v.lng];
        const distance = calculateDistance(lat1, lng1, lat2, lng2);
        const [bdLat, bdLng] = wgs84ToBd09(lat2, lng2);
        return {
            id: v.id,
            battery: v.battery,
            distance: Math.round(distance) + 'm',
            lat: bdLat,
            lng: bdLng
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
        const [lat1, lng1] = [lat, lng];
        const [lat2, lng2] = [lot.lat, lot.lng];
        const distance = calculateDistance(lat1, lng1, lat2, lng2);
        const vehicleInLot = vehicles.filter(v => {
            const [lat1, lng1] = [lot.lat, lot.lng];
            const [lat2, lng2] = [v.lat, v.lng];
            const distance = calculateDistance(lat1, lng1, lat2, lng2);
            return distance <= 10 && v.status === 'available' && v.battery !== '0%';
        });
        const [bdLat, bdLng] = wgs84ToBd09(lat2, lng2);
        return {
            name: lot.name,
            lat: bdLat,
            lng: bdLng,
            address: lot.address,
            distance: Math.round(distance),
            vehicleCount: vehicleInLot.length
        };
    });

    lotsWithDistance.sort((a, b) => a.distance - b.distance);
    res.json(lotsWithDistance);
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});