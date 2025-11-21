// ==== Utility ====
const pad2 = n => (n < 10 ? "0" + n : "" + n);
const toYMD = d => d.toISOString().slice(0, 10);
const weekdayNames = ["日", "月", "火", "水", "木", "金", "土"];

function loadEvents() {
  return JSON.parse(localStorage.getItem("events") || "{}");
}
function saveEvents(events) {
  localStorage.setItem("events", JSON.stringify(events));
}

let state = { view: "month", focusDate: new Date() };

// ==== Format helpers ====
function formatMonth(d) {
  return d.getFullYear() + "年 " + (d.getMonth() + 1) + "月";
}
function startOfWeek(d) {
  const c = new Date(d);
  const day = c.getDay();
  c.setDate(c.getDate() - day);
  c.setHours(0, 0, 0, 0);
  return c;
}
function formatWeekRange(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return toYMD(s) + " ～ " + toYMD(e);
}

// ==== Main render ====
function render() {
  document.getElementById("current-label").textContent =
    state.view === "month"
      ? formatMonth(state.focusDate)
      : formatWeekRange(state.focusDate);

  const container = document.getElementById("content");
  container.innerHTML = "";

  if (state.view === "month") renderMonth(container);
  else renderWeek(container);
}

// ==== Month view ====
function renderMonth(container) {
  const monthView = document.createElement("div");
  monthView.className = "month-view";

  const dt = new Date(state.focusDate.getFullYear(), state.focusDate.getMonth(), 1);
  const startDay = dt.getDay();
  const daysInMonth = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();

  // Header（日〜土）
  const headerRow = document.createElement("div");
  headerRow.className = "month-header";
  weekdayNames.forEach(n => {
    const el = document.createElement("div");
    el.textContent = n;
    headerRow.appendChild(el);
  });
  monthView.appendChild(headerRow);

  const grid = document.createElement("div");
  grid.className = "month-grid";

  // 空白
  for (let i = 0; i < startDay; i++) {
    const c = document.createElement("div");
    c.className = "day-cell";
    grid.appendChild(c);
  }

  // 日付セル
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "day-cell";

    const num = document.createElement("div");
    num.className = "day-num";
    num.textContent = day;
    cell.appendChild(num);

    const d = new Date(state.focusDate.getFullYear(), state.focusDate.getMonth(), day);
    const key = toYMD(d);

    const events = loadEvents()[key] || [];
    const wrap = document.createElement("div");
    wrap.className = "day-events";

    events.slice(0, 3).forEach(ev => {
      const t = document.createElement("div");
      t.textContent = `${ev.title} (${ev.start}-${ev.end})`;
      wrap.appendChild(t);
    });

    cell.appendChild(wap);

    // 週表示へ
    cell.onclick = () => {
      state.view = "week";
      state.focusDate = new Date(d);
      render();
    };

    grid.appendChild(cell);
  }

  monthView.appendChild(grid);
  container.appendChild(monthView);
}

// ==== Week view（シンプル版） ====
function renderWeek(container) {
  const wrap = document.createElement("div");
  wrap.className = "week-wrap";

  const main = document.createElement("div");
  main.textContent = "（ここに週ビューの詳細を入れる予定）";
  main.style.padding = "20px";

  // controls
  const controls = document.createElement("div");
  controls.className = "week-controls";

  const prev = document.createElement("button");
  prev.textContent = "前の週";
  prev.onclick = () => {
    let d = startOfWeek(state.focusDate);
    d.setDate(d.getDate() - 7);
    state.focusDate = d;
    render();
  };

  const next = document.createElement("button");
  next.textContent = "次の週";
  next.onclick = () => {
    let d = startOfWeek(state.focusDate);
    d.setDate(d.getDate() + 7);
    state.focusDate = d;
    render();
  };

  const toMonth = document.createElement("button");
  toMonth.textContent = "月へ戻る";
  toMonth.onclick = () => {
    state.view = "month";
    render();
  };

  controls.appendChild(prev);
  controls.appendChild(next);
  controls.appendChild(toMonth);

  wrap.appendChild(controls);
  wrap.appendChild(main);

  container.appendChild(wrap);
}

// ==== Button bindings ====
document.getElementById("month-btn").onclick = () => {
  state.view = "month";
  render();
};
document.getElementById("week-btn").onclick = () => {
  state.view = "week";
  render();
};
document.getElementById("today-btn").onclick = () => {
  state.focusDate = new Date();
  render();
};

// ==== Start ====
render();
