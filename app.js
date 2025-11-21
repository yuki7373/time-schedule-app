// タイムスケジュール - 月間/週間カレンダー (localStorage 保存)
// events structure: { "YYYY-MM-DD": [{id, start:"09:00", end:"11:00", title}, ...], ... }


const pad2 = n => (n<10? '0'+n : ''+n);
const toYMD = d => d.toISOString().slice(0,10);
const weekdayNames = ['日','月','火','水','木','金','土'];


function loadEvents(){ return JSON.parse(localStorage.getItem('events') || '{}'); }
function saveEvents(events){ localStorage.setItem('events', JSON.stringify(events)); }


let state = { view:'month', focusDate: new Date() };


function render(){
document.getElementById('current-label').textContent = state.view === 'month' ? formatMonth(state.focusDate) : formatWeekRange(state.focusDate);
const container = document.getElementById('content'); container.innerHTML='';
if(state.view==='month') renderMonth(container); else renderWeek(container);
}


function formatMonth(d){ return d.getFullYear() + '年 ' + (d.getMonth()+1) + '月'; }
function startOfWeek(d){ const copy=new Date(d); const day = copy.getDay(); copy.setDate(copy.getDate()-day); copy.setHours(0,0,0,0); return copy; }
function formatWeekRange(d){ const s=startOfWeek(d); const e=new Date(s); e.setDate(s.getDate()+6); return toYMD(s)+' ～ '+toYMD(e); }


// Month view rendering
function renderMonth(container){
const monthView = document.createElement('div'); monthView.className='month-view';
const dt = new Date(state.focusDate.getFullYear(), state.focusDate.getMonth(),1);
const startDay = dt.getDay();
const daysInMonth = new Date(dt.getFullYear(), dt.getMonth()+1,0).getDate();


const headerRow = document.createElement('div'); headerRow.className='month-header';
weekdayNames.forEach(n=>{ const el=document.createElement('div'); el.textContent=n; headerRow.appendChild(el); });
monthView.appendChild(headerRow);


const grid = document.createElement('div'); grid.className='month-grid';
for(let i=0;i<startDay;i++){ const c=document.createElement('div'); c.className='day-cell'; grid.appendChild(c); }
for(let day=1; day<=daysInMonth; day++){
const cell = document.createElement('div'); cell.className='day-cell';
const num = document.createElement('div'); num.className='day-num'; num.textContent = day; cell.appendChild(num);
const d = new Date(state.focusDate.getFullYear(), state.focusDate.getMonth(), day);
const key = toYMD(d);
const events = (loadEvents()[key] || []);
const wrap = document.createElement('div'); wrap.className='day-events';
events.slice(0,3).forEach(ev=>{ const t=document.createElement('div'); t.textContent = ev.title + ' ('+ev.start+'-'+ev.end+')'; wrap.appendChild(t); });
cell.appendChild(wrap);
cell.onclick = ()=>{ state.view='week'; state.focusDate = new Date(d); render(); };
grid.appendChild(cell);
}
monthView.appendChild(grid); container.appendChild(monthView);
}


// Week view rendering and interactions
function renderWeek(container){
const wrap = document.createElement('div'); wrap.className='week-wrap';
const weekGrid = document.createElement('div'); weekGrid.className='week-grid';
const detail = document.createElement('div'); detail.className='day-detail';


// controls
const controls = document.createElement('div'); controls.className='week-controls';
const prev = document.createElement('button'); prev.textContent='前の週'; prev.onclick=()=>{ let d=startOfWeek(state.focusDate); d.setDate(d.getDate()-7); state.focusDate=d; render(); };
const next = document.createElement('button'); next.textContent='次の週'; next.onclick=()=>{ let d=startOfWeek(state.focusDate); d.setDate(d.getDate()+7); state.focusDate=d; render(); };
const toMonth = document.createElement('button'); toMonth.textContent='月へ戻る'; toMonth.onclick=()=>{ state.view='month'; render(); };
controls.appendChild(prev); controls.appendChild(next); controls.appendChild(toMonth);
