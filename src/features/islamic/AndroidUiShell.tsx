import { useEffect, useState } from "react";
import { BookOpen, Moon, Sun, X, ArrowLeft } from "lucide-react";
import HadithExplorer from "./HadithExplorer";
import "./android-ui.css";

type LibraryTab = "quran" | "hadith";
type Theme = "system" | "light" | "dark";

type NavPage = "home" | "quran" | "prayer" | "ai" | "more";

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
}

function navPageFromButton(button: HTMLButtonElement): NavPage | null {
  const label = button.textContent?.trim().toLowerCase() || "";
  if (label.includes("home")) return "home";
  if (label.includes("quran")) return "quran";
  if (label.includes("prayer")) return "prayer";
  if (label === "ai" || label.includes(" ai")) return "ai";
  if (label.includes("more")) return "more";
  return null;
}

function clickNavPage(page: NavPage) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".bottom-nav button"));
  const target = buttons.find((button) => navPageFromButton(button) === page);
  target?.click();
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

  // Keep React's page state and the browser/Android history stack in sync.
  // Android edge-back gestures and the system back button both surface as popstate.
  useEffect(() => {
    const stateKey = "muslim-guide-page";
    let syncing = false;

    const currentPage = (): NavPage => {
      const active = document.querySelector<HTMLButtonElement>(".bottom-nav button.active");
      return active ? (navPageFromButton(active) || "home") : "home";
    };

    if (!(history.state && history.state[stateKey])) {
      history.replaceState({ ...(history.state || {}), [stateKey]: currentPage() }, "", location.href);
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>(".bottom-nav button");
      if (!button) return;
      const page = navPageFromButton(button);
      if (!page || syncing) return;
      const previous = history.state?.[stateKey];
      if (previous === page) return;
      history.pushState({ ...(history.state || {}), [stateKey]: page }, "", location.href);
    };

    const onPopState = () => {
      const page = (history.state?.[stateKey] as NavPage | undefined) || "home";
      syncing = true;
      window.setTimeout(() => {
        clickNavPage(page);
        syncing = false;
      }, 0);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

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
        clickNavPage("quran");
        return;
      }
      const map: Record<string, string> = { hadith: "hadith", duas: "duas", qibla: "qibla", tasbeeh: "tasbeeh", calendar: "calendar", ramadan: "ramadan" };
      const key = Object.keys(map).find((name) => label.includes(name));
      if (key) openTool(map[key]);
    };
    document.addEventListener("click", quickAccess, true);
    return () => document.removeEventListener("click", quickAccess, true);
  }, []);

  const openTool = (tool: string) => window.dispatchEvent(new CustomEvent("muslim-guide:open-tool", { detail: tool }));

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

  const openQuran = () => {
    setLibraryOpen(false);
    clickNavPage("quran");
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
