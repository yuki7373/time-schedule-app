const container = document.getElementById("schedule-container");

// 時間リスト 9:00〜22:00
const hours = Array.from({ length: 14 }, (_, i) => i + 9);

// 保存済みデータを読み込み
let saved = JSON.parse(localStorage.getItem("schedule") || "{}");

hours.forEach(hour => {
    const block = document.createElement("div");
    block.className = "time-block";

    const label = document.createElement("div");
    label.className = "time-label";
    label.textContent = `${hour}:00`;

    const textarea = document.createElement("textarea");
    textarea.value = saved[hour] || "";

    block.appendChild(label);
    block.appendChild(textarea);
    container.appendChild(block);
});

// 保存処理
document.getElementById("save-btn").onclick = () => {
    const newData = {};
    const textareas = document.querySelectorAll("textarea");

    textareas.forEach((ta, i) => {
        newData[hours[i]] = ta.value;
    });

    localStorage.setItem("schedule", JSON.stringify(newData));
    alert("保存しました！");
};
