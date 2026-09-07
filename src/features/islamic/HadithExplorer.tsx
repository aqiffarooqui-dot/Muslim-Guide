import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, Copy, ExternalLink, Loader2, Search, Share2, WifiOff } from "lucide-react";
import { getHadithCache, isOffline, setHadithCache } from "./hadithOffline";

type CollectionId = "bukhari" | "muslim" | "abudawud" | "tirmidhi" | "nasai" | "ibnmajah";
type Hadith = { collection?: string; book?: string; reference?: string; grade?: string; arabic?: string; english?: string; id?: number };
type TreeItem = { path: string; type: string };

const SOURCE_REPO = "CheeseWithSauce/HadithsJSONFormat";
const SOURCE_BRANCH = "main";
const SOURCE_API = `https://api.github.com/repos/${SOURCE_REPO}/git/trees/${SOURCE_BRANCH}?recursive=1`;
const SOURCE_BASE = `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_BRANCH}/`;
const collections: Array<{ id: CollectionId; name: string; folder: string; description: string }> = [
  { id: "bukhari", name: "Sahih al-Bukhari", folder: "bukhari", description: "Authentic collection of Imam al-Bukhari" },
  { id: "muslim", name: "Sahih Muslim", folder: "muslim", description: "Authentic collection of Imam Muslim" },
  { id: "abudawud", name: "Sunan Abi Dawud", folder: "abudawud", description: "Sunan collection with grading" },
  { id: "tirmidhi", name: "Jami` at-Tirmidhi", folder: "tirmidhi", description: "Sunan collection with grading" },
  { id: "nasai", name: "Sunan an-Nasa'i", folder: "nasai", description: "Sunan collection with grading" },
  { id: "ibnmajah", name: "Sunan Ibn Majah", folder: "ibnmajah", description: "Sunan collection with grading" },
];
function clean(value = "") { return value.replace(/\s+/g, " ").trim(); }
function collectionName(id: CollectionId) { return collections.find(c => c.id === id)?.name ?? id; }
function parseHadithPayload(payload: unknown): Hadith[] {
  if (Array.isArray(payload)) return payload as Hadith[];
  if (payload && typeof payload === "object") {
    const value = payload as Record<string, unknown>;
    for (const key of ["hadiths", "data", "items", "results"]) if (Array.isArray(value[key])) return value[key] as Hadith[];
    if ("arabic" in value || "english" in value || "reference" in value) return [value as Hadith];
  }
  return [];
}

export default function HadithExplorer() {
  const [collection, setCollection] = useState<CollectionId>("bukhari");
  const [books, setBooks] = useState<TreeItem[]>([]);
  const [book, setBook] = useState("");
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [query, setQuery] = useState("");
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingHadiths, setLoadingHadiths] = useState(false);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(isOffline());
  const [bookmarks, setBookmarks] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("muslim-guide-hadith-bookmarks") || "[]"); } catch { return []; } });

  useEffect(() => {
    const online = () => setOffline(false); const offlineNow = () => setOffline(true);
    window.addEventListener("online", online); window.addEventListener("offline", offlineNow);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offlineNow); };
  }, []);

  useEffect(() => {
    let cancelled = false; setLoadingBooks(true); setError("");
    const cacheKey = `tree:${collection}`; const localKey = `muslim-guide-hadith-tree-${collection}`;
    const load = async () => {
      try {
        let tree: TreeItem[] = (await getHadithCache<TreeItem[]>(cacheKey)) || [];
        if (!tree.length) { try { const cached = localStorage.getItem(localKey); if (cached) tree = JSON.parse(cached); } catch { /* ignore */ } }
        if (!tree.length && !isOffline()) {
          const response = await fetch(SOURCE_API, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
          if (!response.ok) throw new Error(`Source index unavailable (${response.status})`);
          const data = await response.json() as { tree?: TreeItem[] };
          tree = (data.tree || []).filter(item => item.type === "blob" && item.path.startsWith(`Sunnah/${collection}/`) && item.path.endsWith(".json"));
          await setHadithCache(cacheKey, tree); try { localStorage.setItem(localKey, JSON.stringify(tree)); } catch { /* ignore */ }
        }
        if (cancelled) return;
        tree.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
        if (!tree.length) throw new Error(isOffline() ? "This Hadith collection has not been cached on this device yet." : "No Hadith books found.");
        setBooks(tree); setBook(prev => tree.some(item => item.path === prev) ? prev : (tree[0]?.path || ""));
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load Hadith books."); }
      finally { if (!cancelled) setLoadingBooks(false); }
    };
    load(); return () => { cancelled = true; };
  }, [collection]);

  useEffect(() => {
    if (!book) { setHadiths([]); return; }
    let cancelled = false; setLoadingHadiths(true); setError("");
    const load = async () => {
      const cacheKey = `book:${book}`;
      try {
        let payload: unknown = null;
        if (!isOffline()) {
          try { const response = await fetch(`${SOURCE_BASE}${book}`, { cache: "no-store" }); if (!response.ok) throw new Error(); payload = await response.json(); await setHadithCache(cacheKey, payload); }
          catch { payload = await getHadithCache(cacheKey); if (!payload) throw new Error("Could not load this Hadith book. Connect to the internet once to cache it for offline reading."); }
        } else { payload = await getHadithCache(cacheKey); if (!payload) throw new Error("This book is not cached yet. Connect to the internet once to save it for offline reading."); }
        const parsed = parseHadithPayload(payload); if (!parsed.length) throw new Error("This Hadith book returned no readable narrations.");
        if (!cancelled) setHadiths(parsed);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load this Hadith book."); }
      finally { if (!cancelled) setLoadingHadiths(false); }
    };
    load(); return () => { cancelled = true; };
  }, [book]);

  useEffect(() => { try { localStorage.setItem("muslim-guide-hadith-bookmarks", JSON.stringify(bookmarks)); } catch { /* ignore */ } }, [bookmarks]);
  const visible = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return hadiths.slice(0, 40); return hadiths.filter(h => [h.english, h.arabic, h.reference, h.grade, h.book].some(v => clean(v).toLowerCase().includes(q))).slice(0, 80); }, [hadiths, query]);
  const toggleBookmark = (h: Hadith, index: number) => { const key = `${collection}:${book}:${h.id ?? index}`; setBookmarks(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]); };
  const isBookmarked = (h: Hadith, index: number) => bookmarks.includes(`${collection}:${book}:${h.id ?? index}`);
  const copyHadith = async (h: Hadith) => { const text = [h.arabic, h.english, h.reference, h.grade].filter(Boolean).join("\n\n"); try { await navigator.clipboard.writeText(text); } catch { /* ignore */ } };
  const shareHadith = async (h: Hadith) => { const text = [h.english || h.arabic, h.reference].filter(Boolean).join("\n\n"); if (navigator.share) await navigator.share({ title: `${collectionName(collection)} Hadith`, text }); else await copyHadith(h); };

  return <div className="tool-page hadith-explorer">
    {offline && <div className="tool-note"><WifiOff size={16}/> Offline mode: showing Hadith data already cached on this device.</div>}
    <div className="tool-note"><strong>Verified source:</strong> this reader uses the public HadithsJSONFormat dataset, which states its texts are taken from Sunnah.com and includes Arabic, English, gradings and references. The app does not invent or paraphrase Hadith text.</div>
    <div className="hadith-collections">{collections.map(c => <button key={c.id} className={`hadith-collection ${collection === c.id ? "active" : ""}`} onClick={() => { setCollection(c.id); setQuery(""); }}><strong>{c.name}</strong><span>{c.description}</span></button>)}</div>
    <div className="hadith-controls"><select value={book} onChange={e => setBook(e.target.value)} disabled={loadingBooks || !books.length} aria-label="Hadith book">{books.map(item => <option key={item.path} value={item.path}>{item.path.split("/").pop()?.replace(/\.json$/, "").replace(/^\d+_/, "").replace(/_/g, " ")}</option>)}</select><div className="hadith-search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search this book..." /></div></div>
    {loadingBooks && <div className="tool-note"><Loader2 className="spin" size={18}/> Loading collection index…</div>}
    {loadingHadiths && <div className="tool-note"><Loader2 className="spin" size={18}/> Loading Hadith text…</div>}
    {error && <div className="tool-note">{error}</div>}
    {!loadingHadiths && !error && <div className="hadith-list">{visible.map((h, index) => <article className="content-card hadith-card" key={`${h.id ?? index}-${h.reference ?? "hadith"}`}><div className="hadith-card-top"><span>{h.reference || `${collectionName(collection)} · Hadith ${h.id ?? index + 1}`}</span><div className="hadith-actions"><button onClick={() => toggleBookmark(h, index)} aria-label="Bookmark Hadith">{isBookmarked(h, index) ? <BookmarkCheck size={18}/> : <Bookmark size={18}/>}</button><button onClick={() => copyHadith(h)} aria-label="Copy Hadith"><Copy size={18}/></button><button onClick={() => shareHadith(h)} aria-label="Share Hadith"><Share2 size={18}/></button></div></div>{h.arabic && <p className="arabic-tool hadith-arabic" dir="rtl">{clean(h.arabic)}</p>}{h.english && <p className="hadith-english">{clean(h.english)}</p>}{h.grade && <small className="hadith-grade">{clean(h.grade)}</small>}</article>)}{!visible.length && <div className="tool-note">No Hadith matched your search in this book.</div>}{visible.length > 0 && !query && hadiths.length > visible.length && <div className="tool-note">Showing the first {visible.length} Hadiths. Use search to find a specific narration.</div>}</div>}
    <div className="hadith-source"><ExternalLink size={15}/> Source: Sunnah.com via HadithsJSONFormat · <a href="https://sunnah.com/" target="_blank" rel="noreferrer">Open Sunnah.com</a></div>
  </div>;
}
