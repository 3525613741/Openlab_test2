const API_BASE_URL = 'http://localhost:3000/api';
let userLocation = null;
let baiduMap = null;
let parkingLotsData = [];

// DOM树加载时再获取停车场数据
document.addEventListener('DOMContentLoaded', async () => {
    await initUserLocation(); // 初始化用户位置
    await loadParkingLots(); // 加载停车场数据
    setupFilterButton(); // 加载筛选按钮
    setupMapButton(); // 加载地图（header）按钮
});

//先初始化用户位置
async function initUserLocation(){
    return new Promise((resolve) => {
        if(!navigator.geolocation){
            showError('定位失败');
            resolve();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const wgsLng = position.coords.longitude;
                const wgsLat = position.coords.latitude;
                const convertor = new BMap.Convertor();
                const pointArr = [new BMap.Point(wgsLng, wgsLat)];

                convertor.translate(pointArr, 1, 5, (data) => {
                    if(data.status === 0) {
                        userLocation = {
                            lat: data.points[0].lat,
                            lng: data.points[0].lng
                        };
                        resolve();
                    } else {
                        showError('定位失败');
                        resolve();
                    }
                });
            },
            (error) => {
                console.error('定位失败', error);
                showError('无法获取位置信息');
                resolve();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// 加载停车场列表
async function loadParkingLots() {
    try {
        const response = await fetch(`${API_BASE_URL}/parking-lots`);
        parkingLotsData = await response.json();
        renderParkingLots(parkingLotsData);
    } catch (error) {
        console.error('加载停车场数据失败:', error);
        showError('加载数据失败，请检查后端服务是否运行');
    }
}

// 添加并渲染停车场卡片，即主页面元素
function renderParkingLots(parkingLots) {
    const container = document.getElementById('parkingContainer');
    container.innerHTML = ''; // 将“加载中...”移除

    parkingLots.forEach(lot => {
        const card = document.createElement('div');
        card.className = 'parkingLot';
        card.innerHTML = `
            <h3>${lot.name}</h3>
            <p>详细信息：${lot.info}</p>
            <p>中心点：${lot.lat}, ${lot.lng}</p>
            <p><strong>可用车辆：${lot.vehicleCount} 辆</strong></p>
            ${lot.distance ? `<p class="distance">距离您：${lot.distance}米</p>` : ''}
        `;

        card.addEventListener('click', () => {
            showParkingInfo(lot.name);
        });

        container.appendChild(card);
    });
}
// 点击卡片显示停车场车辆详情（popup）
async function showParkingInfo(name) {
    try {
        const response = await fetch(`${API_BASE_URL}/parking-lots/${encodeURIComponent(name)}/vehicles`); //编码name，防止出现乱码
        const vehicles = await response.json();

        // 防止停车场无车
        if (vehicles.length === 0) {
            showMessage('该停车场暂无可用车辆');
            return;
        }

        const lot = parkingLotsData.find(l => l.name === name);
        const popup = document.createElement('div');
        popup.className = 'popupOverlay';
        popup.innerHTML = `
            <div class="popup">
                <h3>${name} 车辆信息</h3>
                <p class="vehicleCount">共 ${vehicles.length} 辆可用</p>
                <ul>
                    ${vehicles.map(v => `
                    <li>
                        <strong>编号：</strong>${v.id}
                        <strong>电量：</strong>${v.battery}
                        <strong>距中心：</strong>${v.distance}
                    </li>`).join('')}
                </ul>
                <button class="navigationButton" onclick="navigateToParking(${lot.lat}, ${lot.lng})">
                    导航
                </button>
                <button class="closeButton">关闭</button>
            </div>
        `;
        document.body.appendChild(popup);

        popup.addEventListener('click', e => {
            if (e.target.classList.contains('popupOverlay') || e.target.classList.contains('closeButton')) {
                popup.remove();
            }
        });
    } catch (error) {
        console.error('加载车辆信息失败:', error);
        showError('加载车辆信息失败');
    }
}

// 设置寻找附近按钮
function setupFilterButton() {
    const filterBtn = document.getElementById('filterBtn');
    filterBtn.addEventListener('click', async () => {
        if (!navigator.geolocation) {
            showError('无法定位');
            return;
        }

        filterBtn.textContent = '定位中...';
        filterBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const wgsLng = position.coords.longitude;
                const wgsLat = position.coords.latitude;
                const convertor = new BMap.Convertor();
                const pointArr = [new BMap.Point(wgsLng, wgsLat)];

                convertor.translate(pointArr, 1, 5, async (data) => {
                    if (data.status === 0) {
                        const bdPoint = data.points[0];
                        const userLocation = {
                            lat: bdPoint.lat,
                            lng: bdPoint.lng
                        };

                        try {
                            const response = await fetch(`${API_BASE_URL}/nearby-parking-lots`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(userLocation)
                            });

                            const nearbyLots = await response.json();
                            parkingLotsData = nearbyLots;
                            renderParkingLots(nearbyLots);
                            showNearbyPopup(nearbyLots);

                            filterBtn.textContent = '重新寻找';
                            filterBtn.disabled = false;
                        } catch (error) {
                            console.error('寻找失败:', error);
                            showError('寻找失败，请重试');
                            filterBtn.textContent = '寻找附近';
                            filterBtn.disabled = false;
                        }
                    } else {
                        console.error('坐标转换失败');
                        showError('坐标转换失败');
                        filterBtn.textContent = '寻找附近';
                        filterBtn.disabled = false;
                    }
                });
            },
            (error) => {
                console.error('定位失败:', error);
                let errorMsg = '定位失败';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = '您拒绝了定位权限，请在浏览器设置中允许定位';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = '无法获取位置信息';
                        break;
                    case error.TIMEOUT:
                        errorMsg = '定位超时，请重试';
                        break;
                }

                showError(errorMsg);
                filterBtn.textContent = '寻找附近';
                filterBtn.disabled = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}


// 显示附近停车场popup
function showNearbyPopup(lots) {
    const popup = document.createElement('div');
    popup.className = 'popupOverlay';
    popup.innerHTML = `
        <div class="popup">
            <h3>距离最近的停车点</h3>
            <ul>
                ${lots.map((lot, index) => `
                <li>
                    <strong>${index + 1}. ${lot.name}</strong><br>
                    距离：${lot.distance}米 | 可用车辆：${lot.vehicleCount}辆
                </li>`).join('')}
            </ul>
            <button class="closeButton">关闭</button>
        </div>
    `;
    document.body.appendChild(popup);

    popup.addEventListener('click', e => {
        if (e.target.classList.contains('popupOverlay') || e.target.classList.contains('closeButton')) {
            popup.remove();
        }
    });
}

// 设置地图按钮
function setupMapButton() {
    const showmapBtn = document.getElementById('showMapBtn');
    const mapContainer = document.getElementById('mapContainer');
    const closeMapBtn = document.getElementById('closeMapBtn');

    showmapBtn.addEventListener('click', () => {
        showMap();
    });

    closeMapBtn.addEventListener('click', () => {
        mapContainer.style.display = 'none'; // 仅隐藏，若remove则要重新加载，性能消耗过大
    });
}

// 显示地图
function showMap() {
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.style.display = 'flex';
    if (!userLocation) {
        showError('无法获取定位信息');
        return;
    }
    initBaiduMap(userLocation);
}

// 初始化百度地图
function initBaiduMap(centerLocation) {
    if (!baiduMap) {
        baiduMap = new BMap.Map('baiduMap');
        baiduMap.enableScrollWheelZoom(true);
        baiduMap.addControl(new BMap.NavigationControl());
        baiduMap.addControl(new BMap.ScaleControl());
    }
    baiduMap.clearOverlays();
    const point = new BMap.Point(centerLocation.lng, centerLocation.lat);
    baiduMap.centerAndZoom(point, 16);

    setTimeout(() => {
        baiduMap.checkResize();
        baiduMap.centerAndZoom(point, 16);
    }, 200);

    const userMarker = new BMap.Marker(point);
    baiduMap.addOverlay(userMarker);
    userMarker.setAnimation(BMAP_ANIMATION_BOUNCE);
    setTimeout(() => userMarker.setAnimation(null), 3000);
}


// 导航到停车场
function navigateToParking(lat, lng) {
    if (!userLocation) {
        showError('无法获取您的位置，请先允许定位权限');
        return;
    }
    const popup = document.querySelector('.popupOverlay');
    if (popup) popup.remove();
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.style.display = 'flex';

    if (!baiduMap) {
        initBaiduMap(userLocation);
    }

    const start = new BMap.Point(userLocation.lng, userLocation.lat);
    const end = new BMap.Point(lng, lat);

    baiduMap.clearOverlays();
    const userMarker = new BMap.Marker(start);
    baiduMap.addOverlay(userMarker);
    userMarker.setAnimation(BMAP_ANIMATION_BOUNCE);
    setTimeout(() => userMarker.setAnimation(null), 3000);

    const driving = new BMap.DrivingRoute(baiduMap, {
        renderOptions:{map: baiduMap, autoViewPort: true},
    });
    driving.search(start, end);
}

// 显示错误信息
function showError(message) {
    const popup = document.createElement('div');
    popup.className = 'popupOverlay';
    popup.innerHTML = `
        <div class="popup">
            <h3>⚠️提示⚠️</h3>
            <p>${message}</p>
            <button class="closeButton">确定</button>
        </div>
    `;
    document.body.appendChild(popup);

    popup.addEventListener('click', e => {
        if (e.target.classList.contains('popupOverlay') || e.target.classList.contains('closeButton')) {
            popup.remove();
        }
    });
}

// 显示普通消息
function showMessage(message) {
    const popup = document.createElement('div');
    popup.className = 'popupOverlay';
    popup.innerHTML = `
        <div class="popup">
            <h3>💡提示💡</h3>
            <p>${message}</p>
            <button class="closeButton">确定</button>
        </div>
    `;
    document.body.appendChild(popup);

    popup.addEventListener('click', e => {
        if (e.target.classList.contains('popupOverlay') || e.target.classList.contains('closeButton')) {
            popup.remove();
        }
    });
}