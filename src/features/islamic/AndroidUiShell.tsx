import { useEffect, useState } from "react";
import { BookOpen, Moon, Sun, X, ArrowLeft } from "lucide-react";
import HadithExplorer from "./HadithExplorer";
import "./android-ui.css";

type LibraryTab = "quran" | "hadith";
type Theme = "system" | "light" | "dark";

const DAILY_REMINDERS = [
  { text: "Indeed, in the remembrance of Allah do hearts find rest.", source: "Quran 13:28", type: "QURAN" },
  { text: "The most beloved deeds to Allah are those that are consistent, even if small.", source: "Sahih al-Bukhari 6464", type: "HADITH" },
  { text: "Whoever believes in Allah and the Last Day should speak good or remain silent.", source: "Sahih al-Bukhari 6018", type: "HADITH" },
  { text: "So remember Me; I will remember you. And be grateful to Me and do not deny Me.", source: "Quran 2:152", type: "QURAN" },
  { text: "Allah does not look at your bodies or your forms, but He looks at your hearts and deeds.", source: "Sahih Muslim 2564", type: "HADITH" },
];

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
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      root.dataset.resolvedTheme = resolved;
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta) meta.content = resolved === "dark" ? "#0b0d10" : "#f5f7f6";
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
      const nav = document.querySelector<HTMLElement>(".bottom-nav");
      if (nav && !nav.querySelector(".mg-tools-nav-button")) {
        const tools = document.createElement("button");
        tools.type = "button";
        tools.className = "mg-tools-nav-button";
        tools.setAttribute("aria-label", "Open Islamic Tools");
        tools.innerHTML = '<span class="mg-tools-nav-icon" aria-hidden="true">⌁</span><span>Tools</span>';
        tools.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          window.dispatchEvent(new CustomEvent("muslim-guide:open-tool", { detail: "qibla" }));
        });
        nav.appendChild(tools);
      }
    };
    const findNavButton = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>(".bottom-nav button")).find((button) => button.querySelector("span")?.textContent?.trim() === label);
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>(".bottom-nav button");
      if (!button || button.classList.contains("mg-tools-nav-button")) return;
      const label = button.querySelector("span")?.textContent?.trim();
      if (!label) return;
      if (allowNextNavigation) { allowNextNavigation = false; return; }
      event.preventDefault();
      event.stopPropagation();
      window.history.pushState({ muslimGuideNav: label }, "", window.location.href);
      if (label === "Quran & Hadith") { setLibraryTab("quran"); setLibraryOpen(true); return; }
      allowNextNavigation = true;
      button.click();
    };
    const onPopState = () => {
      if (libraryOpen) { setLibraryOpen(false); return; }
      const previous = window.history.state?.muslimGuideNav;
      if (typeof previous === "string") {
        const previousButton = findNavButton(previous);
        if (previousButton) { allowNextNavigation = true; previousButton.click(); }
      }
    };
    labelNavigation();
    const observer = new MutationObserver(labelNavigation);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    (window as Window & { __mgAllowQuranNavigation?: () => void }).__mgAllowQuranNavigation = () => { allowNextNavigation = true; };
    return () => { observer.disconnect(); document.removeEventListener("click", onClick, true); window.removeEventListener("popstate", onPopState); delete (window as Window & { __mgAllowQuranNavigation?: () => void }).__mgAllowQuranNavigation; };
  }, [libraryOpen]);

  useEffect(() => {
    let reminderIndex = Math.floor(Date.now() / 86400000) % DAILY_REMINDERS.length;
    let timer: number | undefined;
    let frame: number | undefined;
    const renderReminder = () => {
      const card = document.querySelector<HTMLElement>(".reminder-card");
      if (!card) return;
      const reminder = DAILY_REMINDERS[reminderIndex];
      card.dataset.dynamicReminder = "true";
      card.innerHTML = `<div class="dynamic-reminder-icon" aria-hidden="true">${reminder.type === "QURAN" ? "۞" : "ﷺ"}</div><div class="dynamic-reminder-content"><div class="dynamic-reminder-meta"><span>DAILY REMINDER</span><span>${reminder.type}</span></div><p>${reminder.text}</p><strong>${reminder.source}</strong></div>`;
    };
    const moveReminderUp = () => {
      const reminder = document.querySelector<HTMLElement>(".reminder-card");
      const quickSection = Array.from(document.querySelectorAll<HTMLElement>("section")).find((section) => section.querySelector("h2")?.textContent?.trim() === "Quick Access");
      if (reminder && quickSection && reminder.parentElement === quickSection.parentElement) quickSection.parentElement.insertBefore(reminder, quickSection);
    };
    const sync = () => { renderReminder(); moveReminderUp(); };
    sync();
    frame = window.requestAnimationFrame(sync);
    timer = window.setInterval(() => { reminderIndex = (reminderIndex + 1) % DAILY_REMINDERS.length; renderReminder(); }, 86400000);
    const observer = new MutationObserver(() => { if (!document.querySelector(".reminder-card[data-dynamic-reminder='true']")) sync(); moveReminderUp(); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { if (timer) window.clearInterval(timer); if (frame) window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  const openQuran = () => {
    setLibraryOpen(false);
    const quranButton = Array.from(document.querySelectorAll<HTMLButtonElement>(".bottom-nav button")).find((button) => button.querySelector("span")?.textContent?.includes("Quran"));
    if (quranButton) { (window as Window & { __mgAllowQuranNavigation?: () => void }).__mgAllowQuranNavigation?.(); quranButton.click(); }
  };
  const closeLibrary = () => { setLibraryOpen(false); if (window.history.state?.muslimGuideNav) window.history.back(); };

  return <>
    <div className="android-ui-toolbar" aria-label="Theme controls"><button className="android-theme-pill" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle day and night mode">{theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}<span>{theme === "dark" ? "Night" : "Day"}</span></button></div>
    {libraryOpen && <div className="quran-hadith-overlay" role="dialog" aria-modal="true" aria-label="Quran and Hadith"><div className="quran-hadith-sheet"><header className="quran-hadith-header"><div className="quran-hadith-title-row"><button className="android-close-button android-back-button" onClick={closeLibrary} aria-label="Back"><ArrowLeft size={20} /></button><div><span className="android-eyebrow">ISLAMIC LIBRARY</span><h2>Quran &amp; Hadith</h2></div></div><button className="android-close-button" onClick={closeLibrary} aria-label="Close"><X size={21} /></button></header><div className="android-segmented-control" role="tablist"><button className={libraryTab === "quran" ? "selected" : ""} onClick={() => setLibraryTab("quran")}><BookOpen size={17} /> Quran</button><button className={libraryTab === "hadith" ? "selected" : ""} onClick={() => setLibraryTab("hadith")}>📚 Hadith</button></div>{libraryTab === "quran" ? <section className="android-library-card"><div className="android-library-icon"><BookOpen size={28} /></div><span className="android-eyebrow">THE HOLY QURAN</span><h3>Read the Quran</h3><p>Arabic text with English, Hindi and Urdu translations, bookmarks and continue-reading support.</p><button className="android-primary-pill" onClick={openQuran}>Open Quran</button></section> : <div className="android-hadith-wrap"><HadithExplorer /></div>}</div></div>}
  </>;
}
