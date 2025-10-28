const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());


app.use(express.static(path.join(__dirname, 'src/public')));
app.use('/res', express.static(path.join(__dirname, 'res')));

const parkingLots = [
    { name: "曦园停车点", lat: 36.360035, lng: 120.692168, info: "位于曦园正北靠近体育场" },
    { name: "振声苑停车点", lat: 36.362047, lng: 120.687431, info: "位于振声苑E座入口处 敦品大道" },
    { name: "会文北楼停车点", lat: 36.362072, lng: 120.692347, info: "位于会文北楼下正北靠近东门" },
    { name: "图书馆停车点", lat: 36.366756, lng: 120.690647, info: "位于图书馆西南角" }
];
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
            const distance = calculateDistance(lot.lat, lot.lng, v.lat, v.lng);
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
        const distance = calculateDistance(lot.lat, lot.lng, v.lat, v.lng);
        return distance <= 10 && v.status === 'available';
    }).map(v => {
        const distance = calculateDistance(lot.lat, lot.lng, v.lat, v.lng);
        return {
            id: v.id,
            battery: v.battery,
            distance: Math.round(distance) + 'm'
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
        const distance = calculateDistance(lat, lng, lot.lat, lot.lng);
        const vehiclesInLot = vehicles.filter(v => {
            const d = calculateDistance(lot.lat, lot.lng, v.lat, v.lng);
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