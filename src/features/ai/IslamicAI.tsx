import React, { useMemo, useState } from "react";
import quranEnglishRaw from "../../data/quran-en-saheeh.txt?raw";
import quranHindiRaw from "../../data/quran-hi-farooq-nadwi.txt?raw";
import quranUrduRaw from "../../data/quran-ur-jalandhry.txt?raw";

type Lang = "English" | "Hindi" | "Urdu";
type QuranResult = { ref: string; text: string };
type HadithResult = { collection: string; number?: string; grade?: string; arabic?: string; english?: string; reference?: string; url?: string };
type Answer = { intro: string; quran: QuranResult[]; hadith: HadithResult[]; note?: string };

const HADITH_TREE = "https://api.github.com/repos/CheeseWithSauce/HadithsJSONFormat/git/trees/main?recursive=1";
const HADITH_RAW = "https://raw.githubusercontent.com/CheeseWithSauce/HadithsJSONFormat/main/";
const CACHE_TREE = "mg-hadith-tree-v1";
const CACHE_PREFIX = "mg-hadith-file-v1:";

const normalize = (s: string) => s.toLowerCase().normalize("NFKC").replace(/[^a-z0-9\u0900-\u097f\u0600-\u06ff\s:.-]/gi, " ").replace(/\s+/g, " ").trim();
const parseQuran = (raw: string): QuranResult[] => raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean).map((line, i) => { const m = line.match(/^(\d+)[|:\t](\d+)[|:\t](.*)$/); return m ? { ref: `Qur'an ${m[1]}:${m[2]}`, text: m[3].trim() } : { ref: `Qur'an passage ${i + 1}`, text: line }; });

const topics: Record<string, string[]> = {
  prayer: ["prayer", "salah", "namaz", "pray", "salat"], patience: ["patience", "patient", "sabr", "hardship", "difficult"], forgiveness: ["forgive", "forgiveness", "repent", "mercy", "tawbah"], charity: ["charity", "charitable", "zakat", "sadaqah", "spend"], parents: ["parents", "mother", "father", "parent"], marriage: ["marriage", "marry", "husband", "wife", "spouse"], anxiety: ["anxiety", "worry", "fear", "sad", "stress", "heart"], fasting: ["fast", "fasting", "ramadan", "ramadhan"]
};
const collectionNames = ["bukhari", "muslim", "abudawud", "abu dawud", "tirmidhi", "nasai", "nasa'i", "ibnmajah", "ibn majah"];
const isGoodGrade = (g = "") => /sahih|hasan/i.test(g) && !/da.?if|weak|fabricated|mawdu/i.test(g);

function localQuran(q: string, lang: Lang): QuranResult[] {
  const nq = normalize(q); const keys = Object.entries(topics).filter(([, words]) => words.some(w => nq.includes(w))).map(([k]) => k); const words = nq.split(" ").filter(w => w.length > 2); const raw = lang === "Hindi" ? quranHindiRaw : lang === "Urdu" ? quranUrduRaw : quranEnglishRaw; const all = parseQuran(raw);
  return all.map(r => { const t = normalize(r.text); let score = 0; keys.forEach(k => topics[k].forEach(w => { if (t.includes(normalize(w))) score += 4; })); words.forEach(w => { if (t.includes(w)) score += 1; }); return { r, score }; }).filter(x => x.score > 0).sort((a,b) => b.score-a.score).slice(0,4).map(x => x.r);
}

const pick = (obj: any, keys: string[]) => { for (const k of keys) if (obj && typeof obj[k] === "string" && obj[k].trim()) return obj[k].trim(); return undefined; };
function flattenHadith(node: any, path = "", out: HadithResult[] = []): HadithResult[] {
  if (!node) return out;
  if (Array.isArray(node)) { node.forEach((x, i) => flattenHadith(x, `${path}/${i}`, out)); return out; }
  if (typeof node !== "object") return out;
  const english = pick(node, ["english", "hadithEnglish", "English", "translation", "text"]);
  const arabic = pick(node, ["arabic", "hadithArabic", "Arabic"]);
  const grade = pick(node, ["grade", "grading", "status", "authenticity"]);
  const number = pick(node, ["hadithNumber", "hadith_number", "number", "id"]);
  const reference = pick(node, ["reference", "ref", "bookReference"]);
  const collection = pick(node, ["collection", "book", "source"]) || path.split("/").filter(Boolean).find(x => collectionNames.some(c => x.toLowerCase().includes(c))) || "Hadith collection";
  if ((english || arabic) && (grade || reference || number)) out.push({ collection, number, grade, arabic, english, reference });
  Object.entries(node).forEach(([k, v]) => { if (typeof v === "object") flattenHadith(v, `${path}/${k}`, out); });
  return out;
}

async function loadHadithFiles(query: string): Promise<HadithResult[]> {
  try {
    const nq = normalize(query); let tree: any = null; const cached = localStorage.getItem(CACHE_TREE);
    if (cached) { try { tree = JSON.parse(cached); } catch {} }
    if (!tree) { const r = await fetch(HADITH_TREE); if (!r.ok) return []; tree = await r.json(); localStorage.setItem(CACHE_TREE, JSON.stringify(tree)); }
    const files = (tree.tree || []).filter((x: any) => x.type === "blob" && /\.json$/i.test(x.path) && collectionNames.some((c: string) => x.path.toLowerCase().includes(c))).map((x: any) => x.path);
    const words = nq.split(" ").filter(w => w.length > 2); const ranked = files.map((p: string) => { const lp = p.toLowerCase(); let score = 0; words.forEach(w => { if (lp.includes(w)) score += 2; }); return { p, score }; }).sort((a: any,b: any) => b.score-a.score).slice(0, 10).map((x: any) => x.p);
    const targets = ranked.length ? ranked : files.slice(0, 10);
    const all: HadithResult[] = [];
    for (const path of targets) {
      let data: any = null; const key = CACHE_PREFIX + path; const c = localStorage.getItem(key); if (c) { try { data = JSON.parse(c); } catch {} }
      if (!data) { const r = await fetch(HADITH_RAW + path); if (!r.ok) continue; data = await r.json(); try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }
      all.push(...flattenHadith(data, path));
    }
    const rankedHadith = all.map(h => { const hay = normalize([h.english, h.arabic, h.reference, h.collection].filter(Boolean).join(" ")); let score = isGoodGrade(h.grade) ? 8 : 0; words.forEach(w => { if (hay.includes(w)) score += 2; }); return { h, score }; }).filter(x => x.score > 8).sort((a,b) => b.score-a.score).slice(0, 5).map(x => x.h);
    return rankedHadith.filter(h => isGoodGrade(h.grade));
  } catch { return []; }
}

async function answerFor(q: string, lang: Lang): Promise<Answer> {
  const quran = localQuran(q, lang); const hadith = await loadHadithFiles(q);
  const intro = lang === "Hindi" ? "Qur'an aur available graded Hadith sources se relevant references diye gaye hain." : lang === "Urdu" ? "Qur'an aur available graded Hadith sources se muta'alliq references diye gaye hain." : "Relevant Qur'an passages and graded Hadith references are shown below.";
  return { intro, quran, hadith, note: "Reference-based assistant: Sahih/Hasan grading ko source data ke mutabiq dikhaya jata hai. Yeh fatwa service nahi hai; fiqh ya personal ruling ke liye qualified scholar se mashwara karein." };
}

export default function IslamicAI() {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(""); const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("mg-ai-lang") as Lang) || "English");
  const [history, setHistory] = useState<{q:string; answer:Answer}[]>(() => { try { return JSON.parse(localStorage.getItem("mg-ai-history") || "[]"); } catch { return []; } });
  const latest = history[0];
  const suggestions = useMemo(() => lang === "Hindi" ? ["Sabr ke baare mein Qur'an aur Hadith kya kehte hain?", "Namaz ki importance kya hai?", "Walidain ke huqooq kya hain?"] : lang === "Urdu" ? ["Sabr ke bare mein Qur'an aur Hadith kya kehte hain?", "Namaz ki ahmiyat kya hai?", "Walidain ke huqooq kya hain?"] : ["What do the Qur'an and Hadith say about patience?", "Why is prayer important?", "What do they say about parents?"], [lang]);
  const ask = async (text = q) => { const value = text.trim(); if (!value || loading) return; setLoading(true); try { const answer = await answerFor(value, lang); const next = [{ q:value, answer }, ...history].slice(0,10); setHistory(next); setQ(""); localStorage.setItem("mg-ai-history", JSON.stringify(next)); } finally { setLoading(false); } };
  const changeLang = (v:Lang) => { setLang(v); localStorage.setItem("mg-ai-lang", v); };
  if (!open) return <button onClick={() => setOpen(true)} aria-label="Open Islamic AI" style={{position:"fixed",left:18,bottom:22,zIndex:1000,border:0,borderRadius:999,padding:"12px 16px",display:"flex",gap:8,alignItems:"center",fontWeight:800,background:"#111827",color:"white",boxShadow:"0 10px 30px rgba(0,0,0,.25)",cursor:"pointer"}}>✨ Islamic AI</button>;
  return <div style={{position:"fixed",inset:0,zIndex:1100,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}><section style={{width:"min(760px,100%)",maxHeight:"92vh",overflow:"auto",background:"white",borderRadius:"24px 24px 0 0",padding:20,boxSizing:"border-box",fontFamily:"system-ui"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><div style={{fontSize:12,fontWeight:800,letterSpacing:1}}>MUSLIM GUIDE</div><h2 style={{margin:"4px 0"}}>Islamic AI Assistant</h2><small>Free • Qur'an + graded Hadith • No API key</small></div><button onClick={()=>setOpen(false)} style={{fontSize:24,border:0,background:"transparent",cursor:"pointer"}}>×</button></div>
    <div style={{display:"flex",gap:8,margin:"16px 0",flexWrap:"wrap"}}>{(["English","Hindi","Urdu"] as Lang[]).map(x=><button key={x} onClick={()=>changeLang(x)} style={{border:"1px solid #ddd",borderRadius:999,padding:"8px 12px",background:lang===x?"#111827":"white",color:lang===x?"white":"#111827"}}>{x}</button>)}</div>
    <div style={{display:"grid",gap:8}}>{suggestions.map(s=><button key={s} onClick={()=>ask(s)} style={{textAlign:"left",padding:12,border:"1px solid #e5e7eb",borderRadius:14,background:"#f9fafb"}}>{s}</button>)}</div>
    <div style={{display:"flex",gap:8,marginTop:14}}><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void ask()}} placeholder="Ask about Qur'an or Hadith..." style={{flex:1,padding:13,border:"1px solid #d1d5db",borderRadius:14}}/><button onClick={()=>void ask()} disabled={loading} style={{padding:"0 18px",border:0,borderRadius:14,background:"#111827",color:"white",fontWeight:800}}>{loading?"Searching…":"Ask"}</button></div>
    {latest&&<div style={{marginTop:18}}><div style={{fontWeight:800}}>Q: {latest.q}</div><p>{latest.answer.intro}</p>
      <h3 style={{marginBottom:8}}>📖 Qur'an references</h3>{latest.answer.quran.length ? latest.answer.quran.map(r=><article key={r.ref} style={{padding:14,margin:"10px 0",borderRadius:16,background:"#f5f7fa"}}><div style={{fontWeight:800,fontSize:13}}>{r.ref}</div><div style={{marginTop:6,lineHeight:1.6}}>{r.text}</div></article>) : <div style={{opacity:.7}}>No clear local Qur'an match found.</div>}
      <h3 style={{margin:"18px 0 8px"}}>📚 Hadith references</h3>{latest.answer.hadith.length ? latest.answer.hadith.map((h,i)=><article key={`${h.collection}-${h.number}-${i}`} style={{padding:14,margin:"10px 0",borderRadius:16,background:"#fff7ed",border:"1px solid #fed7aa"}}><div style={{fontWeight:800,fontSize:13}}>{h.collection}{h.number ? ` • Hadith ${h.number}` : ""}</div>{h.grade&&<div style={{display:"inline-block",marginTop:6,padding:"3px 8px",borderRadius:999,background:"#dcfce7",fontSize:12,fontWeight:800}}>{h.grade}</div>}{h.arabic&&<div dir="rtl" style={{marginTop:10,fontSize:18,lineHeight:1.9}}>{h.arabic}</div>}{h.english&&<div style={{marginTop:8,lineHeight:1.6}}>{h.english}</div>}{h.reference&&<div style={{marginTop:8,fontSize:12,opacity:.75}}>Reference: {h.reference}</div>}</article>) : <div style={{opacity:.7}}>No Sahih/Hasan Hadith match was found from the cached/source dataset. Try a more specific question.</div>}
      <div style={{fontSize:12,opacity:.7,marginTop:12}}>{latest.answer.note}</div>
    </div>}
  </section></div>;
}
