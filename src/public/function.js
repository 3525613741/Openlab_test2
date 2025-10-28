const API_BASE_URL = 'http://localhost:3000/api';
let userLocation = null;
let baiduMap = null;
let parkingLotsData = [];

// DOM树加载时再获取停车场数据
document.addEventListener('DOMContentLoaded', () => {
    loadParkingLots(); // 加载停车场数据
    setupFilterButton(); // 加载筛选按钮
    setupMapButton(); // 加载地图（header）按钮
});

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
                <button class="navigationButton" onclick="navigateToParking('${name}', ${lot.lat}, ${lot.lng})">
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
        // 防止浏览器无定位权限或者不支持定位
        if (!navigator.geolocation) {
            showError('无法定位');
            return;
        }
        filterBtn.textContent = '定位中...';
        filterBtn.disabled = true; // 防止误触重复点击定位
        // 通过浏览器的API获取用户位置
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                try {
                    const response = await fetch(`${API_BASE_URL}/nearby-parking-lots`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
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
            },
            (error) => {
                console.error('定位失败:', error);
                let errorMsg = '定位失败';
                
                switch(error.code) {
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
    
    // 检查是否支持地理定位
    if (!navigator.geolocation) {
        showError('您的浏览器不支持地理定位');
        return;
    }
    
    // 获取用户位置
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            // 初始化百度地图
            initBaiduMap(userLocation);
        },
        (error) => {
            console.error('定位失败:', error);
            // 如果定位失败，使用默认位置（第一个停车场）
            const defaultLocation = {
                lat: parkingLotsData[0].lat,
                lng: parkingLotsData[0].lng
            };
            initBaiduMap(defaultLocation);
            showError('定位失败，已显示默认位置');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// 初始化百度地图
function initBaiduMap(centerLocation) {
    if (baiduMap) {
        baiduMap = null;
    }

    // 创建地图实例
    baiduMap = new BMap.Map('baiduMap');

    // 使用百度坐标转换器，修正位置偏移
    const convertor = new BMap.Convertor();
    const pointArr = [new BMap.Point(centerLocation.lng, centerLocation.lat)];

    // 参数：1 -> GPS坐标(WGS84)，5 -> 百度坐标(BD09)
    convertor.translate(pointArr, 1, 5, function (data) {
        if (data.status !== 0) {
            console.error('坐标转换失败', data);
            return;
        }

        // 转换后的百度坐标
        const point = data.points[0];
        baiduMap.centerAndZoom(point, 16);
        baiduMap.enableScrollWheelZoom(true);
        baiduMap.addControl(new BMap.NavigationControl());
        baiduMap.addControl(new BMap.ScaleControl());

        // 用户当前位置标记
        if (userLocation) {
            const userConvertor = new BMap.Convertor();
            const userPointArr = [new BMap.Point(userLocation.lng, userLocation.lat)];

            userConvertor.translate(userPointArr, 1, 5, function (res) {
                if (res.status === 0) {
                    const bdUserPoint = res.points[0];
                    const userMarker = new BMap.Marker(bdUserPoint);
                    baiduMap.addOverlay(userMarker);
                    userMarker.setAnimation(BMAP_ANIMATION_BOUNCE);
                    setTimeout(() => userMarker.setAnimation(null), 3000);
                }
            });
        }
    });
}


// 导航到停车场
function navigateToParking(name, lat, lng) {
    if (!userLocation) {
        showError('无法获取您的位置，请先允许定位权限');
        return;
    }

    // 关闭弹窗
    const popup = document.querySelector('.popupOverlay');
    if (popup) popup.remove();

    // 显示地图
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.style.display = 'flex';

    // 如果地图未初始化，先初始化
    if (!baiduMap) {
        initBaiduMap(userLocation);
    }

    // 把用户坐标转换为百度坐标
    const convertor = new BMap.Convertor();
    const pointArr = [new BMap.Point(userLocation.lng, userLocation.lat)];

    convertor.translate(pointArr, 1, 5, (data) => {
        if (data.status === 0) {
            const baiduUserPoint = data.points[0]; // 转换后的百度坐标
            const end = new BMap.Point(lng, lat);

            // 使用百度地图驾车路线规划
            const driving = new BMap.DrivingRoute(baiduMap, {
                renderOptions: {
                    map: baiduMap,
                    autoViewport: true
                },
            });
            // 使用转换后的百度坐标作为起点
            driving.search(baiduUserPoint, end);
        } else {
            showError('定位转换失败，请稍后重试');
        }
    });
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