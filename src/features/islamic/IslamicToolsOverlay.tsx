import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Check, ChevronLeft, CircleDot, Compass, Heart, Moon, Settings, WifiOff, X } from "lucide-react";
import QiblaFinder from "../qibla/QiblaFinder";
import HadithExplorer from "./HadithExplorer";
import DuasExplorer from "./DuasExplorer";
import { formatTime, hijri, prayerTimesForDate, findRamadanStart, PRAYERS, type PrayerKey } from "./islamicCalculations";
import "./islamic-tools.css";

type Tool="hub"|"qibla"|"ramadan"|"calendar"|"duas"|"hadith"|"tasbeeh"|"notifications"|"settings";

function addDays(date:Date, days:number){const d=new Date(date);d.setDate(d.getDate()+days);return d;}

function IslamicCalendar(){
  const [offset,setOffset]=useState(0);
  const [anchor,setAnchor]=useState(()=>{const d=new Date();d.setHours(12,0,0,0);return d;});
  const current=useMemo(()=>{let d=new Date(anchor);const target=hijri(d);const first=new Date(d);first.setDate(d.getDate()-(target.day-1));return addDays(first,offset*29);},[anchor,offset]);
  const h0=hijri(current);
  const days=useMemo(()=>{const out=[];for(let i=0;i<30;i++){const d=addDays(current,i);const h=hijri(d);if(i>0&&h.month!==h0.month)break;out.push(d);}return out;},[current,h0.month]);
  const firstDay=days[0].getDay();
  const monthName=new Intl.DateTimeFormat("en-IN-u-ca-islamic-umalqura",{month:"long",year:"numeric"}).format(current);
  return <div className="tool-page"><div className="tool-title"><button onClick={()=>setOffset(v=>v-1)}>‹</button><div><span>ISLAMIC CALENDAR</span><h2>{monthName}</h2></div><button onClick={()=>setOffset(v=>v+1)}>›</button></div><div className="calendar-weekdays">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=><b key={x}>{x}</b>)}</div><div className="calendar-grid">{Array.from({length:firstDay},(_,i)=><div key={`e${i}`} className="calendar-empty"/>)}{days.map((d,i)=>{const h=hijri(d);const today=new Date();const isToday=d.toDateString()===today.toDateString();return <div className={`calendar-day ${isToday?"is-today":""}`} key={d.toISOString()}><strong>{h.day}</strong><span>{d.toLocaleDateString("en-IN",{weekday:"short"})}</span><small>{d.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</small></div>})}</div><div className="tool-note">Hijri dates use the device's Umm al-Qura calendar conversion. Local moon-sighting can differ by a day.</div></div>
}

function Ramadan({coords}:{coords:{latitude:number;longitude:number}|null}){
  const start=useMemo(()=>findRamadanStart(new Date()),[]);
  const rows=useMemo(()=>{if(!start||!coords)return [];return Array.from({length:30},(_,i)=>{const d=addDays(start,i);const t=prayerTimesForDate(coords.latitude,coords.longitude,d);return {i,d,fajr:t.fajr,maghrib:t.maghrib,h:hijri(d)};});},[start,coords]);
  return <div className="tool-page"><div className="tool-hero"><Moon/><div><span>RAMADAN PLANNER</span><h2>30-Day Fasting Calendar</h2><p>Sehri ends at Fajr · Iftar at Maghrib.</p></div></div>{!coords&&<div className="tool-note">Allow location to calculate local Sehri and Iftar times.</div>}<div className="ramadan-table"><div className="ramadan-row ramadan-head"><strong>Day</strong><span>Sehri end</span><span>Iftar</span><span>Date</span></div>{rows.map(r=><div className="ramadan-row" key={r.i}><strong>{r.i+1}</strong><span>{formatTime(r.fajr)}</span><span>{formatTime(r.maghrib)}</span><span>{r.d.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span></div>)}</div>{start&&<div className="tool-note">Ramadan dates are based on the device's Umm al-Qura conversion. Local moon-sighting/mosque announcements can differ by a day, so verify before fasting.</div>}</div>
}

function Tasbeeh(){const[c,setC]=useState(()=>Number(localStorage.getItem("mg-tasbeeh")||0));const[g,setG]=useState(()=>Number(localStorage.getItem("mg-tasbeeh-goal")||33));const count=()=>setC(v=>{const n=v+1;localStorage.setItem("mg-tasbeeh",String(n));return n});return <div className="tool-page centered-tool"><CircleDot size={38}/><span>TASBEEH</span><h2>{c}</h2><p>Goal: {g}</p><button className="tasbeeh-button" onClick={count}>{c>=g?"Completed ✓":"Tap to count"}</button><div className="tasbeeh-actions"><button onClick={()=>{setC(0);localStorage.setItem("mg-tasbeeh","0")}}>Reset</button><button onClick={()=>{const n=g===33?99:33;setG(n);localStorage.setItem("mg-tasbeeh-goal",String(n))}}>Goal: {g===33?99:33}</button></div></div>}

function Notifications({coords}:{coords:{latitude:number;longitude:number}|null}){
 const [enabled,setEnabled]=useState(()=>localStorage.getItem("mg-notifications")==="1");
 const [status,setStatus]=useState("");
 const [lead,setLead]=useState(()=>Number(localStorage.getItem("mg-notification-lead")||0));
 const [selected,setSelected]=useState<Record<string,boolean>>(()=>JSON.parse(localStorage.getItem("mg-notification-prayers")||'{"fajr":true,"dhuhr":true,"asr":true,"maghrib":true,"isha":true}'));
 const schedule=async()=>{
   if(!coords){setStatus("Location is required to calculate prayer times.");return;}
   try{
    const {LocalNotifications:L}=await import("@capacitor/local-notifications");
    const perm=await L.requestPermissions();
    if(perm.display!=="granted"){setStatus("Notification permission was not granted.");return;}
    const notifications=[] as any[];
    const now=new Date();
    for(let day=0;day<30;day++){
      const d=addDays(now,day);
      const t=prayerTimesForDate(coords.latitude,coords.longitude,d);
      PRAYERS.forEach((p,prayerIndex)=>{
        if(!selected[p.key])return;
        const at=new Date(t[p.key as PrayerKey]);
        at.setMinutes(at.getMinutes()-lead);
        if(at.getTime()<=Date.now())return;
        notifications.push({id:7000+day*10+prayerIndex,title:`${p.name} Prayer`,body:lead?`${p.name} prayer is in ${lead} minutes.`:`It's time for ${p.name} prayer.`,schedule:{at}});
      });
    }
    const oldIds=Array.from({length:30},(_,day)=>PRAYERS.map((_,i)=>({id:7000+day*10+i}))).flat();
    await L.cancel({notifications:oldIds});
    if(notifications.length)await L.schedule({notifications});
    setEnabled(true);localStorage.setItem("mg-notifications","1");localStorage.setItem("mg-notification-scheduled-at",new Date().toISOString());setStatus(`Scheduled ${notifications.length} prayer reminders for the next 30 days.`);
   }catch{if("Notification"in window){const p=await Notification.requestPermission();setStatus(p==="granted"?"Browser permission enabled. For background reminders, use the Android app.":"Permission was not granted.");}else setStatus("Open the Android app to use native reminders.");}
 };
 const toggle=(key:string)=>setSelected(x=>{const n={...x,[key]:!x[key]};localStorage.setItem("mg-notification-prayers",JSON.stringify(n));return n});
 return <div className="tool-page"><div className="tool-hero"><Bell/><div><span>NOTIFICATIONS</span><h2>Prayer Reminders</h2><p>Prayer times are calculated separately for each upcoming day.</p></div></div>{PRAYERS.map(x=><label className="settings-field" key={x.key}><span><input type="checkbox" checked={!!selected[x.key]} onChange={()=>toggle(x.key)}/> {x.name}</span></label>)}<label className="settings-field"><span>Remind me before</span><select value={lead} onChange={e=>{const n=Number(e.target.value);setLead(n);localStorage.setItem("mg-notification-lead",String(n))}}><option value={0}>At prayer time</option><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option></select></label><button className="primary-tool-button" onClick={schedule}>{enabled?<><Check size={18}/> Schedule / Update reminders</>:"Enable & schedule reminders"}</button>{status&&<div className="tool-note">{status}</div>}</div>
}

function SettingsTool(){const [method,setMethod]=useState(()=>localStorage.getItem("mg-calculation-method")||"Karachi / South Asia");const [madhab,setMadhab]=useState(()=>localStorage.getItem("mg-madhab")||"Hanafi");return <div className="tool-page"><div className="tool-hero"><Settings/><div><span>SETTINGS</span><h2>Prayer & App Preferences</h2><p>Preferences are saved on this device.</p></div></div><label className="settings-field"><span>Prayer calculation method</span><select value={method} onChange={e=>{setMethod(e.target.value);localStorage.setItem("mg-calculation-method",e.target.value)}}><option>Karachi / South Asia</option><option>Muslim World League</option><option>Egyptian</option><option>Umm Al-Qura</option><option>North America</option><option>Moonsighting Committee</option></select></label><label className="settings-field"><span>Asr madhab</span><select value={madhab} onChange={e=>{setMadhab(e.target.value);localStorage.setItem("mg-madhab",e.target.value)}}><option>Hanafi</option><option>Shafi</option></select></label><button className="primary-tool-button" onClick={()=>location.reload()}>Apply & refresh prayer calculations</button><div className="tool-note">For fasting and prayer decisions, local mosque settings and qualified scholars should take precedence where methods differ.</div></div>}

export default function IslamicToolsOverlay(){const[open,setOpen]=useState(false);const[tool,setTool]=useState<Tool>("hub");const[coords,setCoords]=useState<{latitude:number;longitude:number}|null>(null);const[offline,setOffline]=useState(!navigator.onLine);useEffect(()=>{const a=()=>setOffline(false),b=()=>setOffline(true);addEventListener("online",a);addEventListener("offline",b);return()=>{removeEventListener("online",a);removeEventListener("offline",b)}},[]);useEffect(()=>{if(open&&!coords&&navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>setCoords({latitude:p.coords.latitude,longitude:p.coords.longitude}),()=>undefined,{enableHighAccuracy:true,timeout:7000})},[open,coords]);const today=useMemo(()=>{const d=new Date(),h=hijri(d);return`${d.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})} · ${h.day} ${h.month} ${h.year}`},[]);if(!open)return <button className="islamic-fab" onClick={()=>setOpen(true)} aria-label="Open Islamic tools"><Compass size={20}/><span>Tools</span></button>;const titles:Record<string,string>={qibla:"Qibla Finder",ramadan:"Ramadan",calendar:"Islamic Calendar",duas:"Duas & Azkar",hadith:"Hadith",tasbeeh:"Tasbeeh",notifications:"Notifications",settings:"Settings"};const cards:any[]=[["qibla","Qibla","Live compass & direction",Compass],["ramadan","Ramadan","30-day fasting planner",Moon],["calendar","Islamic Calendar","Hijri dates & events",CalendarDays],["duas","Duas & Azkar","Authentic references",Heart],["hadith","Hadith","Six major collections",BookOpenIcon],["tasbeeh","Tasbeeh","Digital counter",CircleDot],["notifications","Notifications","Daily prayer reminders",Bell],["settings","Settings","Prayer preferences",Settings]];return <div className="islamic-overlay"><div className="islamic-panel"><header><div><span>MUSLIM GUIDE</span><h1>{tool==="hub"?"Islamic Tools":titles[tool]}</h1></div><button onClick={()=>setOpen(false)}><X/></button></header>{offline&&<div className="offline-banner"><WifiOff size={16}/> Offline mode: saved app data remains available where cached.</div>}{tool==="hub"?<><p className="tool-date">{today}</p><div className="tool-cards">{cards.map(([id,title,sub,Icon])=>{const C=Icon as any;return <button className="tool-card" key={id} onClick={()=>setTool(id)}><C size={22}/><div><strong>{title}</strong><span>{sub}</span></div><b>›</b></button>})}</div></>:<><button className="back-tool" onClick={()=>setTool("hub")}><ChevronLeft size={18}/> All tools</button>{tool==="qibla"&&(coords?<QiblaFinder latitude={coords.latitude} longitude={coords.longitude}/>:<div className="tool-note">Location permission is needed for Qibla direction.</div>)}{tool==="ramadan"&&<Ramadan coords={coords}/>} {tool==="calendar"&&<IslamicCalendar/>}{tool==="duas"&&<DuasExplorer/>}{tool==="hadith"&&<HadithExplorer/>}{tool==="tasbeeh"&&<Tasbeeh/>}{tool==="notifications"&&<Notifications coords={coords}/>} {tool==="settings"&&<SettingsTool/>}</>}</div></div>}
function BookOpenIcon(props:any){return <span {...props} style={{fontSize:22}}>📖</span>}
