const parkingData = {
    "曦园停车点": [
        {id: "A101", position: "东侧1号", battery:"85%"},
        {id: "A101", position: "东侧1号", battery:"85%"}
    ],
    "振声苑停车点": [
        {id: "A101", position: "E座东侧1号", battery:"85%"},
        {id: "A101", position: "E座东侧2号", battery:"85%"}
    ],
    "会文北楼停车点": [
        {id: "A101", position: "东侧1号", battery:"85%"},
        {id: "A101", position: "东侧1号", battery:"85%"}
    ],
    "图书馆停车点": [
        {id: "A101", position: "东侧1号", battery:"85%"},
        {id: "A101", position: "东侧1号", battery:"85%"}
    ],
};

document.querySelectorAll(".parkingLot").forEach(card => {
    card.addEventListener("click", () => {
        const name = card.querySelector("h3").textContent.trim();
        showParkingInfo(name);
    });
});

function showParkingInfo(name){
    const vehicles = parkingData[name];
    if(!vehicles) return;

    const popup = document.createElement("div");
    popup.className = "popupOverlay";
    popup.innerHTML =  `
        <div class = "popup">
            <h3>${name} 车辆信息</h3>
            <ul>
                ${vehicles.map(v => `
                <li>
                    <strong>编号：</strong>${v.id}
                    <strong>位置：</strong>${v.position}
                    <strong>电量：</strong>${v.battery}
                </li>`).join("")}
            </ul>
            <button class="closeButton">关闭</button>
        </div>
    `;
    document.body.appendChild(popup);

    popup.addEventListener("click", e => {
        if(e.target.classList.contains("popupOverlay") || e.target.classList.contains("closeButton")) {
            popup.remove();
        }
    });
}