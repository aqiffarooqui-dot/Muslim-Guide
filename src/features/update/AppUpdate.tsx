import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { NativeAppUpdater } from "./nativeAppUpdater";

const UPDATE_URL = "https://api.github.com/repos/aqiffarooqui-dot/Muslim-Guide/releases/latest";
const VERSION = import.meta.env.VITE_APP_VERSION || "0.1.0";

type Release = {
  tag_name?: string;
  html_url?: string;
  name?: string;
  body?: string;
  assets?: Array<{ name?: string; browser_download_url?: string }>;
};

function normalize(v: string) {
  return v.replace(/^v/i, "").split(".").map(Number).map(x => Number.isFinite(x) ? x : 0);
}

function newer(latest: string, current: string) {
  const a = normalize(latest), b = normalize(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

export default function AppUpdate() {
  const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [release, setRelease] = useState<Release | null>(null);
  const [message, setMessage] = useState("");

  const check = async () => {
    if (!isAndroid) return;
    setChecking(true);
    try {
      const response = await fetch(UPDATE_URL, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("update check failed");
      const data = await response.json() as Release;
      const latest = data.tag_name || "";
      if (latest && newer(latest, VERSION)) {
        setRelease(data);
        setMessage(`New version ${latest.replace(/^v/i, "v")} is available.`);
      } else {
        setRelease(null);
        setMessage("");
      }
    } catch {
      setMessage("Couldn’t check for updates. Please try again later.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!isAndroid) return;
    void check();
    const timer = window.setInterval(() => void check(), 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [isAndroid]);

  if (!isAndroid || !release) return null;

  const apk = release.assets?.find(asset => asset.name?.toLowerCase().endsWith(".apk"));
  const updateUrl = apk?.browser_download_url || release.html_url;

  const startUpdate = async () => {
    if (!updateUrl) return;
    setInstalling(true);
    setMessage("Downloading the update…");
    try {
      if (!apk || !Capacitor.isPluginAvailable("AppUpdater")) {
        window.open(updateUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const result = await NativeAppUpdater.install({ url: updateUrl });
      if (result?.needsPermission) {
        setMessage("Allow installs from Muslim Guide in Android settings, then tap Update again.");
      } else {
        setMessage("Update downloaded. Android is opening the installer…");
      }
    } catch {
      setMessage("Couldn’t start the update. Please try again.");
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 16, left: 16, right: 16, zIndex: 99999, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ width: "min(520px, 100%)", borderRadius: 20, padding: 16, background: "rgba(15,23,42,.97)", color: "white", boxShadow: "0 18px 50px rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.12)", pointerEvents: "auto" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", opacity: .7 }}>MUSLIM GUIDE UPDATE</div>
        <div style={{ marginTop: 5, fontSize: 18, fontWeight: 800 }}>{release.name || release.tag_name}</div>
        <div style={{ marginTop: 4, fontSize: 13, opacity: .8 }}>{message || `Current version: v${VERSION}`}</div>
        {release.body ? <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.4, opacity: .78, maxHeight: 70, overflow: "auto" }}>{release.body}</div> : null}
        <button onClick={() => void startUpdate()} disabled={!updateUrl || installing} style={{ marginTop: 12, width: "100%", border: 0, borderRadius: 12, padding: "12px 14px", fontWeight: 800, cursor: installing ? "wait" : "pointer" }}>
          {installing ? "Preparing update…" : apk ? "Update now" : "View update"}
        </button>
        <button onClick={() => setRelease(null)} style={{ marginTop: 7, width: "100%", border: 0, background: "transparent", color: "rgba(255,255,255,.65)", padding: 6, cursor: "pointer" }}>
          Later
        </button>
      </div>
    </div>
  );
}
