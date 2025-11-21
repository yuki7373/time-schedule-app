// ============================================================
//   Time Schedule App (Googleカレンダー風)
//   VT-1 モーダル ＋ ドラッグ編集 ＋ クリック作成
//   ★ 完全修正版（全ビューに反映 / 削除 OK / 追加直後編集 ）
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
    focusDate: new Date(),
    editingEvent: null,
    editingDateKey: null
};

// ============================================================
//   ボタン状態更新
// ============================================================
function updateActiveButton() {
    document.getElementById("month-btn").classList.remove("primary");
    document.getElementById("week-btn").classList.remove("primary");
    document.getElementById("today-btn").classList.remove("primary");

    if (state.view === "month") document.getElementById("month-btn").classList.add("primary");
    if (state.view === "week") document.getElementById("week-btn").classList.add("primary");
    if (state.view === "today") document.getElementById("today-btn").classList.add("primary");
}

// ============================================================
//   MAIN RENDER
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

    updateActiveButton();
}

// ============================================================
//   MONTH VIEW
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

    const events = loadEvents();

    // days
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
//   WEEK VIEW
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

function slotToTime(slot) {
    const min = slot * 30;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return pad2(h) + ":" + pad2(m);
}
function timeToSlot(t) {
    const [h, m] = t.split(":").map(Number);
    return (h * 60 + m) / 30;
}

// ============================================================
//   WEEK RENDER
// ============================================================
function renderWeek(container) {
    const wrap = document.createElement("div");
    wrap.className = "week-view";

    const weekStart = startOfWeek(state.focusDate);
    const events = loadEvents();

    const days = document.createElement("div");
    days.className = "week-days";
    days.appendChild(document.createElement("div"));

    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const el = document.createElement("div");
        el.textContent = `${weekdayNames[i]} ${d.getMonth() + 1}/${d.getDate()}`;
        days.appendChild(el);
    }
    wrap.appendChild(days);

    const grid = document.createElement("div");
    grid.className = "week-grid";

    const timeCol = document.createElement("div");
    timeCol.className = "time-col";
    for (let h = 0; h < 24; h++) {
        const t = document.createElement("div");
        t.className = "time-cell";
        t.textContent = pad2(h) + ":00";
        timeCol.appendChild(t);
    }
    grid.appendChild(timeCol);

    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const key = toYMD(d);

        const col = document.createElement("div");
        col.className = "day-col";
        col.dataset.date = key;

        for (let s = 0; s < 48; s++) {
            const cell = document.createElement("div");
            cell.className = "grid-cell";
            cell.dataset.slot = s;
            col.appendChild(cell);
        }

        (events[key] || []).forEach(ev => placeEventBlock(col, ev, key));

        enableColumnClick(col, key);
        enableColumnDrag(col, key);

        grid.appendChild(col);
    }

    wrap.appendChild(grid);
    container.appendChild(wrap);
}

// ============================================================
//   TODAY VIEW
// ============================================================
function renderToday(container) {
    const wrap = document.createElement("div");
    wrap.className = "week-view";

    const key = toYMD(state.focusDate);
    const events = loadEvents()[key] || [];

    const head = document.createElement("div");
    head.className = "week-days";
    head.innerHTML = `<div></div><div>${weekdayNames[state.focusDate.getDay()]} ${state.focusDate.getMonth()+1}/${state.focusDate.getDate()}</div>`;
    wrap.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "week-grid";

    const timeCol = document.createElement("div");
    timeCol.className = "time-col";
    for (let h = 0; h < 24; h++) {
        const t = document.createElement("div");
        t.className = "time-cell";
        t.textContent = pad2(h) + ":00";
        timeCol.appendChild(t);
    }
    grid.appendChild(timeCol);

    const col = document.createElement("div");
    col.className = "day-col";
    col.dataset.date = key;

    for (let s = 0; s < 48; s++) {
        const cell = document.createElement("div");
        cell.className = "grid-cell";
        cell.dataset.slot = s;
        col.appendChild(cell);
    }

    events.forEach(ev => placeEventBlock(col, ev, key));

    enableColumnClick(col, key);
    enableColumnDrag(col, key);

    grid.appendChild(col);
    wrap.appendChild(grid);
    container.appendChild(wrap);
}

// ============================================================
//   BUTTONS
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

render();

// ============================================================
//   EVENT BLOCK：描画 + ドラッグ + リサイズ + 編集
// ============================================================
function placeEventBlock(col, ev, dateKey) {
    const block = document.createElement("div");
    block.className = "event-block";
    block.dataset.id = ev.id;
    block.textContent = ev.title;

    const resize = document.createElement("div");
    resize.className = "resize-handle";
    block.appendChild(resize);

    const startSlot = timeToSlot(ev.start);
    const endSlot = timeToSlot(ev.end);

    block.style.top = (startSlot * 30) + "px";
    block.style.height = ((endSlot - startSlot) * 30) + "px";

    enableDrag(block, ev, dateKey);
    enableResize(block, ev, dateKey);

    block.addEventListener("click", e => {
        e.stopPropagation();
        openEditModal(ev, dateKey);
    });

    col.appendChild(block);
}

// ============================================================
//   ドラッグ移動
// ============================================================
function enableDrag(block, ev, dateKey) {
    let startY = 0;
    let startTop = 0;
    let dragging = false;

    block.addEventListener("mousedown", e => {
        if (e.target.classList.contains("resize-handle")) return;

        startY = e.clientY;
        startTop = parseInt(block.style.top);
        dragging = false;

        const move = e2 => {
            const dy = e2.clientY - startY;
            if (Math.abs(dy) > 5) dragging = true;

            if (!dragging) return;

            let newTop = startTop + dy;
            newTop = Math.max(0, newTop);
            newTop = Math.round(newTop / 30) * 30;
            block.style.top = newTop + "px";
        };

        const up = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);

            if (!dragging) {
                openEditModal(ev, dateKey);
                return;
            }

            const finalTop = parseInt(block.style.top);
            const startSlot = finalTop / 30;
            const duration = parseInt(block.style.height) / 30;

            ev.start = slotToTime(startSlot);
            ev.end = slotToTime(startSlot + duration);

            saveMovedEvent(ev, dateKey);
            render();   // ← ★ 全ビュー更新
        };

        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    });
}

// ============================================================
//   リサイズ
// ============================================================
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
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);

            const h = parseInt(block.style.height);
            const startSlot = timeToSlot(ev.start);
            ev.end = slotToTime(startSlot + h / 30);

            saveMovedEvent(ev, dateKey);
            render(); // ← ★ 全ビュー更新
        };

        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    });
}

// ============================================================
//   更新保存
// ============================================================
function saveMovedEvent(ev, dateKey) {
    const events = loadEvents();
    const list = events[dateKey] || [];
    const idx = list.findIndex(x => x.id === ev.id);
    if (idx >= 0) list[idx] = ev;
    events[dateKey] = list;
    saveEvents(events);
}

// ============================================================
//   空白クリック → 追加モーダル
// ============================================================
function enableColumnClick(col, dateKey) {
    col.addEventListener("click", e => {
        if (!e.target.classList.contains("grid-cell")) return;

        const slot = parseInt(e.target.dataset.slot);

        // ★ クリックした時間を正しく取得
        const start = slotToTime(slot);
        const end = slotToTime(slot + 2); // ← 1時間 (30分×2)

        openCreateModal(dateKey, start, end);
    });
}




// ============================================================
//   ドラッグ追加（範囲選択 → 編集モーダル）
// ============================================================
function enableColumnDrag(col, dateKey) {
    let dragStartSlot = null;
    let dragPreview = null;
    let isDragging = false;

    col.addEventListener("mousedown", e => {
        const cell = e.target.closest(".grid-cell");
        if (!cell) return;

        dragStartSlot = parseInt(cell.dataset.slot);

        if (isNaN(dragStartSlot)) return;

        isDragging = true;

        // プレビュー
        dragPreview = document.createElement("div");
        dragPreview.className = "event-block";
        dragPreview.style.opacity = "0.4";
        dragPreview.style.left = "6px";
        dragPreview.style.right = "6px";
        dragPreview.style.position = "absolute";
        dragPreview.style.pointerEvents = "none";
        col.appendChild(dragPreview);
    });

    col.addEventListener("mousemove", e => {
        if (!isDragging || !dragPreview) return;

        const cell = e.target.closest(".grid-cell");
        if (!cell) return;

        let currentSlot = parseInt(cell.dataset.slot);
        if (isNaN(currentSlot)) return;

        const s = Math.min(dragStartSlot, currentSlot);
        const e2 = Math.max(dragStartSlot, currentSlot) + 1;

        dragPreview.style.top = (s * 30) + "px";
        dragPreview.style.height = ((e2 - s) * 30) + "px";
    });

    document.addEventListener("mouseup", () => {
        if (!isDragging) return;
        isDragging = false;

        if (!dragPreview) return;

        const top = parseInt(dragPreview.style.top);
        const height = parseInt(dragPreview.style.height);

        dragPreview.remove();
        dragPreview = null;

        const startSlot = top / 30;
        const endSlot = startSlot + (height / 30);

        const start = slotToTime(startSlot);
        const end = slotToTime(endSlot);

        // 新規イベント
        const ev = {
            id: "ev" + Date.now(),
            title: "予定",
            note: "",
            start,
            end
        };

        const events = loadEvents();
        const list = events[dateKey] || [];
        list.push(ev);
        events[dateKey] = list;
        saveEvents(events);

        // 追加後すぐ編集モーダルを開く
        openEditModal(ev, dateKey);

        render();
    });
}


// ============================================================
//  モーダル関連（共通）
// ============================================================
const modal = document.getElementById("event-modal");
const inputTitle = document.getElementById("modal-input-title");
const inputNote = document.getElementById("modal-input-note");
const inputStart = document.getElementById("modal-input-start");
const inputEnd = document.getElementById("modal-input-end");
const modalSave = document.getElementById("modal-save");
const modalCancel = document.getElementById("modal-cancel");
const modalDelete = document.getElementById("modal-delete");
const modalTitle = document.getElementById("modal-title");

// タイムライン
const timelineHours = document.querySelector(".timeline-hours");
const timelineBar = document.querySelector(".timeline-bar");
const tRange = document.getElementById("timeline-range");
const tHandleStart = document.getElementById("timeline-handle-start");
const tHandleEnd = document.getElementById("timeline-handle-end");

// ============================================================
//  タイムライン生成
// ============================================================
function setupTimelineHours() {
    timelineHours.innerHTML = "";
    for (let i = 0; i < 24; i++) {
        const h = document.createElement("div");
        h.textContent = pad2(i) + ":00";
        timelineHours.appendChild(h);
    }
}
setupTimelineHours();

// タイムラインハンドル初期位置を強制
tHandleStart.style.top = "-12px";   // 00:00 の位置
tHandleEnd.style.top   = "18px";    // 00:30 の位置
tRange.style.top = "0px";
tRange.style.height = "30px";


// ============================================================
//  モーダル OPEN（新規作成）
// ============================================================
function openCreateModal(dateKey, start, end) {

    // ★ NaN 対策：不正ならデフォルト 09:00–10:00
    if (!start || start.includes("NaN")) start = "09:00";
    if (!end   || end.includes("NaN"))   end   = "10:00";

    state.editingEvent = null;
    state.editingDateKey = dateKey;

    modalTitle.textContent = "新しい予定";
    modalDelete.classList.add("hidden");

    inputTitle.value = "";
    inputNote.value = "";
    inputStart.value = start;
    inputEnd.value = end;

    syncTimelineFromInputs();
    modal.classList.remove("hidden");
}


// ============================================================
//  モーダル OPEN（編集）
// ============================================================
function openEditModal(ev, dateKey) {
    state.editingEvent = ev;
    state.editingDateKey = dateKey;

    modalTitle.textContent = "予定を編集";
    modalDelete.classList.remove("hidden");

    inputTitle.value = ev.title;
    inputNote.value = ev.note || "";
    inputStart.value = ev.start;
    inputEnd.value = ev.end;

    syncTimelineFromInputs();

    modal.classList.remove("hidden");
}

// ============================================================
//  モーダル CLOSE
// ============================================================
modalCancel.onclick = () => {
    modal.classList.add("hidden");
};
modal.addEventListener("click", e => {
    if (e.target === modal) modal.classList.add("hidden");
});

// ============================================================
//  入力 → タイムライン反映
// ============================================================
function syncTimelineFromInputs() {
    const startSlot = timeToSlot(inputStart.value);
    const endSlot = timeToSlot(inputEnd.value);

    const top = startSlot * 30;
    const height = (endSlot - startSlot) * 30;

    tRange.style.top = top + "px";
    tRange.style.height = height + "px";

    // ← ここ重要：初期位置を絶対に px で入れておく
    tHandleStart.style.top = (top - 12) + "px";
    tHandleEnd.style.top = (top + height - 12) + "px";
}


// ============================================================
//  タイムラインのハンドルドラッグ
// ============================================================
function enableTimelineHandle(handle, type) {
    let startY, origin;

    handle.addEventListener("mousedown", e => {
        startY = e.clientY;
        origin = parseInt(handle.style.top);

        const move = e2 => {
            let newTop = origin + (e2.clientY - startY);

            newTop = Math.max(-12, newTop);
            newTop = Math.min(720 - 12, newTop);

            let slot = Math.round((newTop + 12) / 30);
            slot = Math.max(0, Math.min(47, slot));

            const time = slotToTime(slot);

            if (type === "start") {
                // ★ startがendを超えないように制御
                if (slot >= timeToSlot(inputEnd.value)) return;
                inputStart.value = time;
            } else {
                // ★ endがstartを下回らないように制御
                if (slot <= timeToSlot(inputStart.value)) return;
                inputEnd.value = time;
            }

            syncTimelineFromInputs();
        };

        const up = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);
        };

        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    });
}





enableTimelineHandle(tHandleStart, "start");
enableTimelineHandle(tHandleEnd, "end");

// ============================================================
//  保存（新規 / 編集）
// ============================================================
modalSave.onclick = () => {
    const title = inputTitle.value.trim();
    const note = inputNote.value.trim();
    const start = inputStart.value;
    const end = inputEnd.value;
    const dateKey = state.editingDateKey;

    const events = loadEvents();
    const list = events[dateKey] || [];

    // -----------------------------------------
    // 編集モード（既存イベント）
    // -----------------------------------------
    if (state.editingEvent) {
        const ev = state.editingEvent;

        ev.title = title || ev.title || "予定";    // 空なら前の名前 or "予定"
        ev.note = note;
        ev.start = start;
        ev.end = end;

        const idx = list.findIndex(x => x.id === ev.id);
        if (idx >= 0) list[idx] = ev;
    }

    // -----------------------------------------
    // 新規作成モード
    // -----------------------------------------
    else {
        // タイトルが空なら自動命名（予定1 / 予定2 / …）
        let autoTitle = title;
        if (!autoTitle) {
            const count = list.length + 1;
            autoTitle = (count === 1) ? "予定" : `予定${count}`;
        }

        list.push({
            id: "ev" + Date.now(),
            title: autoTitle,
            note,
            start,
            end
        });
    }

    // 保存して閉じる
    events[dateKey] = list;
    saveEvents(events);

    modal.classList.add("hidden");
    render();
};

// ============================================================
//  削除
// ============================================================
modalDelete.onclick = () => {
    if (!state.editingEvent) return;

    const dateKey = state.editingDateKey;
    const events = loadEvents();
    let list = events[dateKey] || [];

    list = list.filter(ev => ev.id !== state.editingEvent.id);
    events[dateKey] = list;

    saveEvents(events);

    modal.classList.add("hidden");
    render();
};

// ============================================================
//  入力変更 → タイムラインへ反映
// ============================================================
inputStart.addEventListener("input", syncTimelineFromInputs);
inputEnd.addEventListener("input", syncTimelineFromInputs);
