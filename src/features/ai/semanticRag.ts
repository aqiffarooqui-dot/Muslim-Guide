const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const TRANSLATION_MODEL = "Xenova/opus-mt-en-hi";

type Pipeline = (task: string, model: string) => Promise<any>;
let transformersPromise: Promise<{ pipeline: Pipeline }> | null = null;
let embedderPromise: Promise<any> | null = null;
let translatorPromise: Promise<any> | null = null;

async function getTransformers() {
  if (!transformersPromise) {
    transformersPromise = import(/* @vite-ignore */ "https://esm.sh/@huggingface/transformers@3.7.2") as Promise<{ pipeline: Pipeline }>;
  }
  return transformersPromise;
}
const getEmbedder = async () => { if (!embedderPromise) { const { pipeline } = await getTransformers(); embedderPromise = pipeline("feature-extraction", EMBEDDING_MODEL); } return embedderPromise; };
const getTranslator = async () => { if (!translatorPromise) { const { pipeline } = await getTransformers(); translatorPromise = pipeline("translation", TRANSLATION_MODEL); } return translatorPromise; };

const cosine = (a:number[],b:number[]) => { let dot=0,aa=0,bb=0; const n=Math.min(a.length,b.length); for(let i=0;i<n;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];} return aa&&bb?dot/(Math.sqrt(aa)*Math.sqrt(bb)):0; };
const vectorFromTensor = (x:any):number[] => { if(x?.tolist){const v=x.tolist();return Array.isArray(v?.[0])?v[0]:v;} return Array.from(x?.data||[]); };

export async function embedText(text:string):Promise<number[]> { const pipe=await getEmbedder(); const output=await pipe(text,{pooling:"mean",normalize:true}); return vectorFromTensor(output); }

export async function semanticRank<T>(query:string,items:T[],textOf:(item:T)=>string,topK:number):Promise<T[]> {
  if(!items.length)return [];
  const q=await embedText(query); const scored:{item:T;score:number}[]=[]; const batchSize=24;
  for(let i=0;i<items.length;i+=batchSize){const batch=items.slice(i,i+batchSize);const pipe=await getEmbedder();const output=await pipe(batch.map(textOf),{pooling:"mean",normalize:true});const rows=output?.tolist?output.tolist():[];batch.forEach((item,j)=>scored.push({item,score:cosine(q,rows[j]||[])}));}
  return scored.sort((a,b)=>b.score-a.score).slice(0,topK).map(x=>x.item);
}

const romanizeHindi=(input:string)=>{
  const map:Record<string,string>={"अ":"a","आ":"aa","इ":"i","ई":"ee","उ":"u","ऊ":"oo","ए":"e","ऐ":"ai","ओ":"o","औ":"au","अं":"n","अः":"h","क":"k","ख":"kh","ग":"g","घ":"gh","ङ":"ng","च":"ch","छ":"chh","ज":"j","झ":"jh","ञ":"ny","ट":"t","ठ":"th","ड":"d","ढ":"dh","ण":"n","त":"t","थ":"th","द":"d","ध":"dh","न":"n","प":"p","फ":"ph","ब":"b","भ":"bh","म":"m","य":"y","र":"r","ल":"l","व":"v","श":"sh","ष":"sh","स":"s","ह":"h","क़":"q","ख़":"kh","ग़":"gh","ज़":"z","फ़":"f","ड़":"r","ढ़":"rh","ळ":"l"};
  const matra:Record<string,string>={"ा":"aa","ि":"i","ी":"ee","ु":"u","ू":"oo","ृ":"ri","े":"e","ै":"ai","ो":"o","ौ":"au","ं":"n","ँ":"n","ः":"h","्":""}; let out="";
  for(let i=0;i<input.length;i++){const ch=input[i];if(map[ch]){let part=map[ch],next=input[i+1];if(next&&matra[next]!==undefined){part+=matra[next];i++;}else if(next!=="्"&&/[क-हक़-य़]/.test(ch))part+="a";out+=part;}else if(matra[ch]!==undefined)out+=matra[ch];else out+=ch;}
  return out.replace(/aaaa/g,"aa").replace(/\s+/g," ").trim();
};

export async function englishToHinglish(text:string):Promise<string>{
  if(!text?.trim())return "";
  try{const pipe=await getTranslator();const result:any=await pipe(text,{max_new_tokens:220});const hindi=Array.isArray(result)?result[0]?.translation_text:result?.translation_text;return hindi?romanizeHindi(hindi):text;}catch{return text;}
}
