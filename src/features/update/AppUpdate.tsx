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
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [release, setRelease] = useState<Release | null>(null);
  const [message, setMessage] = useState("You’re using the latest version.");

  const check = async () => {
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
        setMessage("You’re using the latest version.");
      }
    } catch {
      setMessage("Couldn’t check for updates. Please try again when online.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { void check(); }, []);

  const apk = release?.assets?.find(asset => asset.name?.toLowerCase().endsWith(".apk"));
  const updateUrl = apk?.browser_download_url || release?.html_url;

  const startUpdate = async () => {
    if (!updateUrl) return;
    if (!apk || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      window.open(updateUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setInstalling(true);
    setMessage("Downloading the update…");
    try {
      const result = await NativeAppUpdater.install({ url: updateUrl });
      if (result?.needsPermission) {
        setMessage("Allow installs from Muslim Guide in Android settings, then tap Update again.");
      } else {
        setMessage("Update downloaded. Android will now open the installer.");
      }
    } catch {
      setMessage("Couldn’t start the update. Please try again.");
    } finally {
      setInstalling(false);
    }
  };

  return <div className="tool-page">
    <div className="tool-hero">
      <div><span>APP UPDATE</span><h2>Muslim Guide</h2><p>Current version: v{VERSION}</p></div>
    </div>
    <div className="tool-note">{message}</div>
    {release && <>
      <div className="tool-note">
        <strong>{release.name || release.tag_name}</strong>
        {release.body ? <p>{release.body}</p> : null}
      </div>
      <button className="primary-tool-button" onClick={() => void startUpdate()} disabled={!updateUrl || installing}>
        {installing ? "Preparing update…" : apk ? "Update now" : "View update"}
      </button>
    </>}
    <button className="primary-tool-button" onClick={() => void check()} disabled={checking || installing}>
      {checking ? "Checking…" : "Check for updates"}
    </button>
  </div>;
}
