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

export default function AndroidUiShell() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("quran");

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    localStorage.setItem("muslim-guide-theme", theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.dataset.resolvedTheme = theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    media.addEventListener?.("change", apply);
    return () => media.removeEventListener?.("change", apply);
  }, [theme]);

  useEffect(() => {
    let allowNextNavigation = false;

    const labelNavigation = () => {
      document.querySelectorAll<HTMLButtonElement>(".bottom-nav button").forEach((button) => {
        const text = button.querySelector("span");
        if (text?.textContent?.trim() === "Quran") text.textContent = "Quran & Hadith";
      });
    };

    const findNavButton = (label: string) =>
      Array.from(document.querySelectorAll<HTMLButtonElement>(".bottom-nav button")).find(
        (button) => button.querySelector("span")?.textContent?.trim() === label
      );

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>(".bottom-nav button");
      if (!button) return;

      const label = button.querySelector("span")?.textContent?.trim();
      if (!label) return;

      if (allowNextNavigation) {
        allowNextNavigation = false;
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      window.history.pushState({ muslimGuideNav: label }, "", window.location.href);

      if (label === "Quran & Hadith") {
        setLibraryTab("quran");
        setLibraryOpen(true);
        return;
      }

      allowNextNavigation = true;
      button.click();
    };

    const onPopState = () => {
      if (libraryOpen) {
        setLibraryOpen(false);
        return;
      }
      const previous = window.history.state?.muslimGuideNav;
      if (typeof previous === "string") {
        const previousButton = findNavButton(previous);
        if (previousButton) {
          allowNextNavigation = true;
          previousButton.click();
        }
      }
    };

    labelNavigation();
    const observer = new MutationObserver(labelNavigation);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    (window as Window & { __mgAllowQuranNavigation?: () => void }).__mgAllowQuranNavigation = () => {
      allowNextNavigation = true;
    };

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      delete (window as Window & { __mgAllowQuranNavigation?: () => void }).__mgAllowQuranNavigation;
    };
  }, [libraryOpen]);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) {
      const resolved = document.documentElement.dataset.resolvedTheme;
      meta.content = resolved === "dark" ? "#0b0d10" : "#0f766e";
    }
  }, [theme]);

  const openQuran = () => {
    setLibraryOpen(false);
    const quranButton = Array.from(document.querySelectorAll<HTMLButtonElement>(".bottom-nav button")).find(
      (button) => button.querySelector("span")?.textContent?.includes("Quran")
    );
    if (quranButton) {
      (window as Window & { __mgAllowQuranNavigation?: () => void }).__mgAllowQuranNavigation?.();
      quranButton.click();
    }
  };

  const closeLibrary = () => {
    setLibraryOpen(false);
    if (window.history.state?.muslimGuideNav) window.history.back();
  };

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
            ) : (
              <div className="android-hadith-wrap"><HadithExplorer /></div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
