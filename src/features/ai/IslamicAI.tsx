import React, { useMemo, useState } from "react";
import quranEnglishRaw from "../../data/quran-en-saheeh.txt?raw";
import quranHindiRaw from "../../data/quran-hi-farooq-nadwi.txt?raw";
import quranUrduRaw from "../../data/quran-ur-jalandhry.txt?raw";
import { englishToHinglish, semanticRank } from "./semanticRag";

type Lang = "English" | "Hindi" | "Urdu";
type QuranResult = { ref: string; text: string };
type HadithResult = { collection: string; number?: string; grade?: string; arabic?: string; english?: string; hinglish?: string; reference?: string };
type Answer = { intro: string; explanation: string; quran: QuranResult[]; hadith: HadithResult[]; matchedTopic: string; note: string };
type TreeItem = { path: string; type: string };

const HADITH_TREE = "https://api.github.com/repos/CheeseWithSauce/HadithsJSONFormat/git/trees/main?recursive=1";
const HADITH_RAW = "https://raw.githubusercontent.com/CheeseWithSauce/HadithsJSONFormat/main/";
const CACHE_TREE = "mg-hadith-tree-v4";
const CACHE_PREFIX = "mg-hadith-file-v4:";

const normalize = (s: string) => s.toLowerCase().normalize("NFKC").replace(/[^a-z0-9\u0900-\u097f\u0600-\u06ff\s:.-]/gi, " ").replace(/\s+/g, " ").trim();
const parseQuran = (raw: string): QuranResult[] => raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean).map((line, i) => { const m = line.match(/^(\d+)[|:\t](\d+)[|:\t](.*)$/); return m ? { ref: `Qur'an ${m[1]}:${m[2]}`, text: m[3].trim() } : { ref: `Qur'an passage ${i + 1}`, text: line }; });

const topics: Record<string, string[]> = {
  prayer: ["prayer","salah","namaz","pray","salat","five prayers","नमाज़","नमाज","نماز"],
  patience: ["patience","patient","sabr","sabar","hardship","difficult","difficulty","trouble","सब्र","मुश्किल","پریشانی","صبر"],
  forgiveness: ["forgive","forgiveness","repent","mercy","tawbah","sin","sins","माफी","तौबा","गुनाह","معافی","توبہ"],
  charity: ["charity","zakat","sadaqah","spend","donation","ज़कात","जकात","सदका","زکوٰۃ","صدقہ"],
  parents: ["parents","mother","father","parent","walidain","maa","माता","पिता","माँ","والدین","والدہ"],
  marriage: ["marriage","marry","husband","wife","spouse","nikah","शादी","निकाह","شادی","نکاح"],
  anxiety: ["anxiety","worry","fear","sad","stress","heart","depression","चिंता","फिक्र","डर","فکر","خوف"],
  fasting: ["fast","fasting","ramadan","ramadhan","roza","रोज़ा","रमज़ान","روزہ","رمضان"],
  music: ["music","song","songs","instrument","instruments","संगीत","गाना","موسیقی"],
  alcohol: ["alcohol","wine","drinking","intoxicant","khamr","शराब","नशा","شراب","نشہ"],
  food: ["halal food","haram food","food","meat","pork","halal","haram","हलाल","हराम","खाना","حلال","حرام"],
  charityDebt: ["debt","loan","owe","borrow","कर्ज","उधार","قرض","ادھار"]
};

const findTopic = (q: string) => {
  const n = normalize(q);
  return Object.entries(topics).find(([, words]) => words.some(w => n.includes(normalize(w))))?.[0] || "general";
};

const explanations: Record<string, string> = {
  prayer: "Namaz (Salah) Islam ki central ibadat hai. Qur'an baar-baar Salah qayam karne ka hukm deta hai, isliye isko sirf ek general good practice nahi balki deen ki bunyadi ibadat ke taur par samjha jata hai.",
  patience: "Islam mushkil waqt me Sabr aur Allah par tawakkul sikhata hai. Sabr ka matlab passive rehna nahi; insaan ko sahi kaam karte hue Allah par bharosa rakhna chahiye.",
  forgiveness: "Islam sincere Tawbah aur Allah ki Maghfirah ki umeed dilata hai. Gunah par nadamat, Allah se maafi aur dobara gunah se bachne ki genuine koshish Tawbah ka hissa hai.",
  parents: "Qur'an walidain ke saath ihsan, respect aur narmi se baat karne ki taleem deta hai. Specific situation me Allah ki nafarmani wali baat me kisi ki ita'at nahi ki jati.",
  fasting: "Ramadan ke roze ka maqsad Taqwa develop karna aur Allah ki ita'at me self-control badhana hai. Qur'an illness aur travel jaise cases me rukhsat ka bhi zikr karta hai.",
  charity: "Islam Sadaqah ki honsla-afzai karta hai aur conditions poori hone par Zakat ko farz banata hai. Zakat ke exact rules ke liye nisab, maal aur hawl jaise details dekhni hoti hain.",
  marriage: "Nikah Islam me lawful family relationship hai jisme dono spouses ke rights aur responsibilities hoti hain. Specific fiqh dispute me qualified scholar ki guidance leni chahiye.",
  anxiety: "Islam distress ke waqt Allah ki yaad, Salah, Sabr aur dua ki taraf guide karta hai. Persistent mental-health difficulty me qualified professional se help lena bhi zaroori ho sakta hai.",
  music: "Music aur instruments ke ruling par ulama ke darmiyan tafseeli ikhtilaf milta hai. Isliye ek single opinion ko har scholar ki unanimous position ke taur par present nahi karna chahiye.",
  alcohol: "Qur'an intoxicants se bachne ki clear hidayat deta hai. Sharab aur intoxicating drinks ki manahi Islamic sources me wazeh hai.",
  food: "Islam halal aur haram food me farq karta hai. Kisi specific product ka ruling ingredients, preparation aur relevant evidence dekh kar decide hota hai.",
  charityDebt: "Islam qarz aur financial obligations ko serious matter maanta hai aur debts ko ada karne ki honsla-afzai karta hai.",
  general: "Is sawal ka jawab fixed topic guess karne ke bajay relevant Qur'an aur graded Hadith evidence se retrieve kiya ja raha hai. Neeche diye gaye references ko primary evidence samjhein; specific fiqh/fatwa ke liye qualified scholar se mashwara karein."
};

function lexicalCandidates<T>(q: string, items: T[], textOf: (x:T)=>string, limit:number): T[] {
  const words = normalize(q).split(" ").filter(w => w.length > 2);
  return items.map(item => { const t = normalize(textOf(item)); const score = words.reduce((s,w) => s + (t.includes(w) ? 1 : 0), 0); return {item,score}; }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.item);
}

const pick = (obj:any, keys:string[]) => { for (const k of keys) if (obj && typeof obj[k] === "string" && obj[k].trim()) return obj[k].trim(); return undefined; };
function flattenHadith(node:any, path="", out:HadithResult[]=[]):HadithResult[] {
  if (!node) return out;
  if (Array.isArray(node)) { node.forEach((x,i)=>flattenHadith(x,`${path}/${i}`,out)); return out; }
  if (typeof node !== "object") return out;
  const english=pick(node,["english","hadithEnglish","English","translation"]);
  const arabic=pick(node,["arabic","hadithArabic","Arabic"]);
  const grade=pick(node,["grade","grading","status","authenticity"]);
  const number=pick(node,["hadithNumber","hadith_number","number","id"]);
  const reference=pick(node,["reference","ref","bookReference"]);
  const collection=pick(node,["collection","book","source"]) || path.split("/").find(x=>/bukhari|muslim|abudawud|tirmidhi|nasai|ibn.?majah/i.test(x)) || "Hadith collection";
  if ((english||arabic) && (grade||reference||number)) out.push({collection,number,grade,arabic,english,reference});
  Object.entries(node).forEach(([k,v])=>{if(v&&typeof v==="object")flattenHadith(v,`${path}/${k}`,out);});
  return out;
}
const isGoodGrade=(g="")=>/sahih|hasan/i.test(g)&&!/da.?if|weak|fabricated|mawdu/i.test(g);

async function loadHadithFiles(query:string):Promise<HadithResult[]> {
  try {
    let tree:TreeItem[]=[]; const cached=localStorage.getItem(CACHE_TREE); if(cached){try{tree=JSON.parse(cached);}catch{}}
    if(!tree.length){const r=await fetch(HADITH_TREE); if(!r.ok)return []; const data=await r.json() as {tree?:TreeItem[]}; tree=(data.tree||[]).filter(x=>x.type==="blob"&&x.path.startsWith("Sunnah/")&&x.path.endsWith(".json")); localStorage.setItem(CACHE_TREE,JSON.stringify(tree));}
    const all:HadithResult[]=[];
    for(const item of tree.slice(0,80)){
      const key=CACHE_PREFIX+item.path; let data:any=null; const cachedFile=localStorage.getItem(key); if(cachedFile){try{data=JSON.parse(cachedFile);}catch{}}
      if(!data){const r=await fetch(HADITH_RAW+item.path); if(!r.ok)continue; data=await r.json(); try{localStorage.setItem(key,JSON.stringify(data));}catch{}}
      all.push(...flattenHadith(data,item.path));
    }
    const good=all.filter(h=>isGoodGrade(h.grade)&&h.english);
    const candidates=lexicalCandidates(query,good,h=>[h.english,h.arabic,h.reference,h.collection].filter(Boolean).join(" "),220);
    const semantic=await semanticRank(query,candidates,h=>[h.english,h.arabic,h.reference,h.collection].filter(Boolean).join(" "),8);
    return semantic;
  } catch { return []; }
}

async function answerFor(q:string,lang:Lang):Promise<Answer>{
  const raw=lang==="Hindi"?quranHindiRaw:lang==="Urdu"?quranUrduRaw:quranEnglishRaw;
  const allQuran=parseQuran(raw);
  const qCandidates=lexicalCandidates(q,allQuran,r=>r.text,500);
  const quran=qCandidates.length ? await semanticRank(q,qCandidates,r=>r.text,5) : await semanticRank(q,allQuran,r=>r.text,5);
  const hadith=await loadHadithFiles(q);
  const topic=findTopic(q);
  const translated=await Promise.all(hadith.map(async h=>({...h,hinglish:h.english?await englishToHinglish(h.english):undefined})));
  const intro=lang==="Hindi"?"Aapke sawal ko semantic search se Qur'an aur graded Hadith ke relevant passages ke saath match kiya gaya hai.":lang==="Urdu"?"آپ کے سوال کو متعلقہ قرآن اور صحیح/حسن احادیث کے ساتھ semantic search سے match کیا گیا ہے۔":"Your question was matched semantically against the Qur'an and graded Hadith sources.";
  const note=hadith.length?"Hadith retrieval me Sahih/Hasan grading ko filter kiya gaya hai. Sunan collection ki har narration automatically Sahih nahi hoti.":"Relevant Sahih/Hasan Hadith current indexed source me nahi mili.";
  return {intro,explanation:explanations[topic],quran,hadith:translated,matchedTopic:topic,note};
}

export default function IslamicAI(){
  const [open,setOpen]=useState(false); const [q,setQ]=useState(""); const [loading,setLoading]=useState(false);
  const [lang,setLang]=useState<Lang>(()=>(localStorage.getItem("mg-ai-lang") as Lang)||"English");
  const [history,setHistory]=useState<{q:string;answer:Answer}[]>(()=>{try{return JSON.parse(localStorage.getItem("mg-ai-history")||"[]");}catch{return[];}}); const latest=history[0];
  const suggestions=useMemo(()=>lang==="Hindi"?["Sabr ke baare me Qur'an aur Hadith kya kehte hain?","Namaz kyu zaroori hai?","Mushkil waqt me Allah par bharosa kaise rakhein?"]:lang==="Urdu"?["صبر کے بارے میں قرآن اور حدیث کیا کہتے ہیں؟","نماز کیوں ضروری ہے؟","مشکل وقت میں اللہ پر بھروسہ کیسے رکھیں؟"]:["What do the Qur'an and Hadith say about patience?","Why is prayer important?","How should we trust Allah during hardship?"],[lang]);
  const ask=async(text=q)=>{const value=text.trim();if(!value||loading)return;setLoading(true);try{const answer=await answerFor(value,lang);const next=[{q:value,answer},...history].slice(0,10);setHistory(next);setQ("");localStorage.setItem("mg-ai-history",JSON.stringify(next));}finally{setLoading(false);}};
  const changeLang=(v:Lang)=>{setLang(v);localStorage.setItem("mg-ai-lang",v);};
  if(!open)return <button onClick={()=>setOpen(true)} aria-label="Open Islamic AI" style={{position:"fixed",left:18,bottom:22,zIndex:1000,border:0,borderRadius:999,padding:"12px 16px",display:"flex",gap:8,alignItems:"center",fontWeight:800,background:"#111827",color:"white",boxShadow:"0 10px 30px rgba(0,0,0,.25)",cursor:"pointer"}}>✨ Islamic AI</button>;
  const ui=lang==="Hindi"?{title:"Islamic AI Assistant",sub:"Free • Qur'an + graded Hadith • Hinglish answers",answer:"Hinglish me jawab",quran:"📖 Qur'an ke references",hadith:"📚 Hadith ke references",noQ:"Relevant Qur'an match nahi mila.",noH:"Matching Sahih/Hasan Hadith nahi mili.",ask:"Pucho",placeholder:"Jaise: Namaz kyu zaroori hai?"}:lang==="Urdu"?{title:"Islamic AI Assistant",sub:"Free • قرآن + صحیح/حسن حدیث • اردو",answer:"جواب",quran:"📖 قرآن کے حوالے",hadith:"📚 حدیث کے حوالے",noQ:"متعلقہ قرآن نہیں ملا۔",noH:"متعلقہ صحیح/حسن حدیث نہیں ملی۔",ask:"پوچھیں",placeholder:"اپنا سوال اردو میں پوچھیں..."}:{title:"Islamic AI Assistant",sub:"Free • Qur'an + graded Hadith • Semantic search",answer:"Evidence-based answer",quran:"📖 Qur'an references",hadith:"📚 Hadith references",noQ:"No relevant Qur'an passage found.",noH:"No matching Sahih/Hasan Hadith found.",ask:"Ask",placeholder:"Ask about Qur'an or Hadith..."};
  return <div style={{position:"fixed",inset:0,zIndex:1100,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}><section style={{width:"min(760px,100%)",maxHeight:"92vh",overflow:"auto",background:"white",borderRadius:"24px 24px 0 0",padding:20,boxSizing:"border-box",fontFamily:"system-ui"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><div style={{fontSize:12,fontWeight:800,letterSpacing:1}}>MUSLIM GUIDE</div><h2 style={{margin:"4px 0"}}>{ui.title}</h2><small>{ui.sub}</small></div><button onClick={()=>setOpen(false)} style={{fontSize:24,border:0,background:"transparent",cursor:"pointer"}}>×</button></div>
    <div style={{display:"flex",gap:8,margin:"16px 0",flexWrap:"wrap"}}>{(["English","Hindi","Urdu"] as Lang[]).map(x=><button key={x} onClick={()=>changeLang(x)} style={{border:"1px solid #ddd",borderRadius:999,padding:"8px 12px",background:lang===x?"#111827":"white",color:lang===x?"white":"#111827"}}>{x==="Hindi"?"Hinglish / Hindi":x}</button>)}</div>
    <div style={{display:"grid",gap:8}}>{suggestions.map(s=><button key={s} onClick={()=>void ask(s)} style={{textAlign:"left",padding:12,border:"1px solid #e5e7eb",borderRadius:14,background:"#f9fafb"}}>{s}</button>)}</div>
    <div style={{display:"flex",gap:8,marginTop:14}}><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void ask()}} placeholder={ui.placeholder} style={{flex:1,padding:13,border:"1px solid #d1d5db",borderRadius:14}}/><button onClick={()=>void ask()} disabled={loading} style={{padding:"0 18px",border:0,borderRadius:14,background:"#111827",color:"white",fontWeight:800}}>{loading?"Searching…":ui.ask}</button></div>
    {latest&&<div style={{marginTop:18}}><div style={{fontWeight:800}}>Q: {latest.q}</div><p>{latest.answer.intro}</p><article style={{padding:16,margin:"10px 0",borderRadius:16,background:"#eef6ff",border:"1px solid #bfdbfe"}}><div style={{fontWeight:800,marginBottom:6}}>{ui.answer}</div><div style={{lineHeight:1.75}}>{latest.answer.explanation}</div></article>
      <h3 style={{marginBottom:8}}>{ui.quran}</h3>{latest.answer.quran.length?latest.answer.quran.map(r=><article key={r.ref} style={{padding:14,margin:"10px 0",borderRadius:16,background:"#f5f7fa"}}><div style={{fontWeight:800,fontSize:13}}>{r.ref}</div><div style={{marginTop:6,lineHeight:1.6}}>{r.text}</div></article>):<div style={{opacity:.7}}>{ui.noQ}</div>}
      <h3 style={{margin:"18px 0 8px"}}>{ui.hadith}</h3>{latest.answer.hadith.length?latest.answer.hadith.map((h,i)=><article key={`${h.collection}-${h.number}-${i}`} style={{padding:14,margin:"10px 0",borderRadius:16,background:"#fff7ed",border:"1px solid #fed7aa"}}><div style={{fontWeight:800,fontSize:13}}>{h.collection}{h.number?` • Hadith ${h.number}`:""}</div>{h.grade&&<div style={{display:"inline-block",marginTop:6,padding:"3px 8px",borderRadius:999,background:"#dcfce7",fontSize:12,fontWeight:800}}>{h.grade}</div>}{h.arabic&&<div dir="rtl" style={{marginTop:10,fontSize:18,lineHeight:1.9}}>{h.arabic}</div>}{lang==="Hindi"&&h.hinglish?<div style={{marginTop:10,lineHeight:1.7}}><b>Hinglish:</b> {h.hinglish}</div>:h.english&&<div style={{marginTop:8,lineHeight:1.6}}>{h.english}</div>}{h.reference&&<div style={{marginTop:8,fontSize:12,opacity:.75}}>Reference: {h.reference}</div>}</article>):<div style={{opacity:.7}}>{ui.noH}</div>}
      <div style={{fontSize:12,opacity:.7,marginTop:12}}>{latest.answer.note} {lang==="Hindi"?"Ye reference-based assistant hai — fatwa service nahi.":lang==="Urdu"?"یہ صرف حوالہ جاتی معاون ہے، فتویٰ سروس نہیں۔":"Reference assistant only — not a fatwa service."}</div>
    </div>}
  </section></div>;
}
