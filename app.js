/* ==========================================================
   Google カレンダー風タイムスケジュール
   週ビュー（ドラッグ移動・リサイズ可能）
   localStorage 保存
   30分刻みグリッド
   ========================================================== */

/* ---------- ユーティリティ ---------- */
const pad2 = n => (n < 10 ? "0" + n : "" + n);

function toYMD(d){
  return (
    d.getFullYear() +
    "-" +
    pad2(d.getMonth() + 1) +
    "-" +
    pad2(d.getDate())
  );
}

// 30分刻み → "HH:MM"
function toTimeStr(m){
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return pad2(h) + ":" + pad2(mm);
}

// 時刻 "HH:MM" → 分
function timeToMin(t){
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/* ---------- データ ---------- */
function loadEvents(){
  return JSON.parse(localStorage.getItem("events") || "{}");
}
function saveEvents(ev){
  localStorage.setItem("events", JSON.stringify(ev));
}

let state = {
  view: "week",
  focusDate: new Date(),
  dragging: null,     // 移動中のイベント
  resizing: null      // リサイズ中のイベント
};

/* ---------- 日付処理 ---------- */
function startOfWeek(d){
  const c = new Date(d);
  const diff = c.getDay();
  c.setDate(c.getDate() - diff);
  c.setHours(0,0,0,0);
  return c;
}

function formatWeekRange(d){
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return toYMD(s) + " ～ " + toYMD(e);
}

/* ---------- メインレンダリング ---------- */
function render(){
  const label = document.getElementById("current-label");

  if(state.view === "week"){
    label.textContent = formatWeekRange(state.focusDate);
    renderWeek();
  }
  else if(state.view === "month"){
    label.textContent =
      state.focusDate.getFullYear() +
      "年 " +
      (state.focusDate.getMonth() + 1) +
      "月";
    renderMonth();
  }
  else {
    label.textContent = toYMD(state.focusDate);
    renderToday();
  }
}

/* ---------- ボタン設定 ---------- */
document.getElementById("week-btn").onclick = ()=>{
  state.view = "week";
  render();
};
document.getElementById("month-btn").onclick = ()=>{
  state.view = "month";
  render();
};
document.getElementById("today-btn").onclick = ()=>{
  state.focusDate = new Date();
  state.view = "week";
  render();
};
/* ==========================================================
   WEEK VIEW（Google カレンダー風グリッド）
   横：日曜〜土曜
   縦：0:00〜24:00（30分刻み）
   ========================================================== */

function renderWeek(){
  const container = document.getElementById("content");
  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "week-view";

  /* ---------- 前の週 / 次の週 ボタン ---------- */
  const ctrl = document.createElement("div");
  ctrl.style.marginBottom = "10px";
  ctrl.innerHTML = `
    <button id="prev-week" class="btn">前の週</button>
    <button id="next-week" class="btn">次の週</button>
  `;
  wrap.appendChild(ctrl);

  document.getElementById("prev-week").onclick = ()=>{
    const d = startOfWeek(state.focusDate);
    d.setDate(d.getDate() - 7);
    state.focusDate = d;
    render();
  };
  document.getElementById("next-week").onclick = ()=>{
    const d = startOfWeek(state.focusDate);
    d.setDate(d.getDate() + 7);
    state.focusDate = d;
    render();
  };

  /* ---------- 日付ヘッダー（日〜土） ---------- */
  const daysHeader = document.createElement("div");
  daysHeader.className = "week-days";

  const weekday = ["日","月","火","水","木","金","土"];
  const weekStart = startOfWeek(state.focusDate);

  // 左端（時間軸用の空白）
  daysHeader.appendChild(document.createElement("div"));

  for(let i=0;i<7;i++){
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);

    const head = document.createElement("div");
    head.textContent = `${weekday[i]} ${d.getMonth()+1}/${d.getDate()}`;
    daysHeader.appendChild(head);
  }
  wrap.appendChild(daysHeader);

  /* ---------- 週グリッド本体 ---------- */
  const grid = document.createElement("div");
  grid.className = "week-grid";

  /* ===== 左：時間軸 ===== */
  const timeCol = document.createElement("div");
  timeCol.className = "time-col";

  // 0:00〜23:00（30分刻み）
  for(let h=0; h<24; h++){
    const cell = document.createElement("div");
    cell.className = "time-cell";
    cell.textContent = pad2(h) + ":00";
    timeCol.appendChild(cell);
  }
  grid.appendChild(timeCol);

  /* ===== 右：7日分の列 ===== */
  const events = loadEvents();

  for(let i=0;i<7;i++){
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const key = toYMD(date);

    const dayCol = document.createElement("div");
    dayCol.className = "day-col";
    dayCol.dataset.date = key;

    // 30分刻み → 24h × 2 = 48セル
    for(let s=0;s<48;s++){
      const slot = document.createElement("div");
      slot.className = "grid-cell";
      slot.dataset.slot = s; // 何番目の30分セルか
      dayCol.appendChild(slot);
    }

    // イベントブロック配置
    if(events[key]){
      events[key].forEach(ev=>{
        placeEventBlock(dayCol, ev, key);
      });
    }

    grid.appendChild(dayCol);
  }

  wrap.appendChild(grid);
  container.appendChild(wrap);
}
/* ==========================================================
   イベントブロック描画（Googleカレンダー風）
   ========================================================== */

function placeEventBlock(dayCol, ev, dateKey){
  const block = document.createElement("div");
  block.className = "event-block";
  block.textContent = ev.title || "予定";

  /* ----- ブロックの位置・高さを計算 ----- */
  const startM = timeToMin(ev.start);   // 分
  const endM   = timeToMin(ev.end);
  const top = (startM / 30) * 40;       // 30min = 40px（CSSでグリッド1セル40px）
  const height = ((endM - startM) / 30) * 40;

  block.style.top = top + "px";
  block.style.height = height + "px";

  /* ----- ドラッグ用データ ----- */
  block.dataset.start = ev.start;
  block.dataset.end = ev.end;
  block.dataset.id = ev.id;
  block.dataset.date = dateKey;

  /* ----- リサイズハンドル（下端） ----- */
  const resize = document.createElement("div");
  resize.className = "resize-handle";
  block.appendChild(resize);

  /* ----- ドラッグイベント登録 ----- */
  enableDrag(block);
  enableResize(block);

  dayCol.appendChild(block);
}
/* ==========================================================
   イベント移動（ドラッグで上下移動）
   イベントリサイズ（下端をドラッグ）
   ========================================================== */

/* ---------- イベント移動（ドラッグ） ---------- */
function enableDrag(block){
  let startY = 0;
  let origTop = 0;

  block.addEventListener("mousedown", e=>{
    if(e.target.classList.contains("resize-handle")) return; // リサイズ中は無効

    state.dragging = {
      block,
      date: block.dataset.date,
      id: block.dataset.id
    };

    block.classList.add("event-dragging");

    startY = e.clientY;
    origTop = parseInt(block.style.top);

    document.addEventListener("mousemove", dragMove);
    document.addEventListener("mouseup", dragEnd);
  });

  function dragMove(e){
    if(!state.dragging) return;

    const dy = e.clientY - startY;
    let newTop = origTop + dy;

    // 30分刻みにスナップ（グリッド1セル＝40px）
    newTop = Math.round(newTop / 40) * 40;
    if(newTop < 0) newTop = 0;

    block.style.top = newTop + "px";
  }

  function dragEnd(){
    if(!state.dragging) return;

    block.classList.remove("event-dragging");

    document.removeEventListener("mousemove", dragMove);
    document.removeEventListener("mouseup", dragEnd);

    /* --- 新しい start/end を計算 --- */
    const newTop = parseInt(block.style.top);
    const startSlot = newTop / 40;   // 30min slot index
    const newStartMin = startSlot * 30;

    const oldStartMin = timeToMin(block.dataset.start);
    const oldEndMin   = timeToMin(block.dataset.end);
    const duration = oldEndMin - oldStartMin;

    const newEndMin = newStartMin + duration;

    const newStartStr = toTimeStr(newStartMin);
    const newEndStr   = toTimeStr(newEndMin);

    /* --- 保存処理 --- */
    const events = loadEvents();
    const list = events[block.dataset.date];

    const ev = list.find(e => e.id == block.dataset.id);
    ev.start = newStartStr;
    ev.end   = newEndStr;

    saveEvents(events);

    state.dragging = null;
  }
}


/* ---------- イベントリサイズ（下端をドラッグ） ---------- */
function enableResize(block){
  const handle = block.querySelector(".resize-handle");

  let startY = 0;
  let origHeight = 0;

  handle.addEventListener("mousedown", e=>{
    e.stopPropagation(); // 移動ドラッグと区別

    state.resizing = {
      block,
      date: block.dataset.date,
      id: block.dataset.id
    };

    startY = e.clientY;
    origHeight = parseInt(block.style.height);

    document.addEventListener("mousemove", resizeMove);
    document.addEventListener("mouseup", resizeEnd);
  });

  function resizeMove(e){
    if(!state.resizing) return;

    let dh = e.clientY - startY;
    let newHeight = origHeight + dh;

    // マイナスにならない
    if(newHeight < 20) newHeight = 20;

    // 30分刻み（40px）にスナップ
    newHeight = Math.round(newHeight / 40) * 40;

    block.style.height = newHeight + "px";
  }

  function resizeEnd(){
    if(!state.resizing) return;

    document.removeEventListener("mousemove", resizeMove);
    document.removeEventListener("mouseup", resizeEnd);

    /* --- 新しい end を計算 --- */
    const height = parseInt(block.style.height);
    const durationMin = (height / 40) * 30;

    const startMin = timeToMin(block.dataset.start);
    const newEndMin = startMin + durationMin;

    const newEndStr = toTimeStr(newEndMin);

    /* --- 保存 --- */
    const events = loadEvents();
    const list = events[block.dataset.date];

    const ev = list.find(e => e.id == block.dataset.id);
    ev.end = newEndStr;

    saveEvents(events);

    state.resizing = null;
  }
}
/* ==========================================================
   月表示（シンプルなカレンダー）
   ========================================================== */
function renderMonth(){
  const container = document.getElementById("content");
  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "month-view";

  const dt = new Date(state.focusDate.getFullYear(), state.focusDate.getMonth(), 1);
  const startDay = dt.getDay();
  const daysInMonth = new Date(dt.getFullYear(), dt.getMonth()+1, 0).getDate();

  /* ---- ヘッダー（日〜土） ---- */
  const header = document.createElement("div");
  header.className = "month-header";

  ["日","月","火","水","木","金","土"].forEach(w=>{
    const el = document.createElement("div");
    el.textContent = w;
    header.appendChild(el);
  });

  wrap.appendChild(header);

  /* ---- グリッド本体 ---- */
  const grid = document.createElement("div");
  grid.className = "month-grid";

  // 空白
  for(let i=0; i<startDay; i++){
    const empty = document.createElement("div");
    empty.className = "day-cell";
    grid.appendChild(empty);
  }

  const events = loadEvents();

  for(let day=1; day<=daysInMonth; day++){
    const cell = document.createElement("div");
    cell.className = "day-cell";

    const num = document.createElement("div");
    num.className = "day-num";
    num.textContent = day;
    cell.appendChild(num);

    const d = new Date(state.focusDate.getFullYear(), state.focusDate.getMonth(), day);
    const key = toYMD(d);

    const list = events[key] || [];

    const evWrap = document.createElement("div");
    evWrap.className = "day-events";

    // 予定を3件抜粋表示
    list.slice(0,3).forEach(ev=>{
      const evDiv = document.createElement("div");
      evDiv.textContent = ev.title + " (" + ev.start + ")";
      evWrap.appendChild(evDiv);
    });

    cell.appendChild(evWrap);

    // クリック → 週表示へ
    cell.onclick = ()=>{
      state.view = "week";
      state.focusDate = d;
      render();
    };

    grid.appendChild(cell);
  }

  wrap.appendChild(grid);
  container.appendChild(wrap);
}


/* ==========================================================
   今日表示（1日だけの時間軸表示）
   ========================================================== */
function renderToday(){
  const container = document.getElementById("content");
  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "week-view";

  const key = toYMD(state.focusDate);
  const events = loadEvents()[key] || [];

  /* ---- ヘッダー ---- */
  const head = document.createElement("div");
  head.className = "week-days";

  // 時間軸の空白
  head.appendChild(document.createElement("div"));

  const d = state.focusDate;
  const weekday = ["日","月","火","水","木","金","土"][d.getDay()];
  const hd = document.createElement("div");
  hd.textContent = `${weekday} ${d.getMonth()+1}/${d.getDate()}`;
  head.appendChild(hd);

  wrap.appendChild(head);

  /* ---- グリッド ---- */
  const grid = document.createElement("div");
  grid.className = "week-grid";

  // 左：時間軸
  const timeCol = document.createElement("div");
  timeCol.className = "time-col";

  for(let h=0; h<24; h++){
    const cell = document.createElement("div");
    cell.className = "time-cell";
    cell.textContent = pad2(h) + ":00";
    timeCol.appendChild(cell);
  }
  grid.appendChild(timeCol);

  // 右：1日分
  const dayCol = document.createElement("div");
  dayCol.className = "day-col";
  dayCol.dataset.date = key;

  for(let s=0;s<48;s++){
    const slot = document.createElement("div");
    slot.className = "grid-cell";
    slot.dataset.slot = s;
    dayCol.appendChild(slot);
  }

  // イベント
  events.forEach(ev=>{
    placeEventBlock(dayCol, ev, key);
  });

  grid.appendChild(dayCol);
  wrap.appendChild(grid);

  container.appendChild(wrap);
}


/* ==========================================================
   新規予定追加（ダブルクリック）
   ========================================================== */

document.addEventListener("dblclick", e=>{
  if(!e.target.classList.contains("grid-cell")) return;

  const dayCol = e.target.parentElement;
  const date = dayCol.dataset.date;
  if(!date) return;

  const slotIndex = parseInt(e.target.dataset.slot);

  const startMin = slotIndex * 30;
  const endMin   = startMin + 30;

  const startStr = toTimeStr(startMin);
  const endStr   = toTimeStr(endMin);

  const title = prompt("予定のタイトルを入力", "新しい予定");
  if(!title) return;

  const events = loadEvents();
  events[date] ??= [];

  const newEvent = {
    id: Date.now(),
    title,
    start: startStr,
    end: endStr
  };

  events[date].push(newEvent);
  saveEvents(events);

  render();
});


/* ==========================================================
   初期表示
   ========================================================== */
render();
