import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Check, ChevronLeft, CircleDot, Compass, Heart, Moon, WifiOff, X } from "lucide-react";
import QiblaFinder from "../qibla/QiblaFinder";
import "./islamic-tools.css";

type Tool = "hub" | "qibla" | "ramadan" | "calendar" | "duas" | "hadith" | "tasbeeh" | "notifications";

const duas = [
  ["Morning remembrance", "SubhanAllahi wa bihamdihi, SubhanAllahil Azim.", "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ"],
  ["Before sleeping", "Bismika Allahumma amutu wa ahya.", "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا"],
  ["For forgiveness", "Rabbighfir li wa tub alayya, innaka antat-Tawwabur-Rahim.", "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ"],
  ["Ease and goodness", "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan.", "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً"],
];

const hadith = [
  ["Intentions", "Actions are judged by intentions.", "Sahih al-Bukhari 1; Sahih Muslim 1907"],
  ["Mercy", "The merciful are shown mercy by the Most Merciful.", "Jami` at-Tirmidhi 1924"],
  ["Good character", "The best of you are those best in character.", "Sahih al-Bukhari 3559"],
  ["Brotherhood", "None of you truly believes until he loves for his brother what he loves for himself.", "Sahih al-Bukhari 13; Sahih Muslim 45"],
];

function getHijriParts(date: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en-IN-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).formatToParts(date);
    return { day: parts.find(p => p.type === "day")?.value ?? "", month: parts.find(p => p.type === "month")?.value ?? "", year: parts.find(p => p.type === "year")?.value ?? "" };
  } catch { return { day: "", month: "", year: "" }; }
}

function IslamicCalendar() {
  const [offset, setOffset] = useState(0);
  const base = new Date();
  base.setDate(base.getDate() + offset * 30);
  const hijri = getHijriParts(base);
  const monthDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(base); d.setDate(d.getDate() + i);
    return { d, h: getHijriParts(d) };
  });
  return <div className="tool-page"><div className="tool-title"><button onClick={() => setOffset(v => v - 1)} aria-label="Previous month">‹</button><div><span>ISLAMIC CALENDAR</span><h2>{hijri.month} {hijri.year}</h2></div><button onClick={() => setOffset(v => v + 1)} aria-label="Next month">›</button></div><div className="calendar-grid">{monthDays.map(({ d, h }) => <div className="calendar-day" key={d.toISOString()}><strong>{h.day}</strong><span>{d.toLocaleDateString("en-IN", { weekday: "short" })}</span><small>{d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small></div>)}</div></div>;
}

function Ramadan() {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  return <div className="tool-page"><div className="tool-hero"><Moon /><div><span>RAMADAN PLANNER</span><h2>30-Day Fasting Calendar</h2><p>Use your local prayer timetable for the final fasting times.</p></div></div><div className="ramadan-table"><div className="ramadan-head"><b>Day</b><b>Sehri</b><b>Iftar</b><b>Status</b></div>{days.map(day => <div className="ramadan-row" key={day}><strong>{day}</strong><span>--:--</span><span>--:--</span><span>{day <= 1 ? "Today" : "Upcoming"}</span></div>)}</div></div>;
}

function Tasbeeh() {
  const [count, setCount] = useState(0);
  const [goal, setGoal] = useState(33);
  return <div className="tool-page centered-tool"><CircleDot size={38}/><span>TASBEEH</span><h2>{count}</h2><p>Goal: {goal}</p><button className="tasbeeh-button" onClick={() => setCount(v => v + 1)}>{count === goal ? "Completed ✓" : "Tap to count"}</button><div className="tasbeeh-actions"><button onClick={() => setCount(0)}>Reset</button><button onClick={() => setGoal(goal === 33 ? 99 : 33)}>Goal: {goal === 33 ? "99" : "33"}</button></div></div>;
}

function Notifications() {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("");
  const enable = async () => {
    if (!("Notification" in window)) { setStatus("Notifications are not supported in this browser."); return; }
    const permission = await Notification.requestPermission();
    const ok = permission === "granted";
    setEnabled(ok); setStatus(ok ? "Prayer notification permission enabled." : "Permission was not granted.");
    if (ok) new Notification("Muslim Guide", { body: "Prayer reminders are enabled. Native background scheduling will be added with Android packaging." });
  };
  return <div className="tool-page"><div className="tool-hero"><Bell /><div><span>NOTIFICATIONS</span><h2>Prayer Reminders</h2><p>Browser permission foundation is ready. Android background scheduling will use native notifications.</p></div></div><button className="primary-tool-button" onClick={enable}>{enabled ? <><Check size={18}/> Enabled</> : "Enable notifications"}</button>{status && <div className="tool-note">{status}</div>}</div>;
}

export default function IslamicToolsOverlay() {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<Tool>("hub");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => { const on = () => setOffline(false), off = () => setOffline(true); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);
  useEffect(() => { if (open && !coords && navigator.geolocation) navigator.geolocation.getCurrentPosition(p => setCoords({ latitude: p.coords.latitude, longitude: p.coords.longitude }), () => undefined, { enableHighAccuracy: true, timeout: 7000 }); }, [open, coords]);

  const today = useMemo(() => { const d = new Date(); return `${d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · ${getHijriParts(d).day} ${getHijriParts(d).month} ${getHijriParts(d).year}`; }, []);
  if (!open) return <button className="islamic-fab" onClick={() => setOpen(true)} aria-label="Open Islamic tools"><Compass size={20}/><span>Tools</span></button>;

  const go = (next: Tool) => setTool(next);
  const back = () => setTool("hub");
  return <div className="islamic-overlay"><div className="islamic-panel"><header><div><span>MUSLIM GUIDE</span><h1>{tool === "hub" ? "Islamic Tools" : ({ qibla: "Qibla Finder", ramadan: "Ramadan", calendar: "Islamic Calendar", duas: "Duas & Azkar", hadith: "Hadith", tasbeeh: "Tasbeeh", notifications: "Notifications" } as Record<string,string>)[tool]}</h1></div><button onClick={() => setOpen(false)}><X/></button></header>{offline && <div className="offline-banner"><WifiOff size={16}/> Offline mode: saved app data remains available where cached.</div>}{tool === "hub" && <><p className="tool-date">{today}</p><div className="tool-cards">{[["qibla","Qibla","Live compass & direction",Compass],["ramadan","Ramadan","30-day fasting planner",Moon],["calendar","Islamic Calendar","Hijri dates",CalendarDays],["duas","Duas & Azkar","Daily supplications",Heart],["hadith","Hadith","Selected authentic narrations",BookOpenIcon],["tasbeeh","Tasbeeh","Digital counter",CircleDot],["notifications","Notifications","Prayer reminder permission",Bell]].map(([id,title,sub,Icon]) => { const C = Icon as any; return <button className="tool-card" key={id as string} onClick={() => go(id as Tool)}><C size={22}/><div><strong>{title as string}</strong><span>{sub as string}</span></div><b>›</b></button>; })}</div></>}{tool !== "hub" && <><button className="back-tool" onClick={back}><ChevronLeft size={18}/> All tools</button>{tool === "qibla" && (coords ? <QiblaFinder latitude={coords.latitude} longitude={coords.longitude}/> : <div className="tool-note">Location permission is needed for Qibla direction.</div>)}{tool === "ramadan" && <Ramadan/>}{tool === "calendar" && <IslamicCalendar/>}{tool === "tasbeeh" && <Tasbeeh/>}{tool === "notifications" && <Notifications/>}{tool === "duas" && <div className="tool-page">{duas.map(([title,en,ar]) => <article className="content-card" key={title}><span>{title}</span><p className="arabic-tool">{ar}</p><p>{en}</p></article>)}</div>}{tool === "hadith" && <div className="tool-page">{hadith.map(([title,text,ref]) => <article className="content-card" key={title}><span>{title}</span><p>{text}</p><small>{ref}</small></article>)}</div>}</>}</div></div>;
}

function BookOpenIcon(props: any) { return <span {...props} style={{ fontSize: 22 }}>📖</span>; }
