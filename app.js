// ============================================================
//   Time Schedule App (Googleカレンダー風・月/週/今日ビュー)
//   修正版（1時間60px / 30分30px 仕様）
// ============================================================

// ---- Utility ----
const pad2 = n => (n < 10 ? "0" + n : "" + n);
const toYMD = d => d.toISOString().slice(0, 10);
const weekdayNames = ["日", "月", "火", "水", "木", "金", "土"];

function loadEvents() {
    return JSON.parse(localStorage.getItem("events") || "{}");
}
function saveEvents(events) {
    localStorage.setItem("events", JSON.stringify(events));
}

let state = {
    view: "month",
    focusDate: new Date()
};

function updateActiveButton() {
    document.getElementById("month-btn").classList.remove("primary");
    document.getElementById("week-btn").classList.remove("primary");
    document.getElementById("today-btn").classList.remove("primary");

    if (state.view === "month") document.getElementById("month-btn").classList.add("primary");
    if (state.view === "week") document.getElementById("week-btn").classList.add("primary");
    if (state.view === "today") document.getElementById("today-btn").classList.add("primary");
}

// ============================================================
//   RENDER MAIN
// ============================================================
function render() {
    document.getElementById("current-label").textContent =
        state.view === "month"
            ? formatMonth(state.focusDate)
            : state.view === "today"
            ? toYMD(state.focusDate)
            : formatWeekRange(state.focusDate);

    const container = document.getElementById("content");
    container.innerHTML = "";

    if (state.view === "month") renderMonth(container);
    else if (state.view === "week") renderWeek(container);
    else renderToday(container);

    updateActiveButton(); // ← ← ★ これ追加！
}


// ============================================================
//   Month View
// ============================================================
function formatMonth(d) {
    return d.getFullYear() + "年 " + (d.getMonth() + 1) + "月";
}

function renderMonth(container) {
    const wrap = document.createElement("div");
    wrap.className = "month-view";

    const headerRow = document.createElement("div");
    headerRow.className = "month-header";
    weekdayNames.forEach(w => {
        const el = document.createElement("div");
        el.textContent = w;
        headerRow.appendChild(el);
    });
    wrap.appendChild(headerRow);

    const grid = document.createElement("div");
    grid.className = "month-grid";

    const year = state.focusDate.getFullYear();
    const month = state.focusDate.getMonth();

    const start = new Date(year, month, 1);
    const startDay = start.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // blank
    for (let i = 0; i < startDay; i++) {
        const cell = document.createElement("div");
        cell.className = "day-cell";
        grid.appendChild(cell);
    }

    // days
    const events = loadEvents();
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement("div");
        cell.className = "day-cell";

        const n = document.createElement("div");
        n.className = "day-num";
        n.textContent = d;
        cell.appendChild(n);

        const dateObj = new Date(year, month, d);
        const key = toYMD(dateObj);
        const evs = events[key] || [];

        const wrapEvent = document.createElement("div");
        wrapEvent.className = "day-events";

        evs.slice(0, 3).forEach(ev => {
            const tag = document.createElement("div");
            tag.className = "event-tag";
            tag.textContent = ev.title;
            wrapEvent.appendChild(tag);
        });

        cell.appendChild(wrapEvent);

        cell.onclick = () => {
            state.view = "week";
            state.focusDate = dateObj;
            render();
        };

        grid.appendChild(cell);
    }

    wrap.appendChild(grid);
    container.appendChild(wrap);
}

// ============================================================
//   Week View（Googleカレンダー風）
// ============================================================
function startOfWeek(d) {
    const c = new Date(d);
    const diff = c.getDay();
    c.setDate(c.getDate() - diff);
    c.setHours(0, 0, 0, 0);
    return c;
}

function formatWeekRange(d) {
    const s = startOfWeek(d);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    return toYMD(s) + " ～ " + toYMD(e);
}

function renderWeek(container) {
    const wrap = document.createElement("div");
    wrap.className = "week-view";

    const weekStart = startOfWeek(state.focusDate);
    const events = loadEvents();

    // --- 曜日ヘッダー ---
    const days = document.createElement("div");
    days.className = "week-days";
    days.appendChild(document.createElement("div")); // 時間軸ぶんの空枠

    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const cell = document.createElement("div");
        cell.textContent = `${weekdayNames[i]} ${d.getMonth() + 1}/${d.getDate()}`;
        days.appendChild(cell);
    }
    wrap.appendChild(days);

    // --- グリッド ---
    const grid = document.createElement("div");
    grid.className = "week-grid";

    // 左：時間軸
    const timeCol = document.createElement("div");
    timeCol.className = "time-col";

    for (let h = 0; h < 24; h++) {
        const t = document.createElement("div");
        t.className = "time-cell";
        t.textContent = pad2(h) + ":00";
        timeCol.appendChild(t);
    }
    grid.appendChild(timeCol);

    // 各曜日
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);

        const key = toYMD(d);
        const col = document.createElement("div");
        col.className = "day-col";
        col.dataset.date = key;

        // 30分 × 48
        for (let s = 0; s < 48; s++) {
            const cell = document.createElement("div");
            cell.className = "grid-cell";
            cell.dataset.slot = s;
            col.appendChild(cell);
        }

        // イベント配置
        if (events[key]) {
            events[key].forEach(ev => placeEventBlock(col, ev, key));
        }

        grid.appendChild(col);
    }

    wrap.appendChild(grid);
    container.appendChild(wrap);
}

// ============================================================
//   Event Block（配置 / ドラッグ / リサイズ）
// ============================================================
function placeEventBlock(col, ev, dateKey) {
    const block = document.createElement("div");
    block.className = "event-block";
    block.textContent = ev.title;

    const resize = document.createElement("div");
    resize.className = "resize-handle";
    block.appendChild(resize);

    // 位置と高さ（30分=30px）
    const startParts = ev.start.split(":");
    const endParts = ev.end.split(":");

    const startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

    const top = (startMin / 30) * 30;
    const height = ((endMin - startMin) / 30) * 30;

    block.style.top = top + "px";
    block.style.height = height + "px";

    enableDrag(block, ev, dateKey);
    enableResize(block, ev, dateKey);

    col.appendChild(block);
}

function enableDrag(block, ev, dateKey) {
    let startY;
    let startTop;

    block.addEventListener("mousedown", e => {
        if (e.target.classList.contains("resize-handle")) return;

        startY = e.clientY;
        startTop = parseInt(block.style.top);
        block.classList.add("event-dragging");

        const move = e2 => {
            let newTop = startTop + (e2.clientY - startY);
            newTop = Math.max(0, newTop);
            newTop = Math.round(newTop / 30) * 30;
            block.style.top = newTop + "px";
        };

        const up = () => {
            block.classList.remove("event-dragging");

            const finalTop = parseInt(block.style.top);
            const startSlot = finalTop / 30;
            const newStartMin = startSlot * 30;

            ev.start = formatTime(newStartMin);
            ev.end = formatTime(newStartMin + parseInt(block.style.height) / 30 * 30);

            saveMovedEvent(ev, dateKey);
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);
        };

        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    });
}

function enableResize(block, ev, dateKey) {
    const handle = block.querySelector(".resize-handle");

    handle.addEventListener("mousedown", e => {
        e.stopPropagation();

        let startY = e.clientY;
        let startH = parseInt(block.style.height);

        const move = e2 => {
            let h = startH + (e2.clientY - startY);
            h = Math.max(30, h);
            h = Math.round(h / 30) * 30;
            block.style.height = h + "px";
        };

        const up = () => {
            const finalH = parseInt(block.style.height);
            const durationMin = finalH / 30 * 30;

            const startParts = ev.start.split(":");
            const startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);

            ev.end = formatTime(startMin + durationMin);

            saveMovedEvent(ev, dateKey);

            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);
        };

        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    });
}

function formatTime(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return pad2(h) + ":" + pad2(m);
}

function saveMovedEvent(ev, dateKey) {
    const events = loadEvents();
    const dayEvents = events[dateKey] || [];

    const idx = dayEvents.findIndex(e => e.id === ev.id);
    if (idx >= 0) dayEvents[idx] = ev;

    events[dateKey] = dayEvents;
    saveEvents(events);
}

// ============================================================
//   Today View（1日）
// ============================================================
function renderToday(container) {
    const wrap = document.createElement("div");
    wrap.className = "week-view";  // 同じスタイルでOK（縦スクロール）

    const key = toYMD(state.focusDate);
    const events = loadEvents()[key] || [];

    // 曜日ヘッダー
    const header = document.createElement("div");
    header.className = "week-days";
    header.innerHTML = `<div></div><div>${weekdayNames[state.focusDate.getDay()]} ${state.focusDate.getMonth()+1}/${state.focusDate.getDate()}</div>`;
    wrap.appendChild(header);

    // グリッド本体
    const grid = document.createElement("div");
    grid.className = "week-grid";

    // 左・時間軸
    const timeCol = document.createElement("div");
    timeCol.className = "time-col";
    for (let h = 0; h < 24; h++) {
        const t = document.createElement("div");
        t.className = "time-cell";
        t.textContent = pad2(h) + ":00";
        timeCol.appendChild(t);
    }
    grid.appendChild(timeCol);

    // 今日の1列
    const col = document.createElement("div");
    col.className = "day-col";
    col.dataset.date = key;

    for (let s = 0; s < 48; s++) {
        const cell = document.createElement("div");
        cell.className = "grid-cell";
        col.appendChild(cell);
    }

    // イベント追加
    events.forEach(ev => placeEventBlock(col, ev, key));

    grid.appendChild(col);

    wrap.appendChild(grid);
    container.appendChild(wrap);
}


// ============================================================
//   BUTTON HANDLERS
// ============================================================
document.getElementById("month-btn").onclick = () => {
    state.view = "month";
    render();
};
document.getElementById("week-btn").onclick = () => {
    state.view = "week";
    render();
};
document.getElementById("today-btn").onclick = () => {
    state.view = "today";
    render();
};

// 初回
render();
