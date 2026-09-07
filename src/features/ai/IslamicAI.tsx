import React, { useMemo, useState } from "react";
import quranEnglishRaw from "../../data/quran-en-saheeh.txt?raw";
import quranHindiRaw from "../../data/quran-hi-farooq-nadwi.txt?raw";
import quranUrduRaw from "../../data/quran-ur-jalandhry.txt?raw";

type Lang = "English" | "Hindi" | "Urdu";
type QuranResult = { ref: string; text: string };
type HadithResult = { collection: string; number?: string; grade?: string; arabic?: string; english?: string; reference?: string };
type Answer = { intro: string; quran: QuranResult[]; hadith: HadithResult[]; matchedTopic: string; note: string };

type TreeItem = { path: string; type: string };
const HADITH_TREE = "https://api.github.com/repos/CheeseWithSauce/HadithsJSONFormat/git/trees/main?recursive=1";
const HADITH_RAW = "https://raw.githubusercontent.com/CheeseWithSauce/HadithsJSONFormat/main/";
const CACHE_TREE = "mg-hadith-tree-v2";
const CACHE_PREFIX = "mg-hadith-file-v2:";

const normalize = (s: string) => s.toLowerCase().normalize("NFKC").replace(/[^a-z0-9\u0900-\u097f\u0600-\u06ff\s:.-]/gi, " ").replace(/\s+/g, " ").trim();
const parseQuran = (raw: string): QuranResult[] => raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean).map((line, i) => { const m = line.match(/^(\d+)[|:\t](\d+)[|:\t](.*)$/); return m ? { ref: `Qur'an ${m[1]}:${m[2]}`, text: m[3].trim() } : { ref: `Qur'an passage ${i + 1}`, text: line }; });

const topics: Record<string, { words: string[]; hi: string[]; ur: string[] }> = {
  prayer: { words: ["prayer", "salah", "namaz", "pray", "salat", "five prayers"], hi: ["namaz", "नमाज़", "नमाज", "सलात", "प्रार्थना", "पाँच वक्त"], ur: ["نماز", "صلات", "پانچ وقت"] },
  patience: { words: ["patience", "patient", "sabr", "hardship", "difficult", "difficulty", "trouble"], hi: ["sabr", "sabar", "सब्र", "मुश्किल", "परेशानी", "धैर्य", "मुसीबत"], ur: ["صبر", "مشکل", "پریشانی", "مصیبت"] },
  forgiveness: { words: ["forgive", "forgiveness", "repent", "mercy", "tawbah", "sin", "sins"], hi: ["माफ", "माफी", "तौबा", "गुनाह", "रहमत", "पाप"], ur: ["معافی", "معاف", "توبہ", "گناہ", "رحمت"] },
  charity: { words: ["charity", "charitable", "zakat", "sadaqah", "spend", "donation"], hi: ["ज़कात", "जकात", "सदका", "दान", "खैरात", "चैरिटी"], ur: ["زکوٰۃ", "زکات", "صدقہ", "خیرات", "چیریٹی"] },
  parents: { words: ["parents", "mother", "father", "parent", "walidain", "walid", "maa", "mother"], hi: ["माता", "पिता", "माँ", "बाप", "वालिदैन", "माता पिता", "मां बाप"], ur: ["والدین", "والد", "والدہ", "ماں", "باپ"] },
  marriage: { words: ["marriage", "marry", "husband", "wife", "spouse", "nikah", "nikah"], hi: ["शादी", "विवाह", "निकाह", "पति", "पत्नी"], ur: ["شادی", "نکاح", "شوہر", "بیوی"] },
  anxiety: { words: ["anxiety", "worry", "fear", "sad", "stress", "heart", "depression"], hi: ["चिंता", "फिक्र", "डर", "उदासी", "तनाव", "दिल", "परेशान"], ur: ["فکر", "خوف", "اداسی", "تناؤ", "دل", "پریشان"] },
  fasting: { words: ["fast", "fasting", "ramadan", "ramadhan", "roza", "roza"], hi: ["रोज़ा", "रोजा", "उपवास", "रमज़ान", "रमजान", "रमज़ान"], ur: ["روزہ", "رمضان", "روزے"] },
  music: { words: ["music", "song", "songs", "instrument", "instruments"], hi: ["संगीत", "गाना", "गाने", "म्यूजिक"], ur: ["موسیقی", "گانا", "گانے"] },
  alcohol: { words: ["alcohol", "wine", "drinking", "intoxicant", "intoxicants", "khamr"], hi: ["शराब", "नशा", "मद्य"], ur: ["شراب", "نشہ", "خمر"] },
  food: { words: ["halal food", "haram food", "food", "meat", "pork", "halal", "haram"], hi: ["हलाल", "हराम", "खाना", "गोश्त", "सूअर"], ur: ["حلال", "حرام", "کھانا", "گوشت", "خنزیر"] },
  charityDebt: { words: ["debt", "loan", "owe", "borrow"], hi: ["कर्ज", "ऋण", "उधार", "क़र्ज़"], ur: ["قرض", "ادھار"] }
};

const topicAliases = (q: string) => {
  const n = normalize(q); const found: string[] = [];
  Object.entries(topics).forEach(([key, data]) => { const words = [...data.words, ...data.hi, ...data.ur]; if (words.some(w => n.includes(normalize(w)))) found.push(key); });
  return found;
};

function localQuran(q: string, lang: Lang): QuranResult[] {
  const nq = normalize(q); const keys = topicAliases(q); const expanded = keys.flatMap(k => topics[k].words);
  const words = [...nq.split(" ").filter(w => w.length > 2), ...expanded].map(normalize).filter(Boolean); const raw = lang === "Hindi" ? quranHindiRaw : lang === "Urdu" ? quranUrduRaw : quranEnglishRaw; const all = parseQuran(raw);
  return all.map(r => { const t = normalize(r.text); let score = 0; keys.forEach(k => topics[k].words.forEach(w => { if (t.includes(normalize(w))) score += 5; })); words.forEach(w => { if (t.includes(w)) score += 1; }); return { r, score }; }).filter(x => x.score > 0).sort((a,b) => b.score-a.score).slice(0,5).map(x => x.r);
}

const pick = (obj: any, keys: string[]) => { for (const k of keys) if (obj && typeof obj[k] === "string" && obj[k].trim()) return obj[k].trim(); return undefined; };
function flattenHadith(node: any, path = "", out: HadithResult[] = []): HadithResult[] {
  if (!node) return out; if (Array.isArray(node)) { node.forEach((x, i) => flattenHadith(x, `${path}/${i}`, out)); return out; } if (typeof node !== "object") return out;
  const english = pick(node, ["english", "hadithEnglish", "English", "translation"]); const arabic = pick(node, ["arabic", "hadithArabic", "Arabic"]); const grade = pick(node, ["grade", "grading", "status", "authenticity"]); const number = pick(node, ["hadithNumber", "hadith_number", "number", "id"]); const reference = pick(node, ["reference", "ref", "bookReference"]); const collection = pick(node, ["collection", "book", "source"]) || path.split("/").filter(Boolean).find(x => /bukhari|muslim|abudawud|tirmidhi|nasai|ibn.?majah/i.test(x)) || "Hadith collection";
  if ((english || arabic) && (grade || reference || number)) out.push({ collection, number, grade, arabic, english, reference }); Object.entries(node).forEach(([k,v]) => { if (v && typeof v === "object") flattenHadith(v, `${path}/${k}`, out); }); return out;
}

async function loadHadithFiles(query: string): Promise<HadithResult[]> {
  try {
    let tree: TreeItem[] = []; const cached = localStorage.getItem(CACHE_TREE); if (cached) { try { tree = JSON.parse(cached); } catch {} }
    if (!tree.length) { const r = await fetch(HADITH_TREE); if (!r.ok) return []; const data = await r.json() as { tree?: TreeItem[] }; tree = (data.tree || []).filter(x => x.type === "blob" && x.path.startsWith("Sunnah/") && x.path.endsWith(".json")); localStorage.setItem(CACHE_TREE, JSON.stringify(tree)); }
    const targetFiles = tree.slice(0, 80);
    const all: HadithResult[] = [];
    for (const item of targetFiles) {
      const key = CACHE_PREFIX + item.path; let data: any = null; const cachedFile = localStorage.getItem(key); if (cachedFile) { try { data = JSON.parse(cachedFile); } catch {} }
      if (!data) { const r = await fetch(HADITH_RAW + item.path); if (!r.ok) continue; data = await r.json(); try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }
      all.push(...flattenHadith(data, item.path));
    }
    const nq = normalize(query); const keys = topicAliases(query); const searchTerms = [...nq.split(" ").filter(w => w.length > 2), ...keys.flatMap(k => topics[k].words)].map(normalize).filter(Boolean);
    return all.map(h => { const hay = normalize([h.english, h.arabic, h.reference, h.collection].filter(Boolean).join(" ")); let score = isGoodGrade(h.grade) ? 10 : 0; searchTerms.forEach(w => { if (hay.includes(w)) score += 2; }); return { h, score }; }).filter(x => x.score >= 12).sort((a,b) => b.score-a.score).slice(0,8).map(x => x.h).filter(h => isGoodGrade(h.grade));
  } catch { return []; }
}

const isGoodGrade = (g = "") => /sahih|hasan/i.test(g) && !/da.?if|weak|fabricated|mawdu/i.test(g);

async function answerFor(q: string, lang: Lang): Promise<Answer> {
  const keys = topicAliases(q); const quran = localQuran(q, lang); const hadith = await loadHadithFiles(q); const topic = keys.length ? keys.join(", ") : "general question";
  const intro = lang === "Hindi" ? "Maine sawal ke topic ko identify karke Qur'an aur graded Hadith references se matching evidence nikala hai." : lang === "Urdu" ? "Sawal ke topic ko identify karke Qur'an aur graded Hadith references se muta'alliq evidence nikala gaya hai." : "I identified the question topic and retrieved matching evidence from the local Qur'an and graded Hadith sources.";
  const note = hadith.length ? "Hadith section mein sirf Sahih/Hasan grading wali narrations ko prioritize kiya gaya hai. Sunan collections ki har narration automatically Sahih nahi hoti." : "No matching Sahih/Hasan Hadith was found in the currently indexed source files. This is a reference assistant, not a fatwa service.";
  return { intro, quran, hadith, matchedTopic: topic, note };
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
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><div style={{fontSize:12,fontWeight:800,letterSpacing:1}}>MUSLIM GUIDE</div><h2 style={{margin:"4px 0"}}>Islamic AI Assistant</h2><small>Reference-grounded • Qur'an + Sahih/Hasan Hadith • Free</small></div><button onClick={()=>setOpen(false)} style={{fontSize:24,border:0,background:"transparent",cursor:"pointer"}}>×</button></div>
    <div style={{display:"flex",gap:8,margin:"16px 0",flexWrap:"wrap"}}>{(["English","Hindi","Urdu"] as Lang[]).map(x=><button key={x} onClick={()=>changeLang(x)} style={{border:"1px solid #ddd",borderRadius:999,padding:"8px 12px",background:lang===x?"#111827":"white",color:lang===x?"white":"#111827"}}>{x}</button>)}</div>
    <div style={{display:"grid",gap:8}}>{suggestions.map(s=><button key={s} onClick={()=>void ask(s)} style={{textAlign:"left",padding:12,border:"1px solid #e5e7eb",borderRadius:14,background:"#f9fafb"}}>{s}</button>)}</div>
    <div style={{display:"flex",gap:8,marginTop:14}}><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void ask()}} placeholder="Ask your Islamic question..." style={{flex:1,padding:13,border:"1px solid #d1d5db",borderRadius:14}}/><button onClick={()=>void ask()} disabled={loading} style={{padding:"0 18px",border:0,borderRadius:14,background:"#111827",color:"white",fontWeight:800}}>{loading?"Searching…":"Ask"}</button></div>
    {latest&&<div style={{marginTop:18}}><div style={{fontWeight:800}}>Q: {latest.q}</div><p>{latest.answer.intro}</p><div style={{fontSize:12,opacity:.7,marginBottom:12}}>Detected topic: {latest.answer.matchedTopic}</div>
      <h3 style={{marginBottom:8}}>📖 Qur'an references</h3>{latest.answer.quran.length ? latest.answer.quran.map(r=><article key={r.ref} style={{padding:14,margin:"10px 0",borderRadius:16,background:"#f5f7fa"}}><div style={{fontWeight:800,fontSize:13}}>{r.ref}</div><div style={{marginTop:6,lineHeight:1.6}}>{r.text}</div></article>) : <div style={{opacity:.7}}>No clear local Qur'an match found.</div>}
      <h3 style={{margin:"18px 0 8px"}}>📚 Sahih / Hasan Hadith references</h3>{latest.answer.hadith.length ? latest.answer.hadith.map((h,i)=><article key={`${h.collection}-${h.number}-${i}`} style={{padding:14,margin:"10px 0",borderRadius:16,background:"#fff7ed",border:"1px solid #fed7aa"}}><div style={{fontWeight:800,fontSize:13}}>{h.collection}{h.number ? ` • Hadith ${h.number}` : ""}</div>{h.grade&&<div style={{display:"inline-block",marginTop:6,padding:"3px 8px",borderRadius:999,background:"#dcfce7",fontSize:12,fontWeight:800}}>{h.grade}</div>}{h.arabic&&<div dir="rtl" style={{marginTop:10,fontSize:18,lineHeight:1.9}}>{h.arabic}</div>}{h.english&&<div style={{marginTop:8,lineHeight:1.6}}>{h.english}</div>}{h.reference&&<div style={{marginTop:8,fontSize:12,opacity:.75}}>Reference: {h.reference}</div>}</article>) : <div style={{opacity:.7}}>No matching Sahih/Hasan Hadith was found.</div>}
      <div style={{fontSize:12,opacity:.7,marginTop:12}}>{latest.answer.note}</div>
    </div>}
  </section></div>;
}
