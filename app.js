// Utility
const pad2=n=>n<10?"0"+n:""+n;
const toYMD=d=>d.toISOString().slice(0,10);
const weekday=["日","月","火","水","木","金","土"];

function load(){return JSON.parse(localStorage.getItem("events")||"{}");}
function save(x){localStorage.setItem("events",JSON.stringify(x));}

let state={view:"week",focus:new Date(),editing:null,dateKey:null};

// Render
function render(){
  document.getElementById("current-label").textContent=toYMD(state.focus);
  const c=document.getElementById("content");
  c.innerHTML="";
  if(state.view==="week") renderWeek(c);
  if(state.view==="today") renderToday(c);
  if(state.view==="month") renderMonth(c);
}

// Month simple
function renderMonth(c){
  const div=document.createElement("div");
  div.textContent="(簡易) 月表示 - 週表示を使ってね";
  c.appendChild(div);
}

// Week
function startOfWeek(d){d=new Date(d);d.setDate(d.getDate()-d.getDay());return d;}

function renderWeek(c){
  const wrap=document.createElement("div");wrap.className="week-view";
  const days=document.createElement("div");days.className="week-days";
  days.appendChild(document.createElement("div"));
  const s=startOfWeek(state.focus);
  for(let i=0;i<7;i++){
    const d=new Date(s);d.setDate(s.getDate()+i);
    const el=document.createElement("div");
    el.textContent=weekday[i]+" "+(d.getMonth()+1)+"/"+d.getDate();
    days.appendChild(el);
  }
  wrap.appendChild(days);

  const grid=document.createElement("div");grid.className="week-grid";

  // time
  const tc=document.createElement("div");tc.className="time-col";
  for(let h=0;h<24;h++){
    const t=document.createElement("div");t.className="time-cell";
    t.textContent=pad2(h)+":00";tc.appendChild(t);
  }
  grid.appendChild(tc);

  const evs=load();
  for(let i=0;i<7;i++){
    const d=new Date(s);d.setDate(s.getDate()+i);
    const key=toYMD(d);
    const col=document.createElement("div");col.className="day-col";col.dataset.date=key;

    for(let s2=0;s2<48;s2++){
      const cell=document.createElement("div");
      cell.className="grid-cell";
      cell.dataset.slot=s2;
      col.appendChild(cell);
    }

    (evs[key]||[]).forEach(ev=>placeEvent(col,ev,key));

    col.addEventListener("click",e=>{
      if(!e.target.classList.contains("grid-cell"))return;
      const slot=parseInt(e.target.dataset.slot);
      const start=slotToTime(slot);
      const end=slotToTime(slot+2);
      openCreate(key,start,end);
    });

    grid.appendChild(col);
  }

  wrap.appendChild(grid);
  c.appendChild(wrap);
}

// Today = 1 col reuse
function renderToday(c){
  const w=document.createElement("div");w.textContent="(簡易) 今日表示";c.appendChild(w);
}

// slot convert
function slotToTime(s){
  const m=s*30;const h=Math.floor(m/60);const mm=m%60;
  return pad2(h)+":"+pad2(mm);
}

function timeToSlot(t){
  if(!t||!t.includes(":")) return 0;
  const [h,m]=t.split(":").map(Number);
  return (h*60+m)/30;
}

// Place event
function placeEvent(col,ev,key){
  const b=document.createElement("div");
  b.className="event-block";
  b.dataset.id=ev.id;
  b.textContent=ev.title||"予定";

  const top=timeToSlot(ev.start)*30;
  const h=(timeToSlot(ev.end)-timeToSlot(ev.start))*30;
  b.style.top=top+"px";
  b.style.height=h+"px";

  b.onclick=e=>{
    e.stopPropagation();
    openEdit(ev,key);
  };

  // resize handle
  const rh=document.createElement("div");rh.className="resize-handle";b.appendChild(rh);

  rh.onmousedown=e=>{
    e.stopPropagation();
    const sy=e.clientY;const sh=parseInt(b.style.height);
    const move=e2=>{
      let h=sh+(e2.clientY-sy);
      h=Math.max(30,h);h=Math.round(h/30)*30;
      b.style.height=h+"px";
    };
    const up=()=>{document.removeEventListener("mousemove",move);document.removeEventListener("mouseup",up);
      const s=timeToSlot(ev.start);
      const e2=s+parseInt(b.style.height)/30;
      ev.end=slotToTime(e2);
      const E=load();const L=E[key]||[];
      const i=L.findIndex(x=>x.id===ev.id);if(i>=0)L[i]=ev;
      E[key]=L;save(E);
      render();
    };
    document.addEventListener("mousemove",move);
    document.addEventListener("mouseup",up);
  };

  col.appendChild(b);
}

// Modal refs
const modal=document.getElementById("event-modal");
const inputTitle=document.getElementById("modal-input-title");
const inputNote=document.getElementById("modal-input-note");
const inputStart=document.getElementById("modal-input-start");
const inputEnd=document.getElementById("modal-input-end");
const modalTitle=document.getElementById("modal-title");
const modalSave=document.getElementById("modal-save");
const modalCancel=document.getElementById("modal-cancel");
const modalDelete=document.getElementById("modal-delete");

// Timeline
const timelineHours=document.querySelector(".timeline-hours");
const tBar=document.querySelector(".timeline-bar");
const tRange=document.getElementById("timeline-range");
const hStart=document.getElementById("timeline-handle-start");
const hEnd=document.getElementById("timeline-handle-end");

(function setupHours(){
  for(let i=0;i<24;i++){
    const d=document.createElement("div");
    d.textContent=pad2(i)+":00";
    timelineHours.appendChild(d);
  }
})();

function syncTimeline(){
  const ss=timeToSlot(inputStart.value);
  const ee=timeToSlot(inputEnd.value);
  const top=ss*30;
  const h=(ee-ss)*30;
  tRange.style.top=top+"px";
  tRange.style.height=h+"px";
  hStart.style.top=(top-6)+"px";
  hEnd.style.top=(top+h-6)+"px";
}

function enableHandle(h,type){
  h.onmousedown=e=>{
    const sy=e.clientY;
    const oy=parseInt(h.style.top)||0;
    const move=e2=>{
      let ny=oy+(e2.clientY-sy);
      ny=Math.max(0,Math.min(ny,24*30));
      const slot=Math.round(ny/30);
      const time=slotToTime(slot);
      if(type==="start") inputStart.value=time;
      else inputEnd.value=time;
      syncTimeline();
    };
    const up=()=>{document.removeEventListener("mousemove",move);document.removeEventListener("mouseup",up);};
    document.addEventListener("mousemove",move);
    document.addEventListener("mouseup",up);
  };
}
enableHandle(hStart,"start");
enableHandle(hEnd,"end");

// Create/Edit modal
function openCreate(key,start,end){
  state.editing=null;
  state.dateKey=key;
  modalTitle.textContent="新規予定";
  modalDelete.style.display="none";
  inputTitle.value="";
  inputNote.value="";
  inputStart.value=start;
  inputEnd.value=end;
  syncTimeline();
  modal.classList.remove("hidden");
}

function openEdit(ev,key){
  state.editing=ev;
  state.dateKey=key;
  modalTitle.textContent="予定を編集";
  modalDelete.style.display="inline-block";
  inputTitle.value=ev.title;
  inputNote.value=ev.note||"";
  inputStart.value=ev.start;
  inputEnd.value=ev.end;
  syncTimeline();
  modal.classList.remove("hidden");
}

modalCancel.onclick=()=>modal.classList.add("hidden");
modal.onclick=e=>{if(e.target===modal)modal.classList.add("hidden");};

modalSave.onclick=()=>{
  const title=inputTitle.value.trim();
  const note=inputNote.value.trim();
  const start=inputStart.value;
  const end=inputEnd.value;
  const key=state.dateKey;
  const E=load();const L=E[key]||[];

  if(state.editing){
    const ev=state.editing;
    ev.title=title||"予定";
    ev.note=note;
    ev.start=start;
    ev.end=end;
    const i=L.findIndex(x=>x.id===ev.id);
    if(i>=0)L[i]=ev;
  }else{
    const count=L.length+1;
    const auto=title||("予定"+count);
    L.push({id:"ev"+Date.now(),title:auto,note,start,end});
  }
  E[key]=L;save(E);
  modal.classList.add("hidden");
  render();
};

modalDelete.onclick=()=>{
  if(!state.editing)return;
  const key=state.dateKey;
  const E=load();
  E[key]=(E[key]||[]).filter(x=>x.id!==state.editing.id);
  save(E);
  modal.classList.add("hidden");
  render();
};

// buttons
document.getElementById("month-btn").onclick=()=>{state.view="month";render();};
document.getElementById("week-btn").onclick=()=>{state.view="week";render();};
document.getElementById("today-btn").onclick=()=>{state.view="today";render();};

// init
render();
