import { useEffect, useState } from "react";
import { BookOpen, Moon, Sun, X, ArrowLeft } from "lucide-react";
import HadithExplorer from "./HadithExplorer";
import "./android-ui.css";

type LibraryTab = "quran" | "hadith";
type Theme = "system" | "light" | "dark";

function getInitialTheme(): Theme {
  const saved = localStorage.getItem("muslim-guide-theme");
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

function syncStatusBar(resolved: "light" | "dark") {
  const root = document.documentElement;
  const dark = resolved === "dark";
  const background = dark ? "#0b0d10" : "#f5f7f6";

  root.dataset.statusBar = resolved;
  root.style.setProperty("--mg-status-bar-bg", background);

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = background;

  let colorScheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!colorScheme) {
    colorScheme = document.createElement("meta");
    colorScheme.name = "color-scheme";
    document.head.appendChild(colorScheme);
  }
  colorScheme.content = dark ? "dark" : "light";

  // Capacitor Android reads these CSS/HTML signals for the WebView surface.
  // The native layer is also updated when available, without making web builds depend on it.
  const nativeWindow = window as Window & {
    Capacitor?: { Plugins?: { StatusBar?: { setStyle?: (options: { style: string }) => Promise<unknown> | unknown; setBackgroundColor?: (options: { color: string }) => Promise<unknown> | unknown } } };
  };
  const statusBar = nativeWindow.Capacitor?.Plugins?.StatusBar;
  if (statusBar?.setStyle) {
    void statusBar.setStyle({ style: dark ? "DARK" : "LIGHT" });
  }
  if (statusBar?.setBackgroundColor) {
    void statusBar.setBackgroundColor({ color: background });
  }
}

export default function AndroidUiShell() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("quran");

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      root.dataset.resolvedTheme = resolved;
      syncStatusBar(resolved);
    };
    apply();
    media.addEventListener?.("change", apply);
    localStorage.setItem("muslim-guide-theme", theme);
    return () => media.removeEventListener?.("change", apply);
  }, [theme]);

  useEffect(() => {
    const openTool = (tool: string) => {
      window.dispatchEvent(new CustomEvent("muslim-guide:open-tool", { detail: tool }));
    };
    const quickAccess = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>(".quick-grid button");
      if (!button) return;
      const label = button.textContent?.trim().toLowerCase() || "";
      if (label.includes("quran")) {
        const quran = Array.from(document.querySelectorAll<HTMLButtonElement>(".bottom-nav button"))
          .find((b) => b.querySelector("span")?.textContent?.trim().toLowerCase().includes("quran"));
        if (quran) quran.click();
        return;
      }
      const map: Record<string, string> = { hadith: "hadith", duas: "duas", qibla: "qibla", tasbeeh: "tasbeeh", calendar: "calendar", ramadan: "ramadan" };
      const key = Object.keys(map).find((name) => label.includes(name));
      if (key) openTool(map[key]);
    };
    document.addEventListener("click", quickAccess, true);
    return () => document.removeEventListener("click", quickAccess, true);
  }, []);

  useEffect(() => {
    const installToolsButton = () => {
      const nav = document.querySelector<HTMLElement>(".bottom-nav");
      if (!nav || nav.querySelector(".mg-tools-nav-button")) return !!nav;
      const tools = document.createElement("button");
      tools.type = "button";
      tools.className = "mg-tools-nav-button";
      tools.setAttribute("aria-label", "Open Islamic Tools");
      tools.innerHTML = '<span class="mg-tools-nav-icon" aria-hidden="true">⌁</span><span>Tools</span>';
      tools.addEventListener("click", () => openTool("qibla"));
      nav.appendChild(tools);
      return true;
    };
    if (installToolsButton()) return;
    const observer = new MutationObserver(() => {
      if (installToolsButton()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const openTool = (tool: string) => window.dispatchEvent(new CustomEvent("muslim-guide:open-tool", { detail: tool }));
  const openQuran = () => {
    setLibraryOpen(false);
    const quranButton = Array.from(document.querySelectorAll<HTMLButtonElement>(".bottom-nav button"))
      .find((button) => button.querySelector("span")?.textContent?.toLowerCase().includes("quran"));
    quranButton?.click();
  };
  const closeLibrary = () => setLibraryOpen(false);

  return (
    <>
      <div className="android-ui-toolbar" aria-label="Theme controls">
        <button className="android-theme-pill" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle day and night mode">
          {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
          <span>{theme === "dark" ? "Night" : "Day"}</span>
        </button>
      </div>
      {libraryOpen && (
        <div className="quran-hadith-overlay" role="dialog" aria-modal="true" aria-label="Quran and Hadith">
          <div className="quran-hadith-sheet">
            <header className="quran-hadith-header">
              <div className="quran-hadith-title-row">
                <button className="android-close-button android-back-button" onClick={closeLibrary} aria-label="Back"><ArrowLeft size={20} /></button>
                <div><span className="android-eyebrow">ISLAMIC LIBRARY</span><h2>Quran &amp; Hadith</h2></div>
              </div>
              <button className="android-close-button" onClick={closeLibrary} aria-label="Close"><X size={21} /></button>
            </header>
            <div className="android-segmented-control" role="tablist">
              <button className={libraryTab === "quran" ? "selected" : ""} onClick={() => setLibraryTab("quran")}><BookOpen size={17} /> Quran</button>
              <button className={libraryTab === "hadith" ? "selected" : ""} onClick={() => setLibraryTab("hadith")}>📚 Hadith</button>
            </div>
            {libraryTab === "quran" ? (
              <section className="android-library-card">
                <div className="android-library-icon"><BookOpen size={28} /></div>
                <span className="android-eyebrow">THE HOLY QURAN</span>
                <h3>Read the Quran</h3>
                <p>Arabic text with English, Hindi and Urdu translations, bookmarks and continue-reading support.</p>
                <button className="android-primary-pill" onClick={openQuran}>Open Quran</button>
              </section>
            ) : <div className="android-hadith-wrap"><HadithExplorer /></div>}
          </div>
        </div>
      )}
    </>
  );
}
