const API_BASE_URL = 'http://localhost:3000/api';
let userLocation = null;

document.addEventListener('DOMContentLoaded', () => {
    loadParkingLots();
    setupFilterButton();
});

async function loadParkingLots() {
    try {
        const response = await fetch(`${API_BASE_URL}/parking-lots`);
        const parkingLots = await response.json();//将json数据转化成js对象
        renderParkingLots(parkingLots);
    } catch (error) {
        console.error('加载停车场数据失败:', error);
        showError('加载数据失败，请检查后端服务是否运行');
    }
}

function renderParkingLots(parkingLots) {
    const container = document.getElementById('parkingContainer');
    container.innerHTML = '';
    
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

async function showParkingInfo(name) {
    try {
        const response = await fetch(`${API_BASE_URL}/parking-lots/${encodeURIComponent(name)}/vehicles`);
        const vehicles = await response.json();//解析为js对象
        
        if (vehicles.length === 0) {
            showMessage('该停车场暂无可用车辆');
            return;
        }
        
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

function setupFilterButton() {
    const filterBtn = document.getElementById('filterBtn');
    
    filterBtn.addEventListener('click', async () => {
        
        if (!navigator.geolocation) {
            showError('您的浏览器不支持地理定位');
            return;
        }
        
        filterBtn.textContent = '定位中...';
        filterBtn.disabled = true;
        
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
                enableHighAccuracy: true, // 尽量使用高精度定位
                timeout: 10000, // 最大等待时间为10s
                maximumAge: 0 //不使用缓存的地理位置信息
            }
        );
    });
}

function showNearbyPopup(lots) {
    const popup = document.createElement('div');
    popup.className = 'popupOverlay';
    popup.innerHTML = `
        <div class="popup">
            <h3>离您最近的停车场</h3>
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

function showMessage(message) {
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