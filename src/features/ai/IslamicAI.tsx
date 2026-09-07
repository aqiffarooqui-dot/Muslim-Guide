import React, { useMemo, useState } from "react";
import quranEnglishRaw from "../../data/quran-en-saheeh.txt?raw";
import quranHindiRaw from "../../data/quran-hi-farooq-nadwi.txt?raw";
import quranUrduRaw from "../../data/quran-ur-jalandhry.txt?raw";

type Lang = "English" | "Hindi" | "Urdu";
type Result = { ref: string; text: string };

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0900-\u097f\u0600-\u06ff\s:.-]/gi, " ").replace(/\s+/g, " ").trim();
const parse = (raw: string): Result[] => raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean).map((line, i) => {
  const m = line.match(/^(\d+)[|:\t](\d+)[|:\t](.*)$/);
  return m ? { ref: `Qur'an ${m[1]}:${m[2]}`, text: m[3].trim() } : { ref: `Qur'an passage ${i + 1}`, text: line };
});

const topics: Record<string, string[]> = {
  prayer: ["prayer", "salah", "namaz", "pray", "salat"],
  patience: ["patience", "patient", "sabr", "hardship", "difficult"],
  forgiveness: ["forgive", "forgiveness", "repent", "mercy", "tawbah"],
  charity: ["charity", "charitable", "zakat", "sadaqah", "spend"],
  parents: ["parents", "mother", "father", "parent"],
  marriage: ["marriage", "marry", "husband", "wife", "spouse"],
  anxiety: ["anxiety", "worry", "fear", "sad", "stress", "heart"],
  fasting: ["fast", "fasting", "ramadan", "ramadhan"],
};

function answerFor(q: string, lang: Lang): { intro: string; results: Result[] } {
  const nq = normalize(q);
  const keys = Object.entries(topics).filter(([, words]) => words.some(w => nq.includes(w))).map(([k]) => k);
  const queryWords = nq.split(" ").filter(w => w.length > 2);
  const raw = lang === "Hindi" ? quranHindiRaw : lang === "Urdu" ? quranUrduRaw : quranEnglishRaw;
  const all = parse(raw);
  const scored = all.map(r => {
    const t = normalize(r.text); let score = 0;
    keys.forEach(k => topics[k].forEach(w => { if (t.includes(normalize(w))) score += 4; }));
    queryWords.forEach(w => { if (t.includes(w)) score += 1; });
    return { r, score };
  }).filter(x => x.score > 0).sort((a,b) => b.score-a.score).slice(0,3).map(x => x.r);
  const fallback = all.filter(r => queryWords.some(w => normalize(r.text).includes(w))).slice(0,3);
  const results = scored.length ? scored : fallback;
  const intro = results.length
    ? (lang === "Hindi" ? "Qur'an ke relevant passages mil gaye hain. Neeche source references ke saath dekhein."
      : lang === "Urdu" ? "Qur'an se muta'alliq passages mil gaye hain. Neeche source references dekhein."
      : "I found relevant Qur'an passages. Check the source references below.")
    : (lang === "Hindi" ? "Is sawal ke liye local Qur'an index mein clear matching passage nahi mila. Sawal ko thoda different words mein try karein."
      : lang === "Urdu" ? "Is sawal ke liye local Qur'an index mein wazeh matching passage nahi mila. Sawal ko mukhtalif alfaaz mein try karein."
      : "I couldn't find a clear match in the local Qur'an index. Try asking with different words.");
  return { intro, results };
}

export default function IslamicAI() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("mg-ai-lang") as Lang) || "English");
  const [history, setHistory] = useState<{q:string; intro:string; results:Result[]}[]>(() => { try { return JSON.parse(localStorage.getItem("mg-ai-history") || "[]"); } catch { return []; } });
  const latest = history[0];
  const suggestions = useMemo(() => lang === "Hindi" ? ["Sabr ke baare mein Qur'an kya kehta hai?", "Namaz ki importance kya hai?", "Walidain ke huqooq kya hain?"] : lang === "Urdu" ? ["Sabr ke bare mein Qur'an kya kehta hai?", "Namaz ki ahmiyat kya hai?", "Walidain ke huqooq kya hain?"] : ["What does the Qur'an say about patience?", "Why is prayer important?", "What does the Qur'an say about parents?"] , [lang]);
  const ask = (text = q) => { const value = text.trim(); if (!value) return; const a = answerFor(value, lang); const next = [{ q:value, ...a }, ...history].slice(0,10); setHistory(next); setQ(""); localStorage.setItem("mg-ai-history", JSON.stringify(next)); };
  const changeLang = (v:Lang) => { setLang(v); localStorage.setItem("mg-ai-lang", v); };
  if (!open) return <button onClick={() => setOpen(true)} aria-label="Open Islamic AI" style={{position:"fixed",left:18,bottom:22,zIndex:1000,border:0,borderRadius:999,padding:"12px 16px",display:"flex",gap:8,alignItems:"center",fontWeight:800,background:"#111827",color:"white",boxShadow:"0 10px 30px rgba(0,0,0,.25)",cursor:"pointer"}}>✨ Islamic AI</button>;
  return <div style={{position:"fixed",inset:0,zIndex:1100,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <section style={{width:"min(760px,100%)",maxHeight:"92vh",overflow:"auto",background:"white",borderRadius:"24px 24px 0 0",padding:20,boxSizing:"border-box",fontFamily:"system-ui"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><div style={{fontSize:12,fontWeight:800,letterSpacing:1}}>MUSLIM GUIDE</div><h2 style={{margin:"4px 0"}}>Islamic AI Assistant</h2><small>Free • Qur'an-grounded • No API key required</small></div><button onClick={()=>setOpen(false)} style={{fontSize:24,border:0,background:"transparent",cursor:"pointer"}}>×</button></div>
      <div style={{display:"flex",gap:8,margin:"16px 0",flexWrap:"wrap"}}>{(["English","Hindi","Urdu"] as Lang[]).map(x=><button key={x} onClick={()=>changeLang(x)} style={{border:"1px solid #ddd",borderRadius:999,padding:"8px 12px",background:lang===x?"#111827":"white",color:lang===x?"white":"#111827"}}>{x}</button>)}</div>
      <div style={{display:"grid",gap:8}}>{suggestions.map(s=><button key={s} onClick={()=>ask(s)} style={{textAlign:"left",padding:12,border:"1px solid #e5e7eb",borderRadius:14,background:"#f9fafb"}}>{s}</button>)}</div>
      <div style={{display:"flex",gap:8,marginTop:14}}><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")ask()}} placeholder="Ask about Qur'an..." style={{flex:1,padding:13,border:"1px solid #d1d5db",borderRadius:14}}/><button onClick={()=>ask()} style={{padding:"0 18px",border:0,borderRadius:14,background:"#111827",color:"white",fontWeight:800}}>Ask</button></div>
      {latest&&<div style={{marginTop:18}}><div style={{fontWeight:800}}>Q: {latest.q}</div><p>{latest.intro}</p>{latest.results.map(r=><article key={r.ref} style={{padding:14,margin:"10px 0",borderRadius:16,background:"#f5f7fa"}}><div style={{fontWeight:800,fontSize:13}}>{r.ref}</div><div style={{marginTop:6,lineHeight:1.6}}>{r.text}</div></article>)}<div style={{fontSize:12,opacity:.7,marginTop:12}}>Reference mode only: this tool retrieves Qur'an passages and is not a fatwa service. For fiqh/legal questions, consult a qualified scholar.</div></div>}
    </section>
  </div>;
}
