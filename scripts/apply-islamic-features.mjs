import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appPath = path.join(root, "src", "App.tsx");
const mainPath = path.join(root, "src", "main.tsx");
const app = fs.readFileSync(appPath, "utf8");
let next = app;

if (!next.includes('IslamicToolsPage from "./features/islamic/IslamicToolsPage"')) {
  next = next.replace(
    'import PrayerPage from "./features/prayer/PrayerPage";',
    'import PrayerPage from "./features/prayer/PrayerPage";\nimport IslamicToolsPage from "./features/islamic/IslamicToolsPage";'
  );
}

next = next.replace('type Page = "home" | "quran" | "prayer" | "ai" | "more";', 'type Page = "home" | "quran" | "prayer" | "ai" | "more" | "tools";');

if (!next.includes('case "tools":')) {
  next = next.replace('      case "more":\n        return <MorePage />;', '      case "more":\n        return <MorePage onNavigate={setActivePage} />;\n\n      case "tools":\n        return <IslamicToolsPage />;');
}

next = next.replace('function MorePage() {', 'function MorePage({ onNavigate }: { onNavigate: (page: Page) => void }) {');
next = next.replace('<button className="more-item" key={item.title}>', '<button className="more-item" key={item.title} onClick={() => onNavigate("tools")}>');

fs.writeFileSync(appPath, next);

const main = fs.readFileSync(mainPath, "utf8");
if (!main.includes("registerOffline")) {
  fs.writeFileSync(mainPath, main.replace(/^(.*)$/m, '$1\nimport { registerOffline } from "./offline/registerOffline";\nregisterOffline();'));
}

const offlineDir = path.join(root, "src", "offline");
fs.mkdirSync(offlineDir, { recursive: true });
fs.writeFileSync(path.join(offlineDir, "registerOffline.ts"), `export function registerOffline() {\n  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;\n  window.addEventListener("load", () => {\n    navigator.serviceWorker.register("/sw.js").catch(() => {});\n  });\n}\n`);

const publicDir = path.join(root, "public");
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, "sw.js"), `const CACHE = "muslim-guide-offline-v1";\nconst CORE = ["/", "/index.html"];\nself.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())); });\nself.addEventListener("activate", event => { event.waitUntil(self.clients.claim()); });\nself.addEventListener("fetch", event => {\n  if (event.request.method !== "GET") return;\n  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {\n    const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;\n  }).catch(() => caches.match("/index.html"))));\n});\n`);

console.log("Islamic features integrated: Qibla, Ramadan 30-day calendar, Hijri calendar, notification preference and offline cache.");
