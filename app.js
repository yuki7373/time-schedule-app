/* ==========================================================
   Google カレンダー風 スケジュール管理アプリ
   ・週表示（縦タイムライン、横曜日）
   ・30分刻みグリッド
   ・ドラッグ移動
   ・リサイズ（下端ドラッグ）
   ・月表示（Googleカレンダー風）
   ・今日表示
   ・localStorage 保存
   ========================================================== */

/* ---------- Utility ---------- */
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

function toTimeStr(min){
  const h = Math.floor(min / 60);
  const m = min % 60;
  return pad2(h) + ":" + pad2(m);
}

function timeToMin(t){
  const [h,m] = t.split(":").map(Number);
  return h * 60 + m;
}

/* ---------- Events ---------- */
function loadEvents(){
  return JSON.parse(localStorage.getItem("events") || "{}");
}
function saveEvents(data){
  localStorage.setItem("events", JSON.stringify(data));
}

let state = {
  view: "week",
  focusDate: new Date(),
  dragging: null,
  resizing: null
};

/* ---------- Date Helpers ---------- */
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

/* ==========================================================
   Active Button
   ========================================================== */
function setActiveButton(mode){
  document.getElementById("month-btn").classList.remove("primary");
  document.getElementById("week-btn").classList.remove("primary");
  document.getElementById("today-btn").classList.remove("primary");

  if(mode === "month") document.getElementById("month-btn").classList.add("primary");
  if(mode === "week") document.getElementById("week-btn").classList.add("primary");
  if(mode === "today") document.getElementById("today-btn").classList.add("primary");
}

/* ==========================================================
   Main render()
   ========================================================== */
function render(){
  setActiveButton(state.view);

  const label = document.getElementById("current-label");

  if(state.view === "week"){
    label.textContent = formatWeekRange(state.focusDate);
    renderWeek();
  } 
  else if(state.view === "month"){
    label.textContent = state.focusDate.getFullYear() + "年 " + (state.focusDate.getMonth()+1) + "月";
    renderMonth();
  }
  else if(state.view === "today"){
    label.textContent = toYMD(state.focusDate);
    renderToday();
  }
}

/* ==========================================================
   Button Events
   ========================================================== */
document.getElementById("month-btn").onclick = ()=>{
  state.view = "month";
  render();
};
document.getElementById("week-btn").onclick = ()=>{
  state.view = "week";
  render();
};
document.getElementById("today-btn").onclick = ()=>{
  state.focusDate = new Date();
  state.view = "today";
  render();
};

/* ==========================================================
   WEEK VIEW（Googleカレンダー風）
   ========================================================== */
function renderWeek(){
  const container = document.getElementById("content");
  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "week-view";

  /* --- controls --- */
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

  /* --- header（日〜土） --- */
  const days = document.createElement("div");
  days.className = "week-days";

  const weekStart = startOfWeek(state.focusDate);
  const WEEK = ["日","月","火","水","木","金","土"];

  days.appendChild(document.createElement("div"));

  for(let i=0;i<7;i++){
    const d = new Date(weekStart);
    d.setDate(d.getDate()+i);

    const cell = document.createElement("div");
    cell.textContent = `${WEEK[i]} ${d.getMonth()+1}/${d.getDate()}`;
    days.appendChild(cell);
  }

  wrap.appendChild(days);

  /* --- grid --- */
  const grid = document.createElement("div");
  grid.className = "week-grid";

  /* time column */
  const timeCol = document.createElement("div");
  timeCol.className = "time-col";

  for(let h=0;h<24;h++){
    const t = document.createElement("div");
    t.className = "time-cell";
    t.textContent = `${pad2(h)}:00`;
    timeCol.appendChild(t);
  }
  grid.appendChild(timeCol);

  const events = loadEvents();

  for(let i=0;i<7;i++){
    const d = new Date(weekStart);
    d.setDate(d.getDate()+i);
    const key = toYMD(d);

    const col = document.createElement("div");
    col.className = "day-col";
    col.dataset.date = key;

    for(let s=0;s<48;s++){
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      cell.dataset.slot = s;
      col.appendChild(cell);
    }

    if(events[key]){
      events[key].forEach(ev=>{
        placeEventBlock(col, ev, key);
      });
    }

    grid.appendChild(col);
  }

  wrap.appendChild(grid);
  container.appendChild(wrap);
}

/* ==========================================================
   イベントブロック生成
   ========================================================== */
function placeEventBlock(dayCol, ev, dateKey){
  const block = document.createElement("div");
  block.className = "event-block";
  block.textContent = ev.title;

  const startMin = timeToMin(ev.start);
  const endMin = timeToMin(ev.end);

  const top = (startMin / 30) * 40;
  const height = ((endMin - startMin) / 30) * 40;

  block.style.top = top + "px";
  block.style.height = height + "px";

  block.dataset.start = ev.start;
  block.dataset.end = ev.end;
  block.dataset.id = ev.id;
  block.dataset.date = dateKey;

  const handle = document.createElement("div");
  handle.className = "resize-handle";
  block.appendChild(handle);

  enableDrag(block);
  enableResize(block);

  dayCol.appendChild(block);
}

/* ==========================================================
   ドラッグ移動
   ========================================================== */
function enableDrag(block){
  let startY = 0;
  let origTop = 0;

  block.addEventListener("mousedown", e=>{
    if(e.target.classList.contains("resize-handle")) return;

    state.dragging = block;
    block.classList.add("event-dragging");

    startY = e.clientY;
    origTop = parseInt(block.style.top);

    document.addEventListener("mousemove", dragMove);
    document.addEventListener("mouseup", dragEnd);
  });

  function dragMove(e){
    if(!state.dragging) return;
    let newTop = origTop + (e.clientY - startY);

    newTop = Math.round(newTop / 40) * 40;
    if(newTop < 0) newTop = 0;

    block.style.top = newTop + "px";
  }

  function dragEnd(){
    if(!state.dragging) return;

    block.classList.remove("event-dragging");

    document.removeEventListener("mousemove", dragMove);
    document.removeEventListener("mouseup", dragEnd);

    const newTop = parseInt(block.style.top);
    const startSlot = newTop / 40;
    const newStartMin = startSlot * 30;

    const oldStartMin = timeToMin(block.dataset.start);
    const oldEndMin = timeToMin(block.dataset.end);
    const duration = oldEndMin - oldStartMin;

    const newEndMin = newStartMin + duration;

    const events = loadEvents();
    const list = events[block.dataset.date];

    const ev = list.find(e => e.id == block.dataset.id);
    ev.start = toTimeStr(newStartMin);
    ev.end = toTimeStr(newEndMin);

    saveEvents(events);

    state.dragging = null;
  }
}

/* ==========================================================
   リサイズ（下端ドラッグ）
   ========================================================== */
function enableResize(block){
  const handle = block.querySelector(".resize-handle");

  let startY = 0;
  let origHeight = 0;

  handle.addEventListener("mousedown", e=>{
    e.stopPropagation();

    state.resizing = block;

    startY = e.clientY;
    origHeight = parseInt(block.style.height);

    document.addEventListener("mousemove", resizeMove);
    document.addEventListener("mouseup", resizeEnd);
  });

  function resizeMove(e){
    if(!state.resizing) return;
    let h = origHeight + (e.clientY - startY);

    if(h < 20) h = 20;
    h = Math.round(h / 40) * 40;

    block.style.height = h + "px";
  }

  function resizeEnd(){
    if(!state.resizing) return;

    document.removeEventListener("mousemove", resizeMove);
    document.removeEventListener("mouseup", resizeEnd);

    const height = parseInt(block.style.height);
    const durationMin = (height / 40) * 30;

    const startMin = timeToMin(block.dataset.start);
    const newEndMin = startMin + durationMin;

    const events = loadEvents();
    const list = events[block.dataset.date];

    const ev = list.find(e => e.id == block.dataset.id);
    ev.end = toTimeStr(newEndMin);

    saveEvents(events);

    state.resizing = null;
  }
}

/* ==========================================================
   月表示
   ========================================================== */
function renderMonth(){
  const container = document.getElementById("content");
  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "month-view";

  const dt = new Date(state.focusDate.getFullYear(), state.focusDate.getMonth(), 1);
  const startDay = dt.getDay();
  const daysInMonth = new Date(dt.getFullYear(), dt.getMonth()+1,0).getDate();

  const header = document.createElement("div");
  header.className = "month-header";

  ["日","月","火","水","木","金","土"].forEach(w=>{
    const el = document.createElement("div");
    el.textContent = w;
    header.appendChild(el);
  });
  wrap.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "month-grid";

  for(let i=0;i<startDay;i++){
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

    const evWrap = document.createElement("div");
    evWrap.className = "day-events";

    if(events[key]){
      events[key].slice(0,3).forEach(ev=>{
        const tag = document.createElement("div");
        tag.className = "event-tag";
        tag.textContent = ev.title;
        evWrap.appendChild(tag);
      });
    }

    cell.appendChild(evWrap);

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
   今日表示（1日）
   ========================================================== */
function renderToday(){
  const container = document.getElementById("content");
  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "week-view";

  const key = toYMD(state.focusDate);
  const events = loadEvents()[key] || [];

  const header = document.createElement("div");
  header.className = "week-days";
  header.appendChild(document.createElement("div"));

  const d = state.focusDate;
  const WEEK = ["日","月","火","水","木","金","土"];
  const hd = document.createElement("div");
  hd.textContent = `${WEEK[d.getDay()]} ${d.getMonth()+1}/${d.getDate()}`;
  header.appendChild(hd);

  wrap.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "week-grid";

  const timeCol = document.createElement("div");
  timeCol.className = "time-col";

  for(let h=0;h<24;h++){
    const cell = document.createElement("div");
    cell.className = "time-cell";
    cell.textContent = pad2(h)+":00";
    timeCol.appendChild(cell);
  }
  grid.appendChild(timeCol);

  const dayCol = document.createElement("div");
  dayCol.className = "day-col";
  dayCol.dataset.date = key;

  for(let s=0;s<48;s++){
    const slot = document.createElement("div");
    slot.className = "grid-cell";
    slot.dataset.slot = s;
    dayCol.appendChild(slot);
  }

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
  const endMin = startMin + 30;

  const title = prompt("予定のタイトル:", "新しい予定");
  if(!title) return;

  const events = loadEvents();
  events[date] ??= [];
  events[date].push({
    id: Date.now(),
    title,
    start: toTimeStr(startMin),
    end: toTimeStr(endMin)
  });

  saveEvents(events);
  render();
});

/* ==========================================================
   初期表示
   ========================================================== */
render();
