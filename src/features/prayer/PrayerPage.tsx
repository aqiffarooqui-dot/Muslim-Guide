import React, { useEffect, useMemo, useState } from "react";
import {
  Coordinates,
  CalculationMethod,
  CalculationParameters,
  PrayerTimes,
  Madhab,
} from "adhan";
import {
  MapPin,
  Settings,
  ChevronDown,
  Navigation,
  Bell,
  BellOff,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Clock3,
  RefreshCw,
} from "lucide-react";

type CalculationMethodKey =
  | "karachi"
  | "mwl"
  | "egyptian"
  | "ummAlQura"
  | "northAmerica"
  | "moonsighting";

type PrayerRow = {
  key: string;
  name: string;
  arabic: string;
  time: Date;
  icon: React.ReactNode;
  secondary?: string;
};

const METHODS: Record<
  CalculationMethodKey,
  { label: string; create: () => CalculationParameters }
> = {
  karachi: {
    label: "Karachi / South Asia",
    create: () => CalculationMethod.Karachi(),
  },
  mwl: {
    label: "Muslim World League",
    create: () => CalculationMethod.MuslimWorldLeague(),
  },
  egyptian: {
    label: "Egyptian General Authority",
    create: () => CalculationMethod.Egyptian(),
  },
  ummAlQura: {
    label: "Umm Al-Qura, Makkah",
    create: () => CalculationMethod.UmmAlQura(),
  },
  northAmerica: {
    label: "North America",
    create: () => CalculationMethod.NorthAmerica(),
  },
  moonsighting: {
    label: "Moonsighting Committee",
    create: () => CalculationMethod.MoonsightingCommittee(),
  },
};

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function getHijriDate(date: Date) {
  return new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function getMinutesUntil(target: Date) {
  return Math.max(0, Math.round((target.getTime() - Date.now()) / 60000));
}

export default function PrayerPage() {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState("Detecting location...");
  const [locationLoading, setLocationLoading] = useState(false);

  const [methodKey, setMethodKey] =
    useState<CalculationMethodKey>("karachi");

  const [madhab, setMadhab] = useState<"shafi" | "hanafi">("hanafi");

  const [adjustments, setAdjustments] = useState({
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  });

  const [notifications, setNotifications] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    detectLocation();
  }, []);

  async function detectLocation() {
    if (!navigator.geolocation) {
      setLocationName("Location unavailable");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setLatitude(lat);
        setLongitude(lon);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
          );

          if (response.ok) {
            const data = await response.json();
            const address = data.address || {};
            const city =
              address.city ||
              address.town ||
              address.village ||
              address.municipality ||
              "Current location";

            setLocationName(city);
          } else {
            setLocationName("Current location");
          }
        } catch {
          setLocationName("Current location");
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationName("Location permission required");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  }

  const prayerTimes = useMemo(() => {
    if (latitude === null || longitude === null) return null;

    const coordinates = new Coordinates(latitude, longitude);
    const params = METHODS[methodKey].create();

    params.madhab =
      madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;

    const date = new Date();
    const times = new PrayerTimes(coordinates, date, params);

    return {
      fajr: new Date(times.fajr.getTime() + adjustments.fajr * 60000),
      sunrise: times.sunrise,
      dhuhr: new Date(times.dhuhr.getTime() + adjustments.dhuhr * 60000),
      asr: new Date(times.asr.getTime() + adjustments.asr * 60000),
      sunset: times.sunset,
      maghrib: new Date(
        times.maghrib.getTime() + adjustments.maghrib * 60000
      ),
      isha: new Date(times.isha.getTime() + adjustments.isha * 60000),
    };
  }, [latitude, longitude, methodKey, madhab, adjustments, now]);

  const prayers = useMemo<PrayerRow[]>(() => {
    if (!prayerTimes) return [];

    return [
      {
        key: "fajr",
        name: "Fajr",
        arabic: "الفجر",
        time: prayerTimes.fajr,
        icon: <Moon size={20} />,
      },
      {
        key: "sunrise",
        name: "Sunrise",
        arabic: "الشروق",
        time: prayerTimes.sunrise,
        icon: <Sunrise size={20} />,
      },
      {
        key: "dhuhr",
        name: "Dhuhr",
        arabic: "الظهر",
        time: prayerTimes.dhuhr,
        icon: <Sun size={20} />,
      },
      {
        key: "asr",
        name: "Asr",
        arabic: "العصر",
        time: prayerTimes.asr,
        icon: <Sun size={20} />,
      },
      {
        key: "maghrib",
        name: "Maghrib",
        arabic: "المغرب",
        time: prayerTimes.maghrib,
        icon: <Sunset size={20} />,
      },
      {
        key: "isha",
        name: "Isha",
        arabic: "العشاء",
        time: prayerTimes.isha,
        icon: <Moon size={20} />,
      },
    ];
  }, [prayerTimes]);

  const nextPrayer = useMemo(() => {
    const current = Date.now();

    return (
      prayers.find((prayer) => prayer.time.getTime() > current) ||
      prayers[0] ||
      null
    );
  }, [prayers, now]);

  const countdown = useMemo(() => {
    if (!nextPrayer) return "";

    const totalSeconds = Math.max(
      0,
      Math.floor((nextPrayer.time.getTime() - Date.now()) / 1000)
    );

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }, [nextPrayer, now]);

  function updateAdjustment(
    key: keyof typeof adjustments,
    value: number
  ) {
    setAdjustments((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="page prayer-page">
      <div className="page-header">
        <div>
          <div className="eyebrow">SALAH</div>
          <h1>Prayer Times</h1>
          <p>{formatDate(new Date())}</p>
          <p>{getHijriDate(new Date())}</p>
        </div>

        <button
          className="icon-button"
          onClick={() => setShowSettings((value) => !value)}
          aria-label="Prayer settings"
        >
          <Settings size={20} />
        </button>
      </div>

      <div className="prayer-location-card">
        <div className="prayer-location-main">
          <MapPin size={20} />
          <div>
            <strong>{locationName}</strong>
            {latitude !== null && longitude !== null && (
              <small>
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </small>
            )}
          </div>
        </div>

        <button
          className="secondary-button"
          onClick={detectLocation}
          disabled={locationLoading}
        >
          <RefreshCw size={16} />
          {locationLoading ? "Detecting" : "Refresh"}
        </button>
      </div>

      {nextPrayer && (
        <section className="next-prayer-card">
          <div>
            <span>Next Prayer</span>
            <h2>{nextPrayer.name}</h2>
            <div className="next-prayer-arabic">
              {nextPrayer.arabic}
            </div>
          </div>

          <div className="next-prayer-time">
            <strong>{formatTime(nextPrayer.time)}</strong>
            <small>{countdown}</small>
          </div>
        </section>
      )}

      <section className="prayer-list-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">TODAY</span>
            <h2>Namaz Times</h2>
          </div>

          <span className="method-badge">
            {METHODS[methodKey].label}
          </span>
        </div>

        <div className="prayer-rows">
          {prayers.map((prayer) => {
            const isNext =
              nextPrayer?.key === prayer.key &&
              prayer.time.getTime() > Date.now();

            return (
              <div
                key={prayer.key}
                className={`prayer-row ${
                  isNext ? "prayer-row-next" : ""
                }`}
              >
                <div className="prayer-row-icon">{prayer.icon}</div>

                <div className="prayer-row-name">
                  <strong>{prayer.name}</strong>
                  <span>{prayer.arabic}</span>
                </div>

                <div className="prayer-row-time">
                  {formatTime(prayer.time)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="special-times-grid">
        <div className="special-time-card">
          <Clock3 size={18} />
          <span>Sehri End</span>
          <strong>
            {prayerTimes
              ? formatTime(
                  new Date(prayerTimes.fajr.getTime() - 10 * 60000)
                )
              : "--:--"}
          </strong>
          <small>10 min before Fajr</small>
        </div>

        <div className="special-time-card">
          <Sunset size={18} />
          <span>Iftar</span>
          <strong>
            {prayerTimes ? formatTime(prayerTimes.maghrib) : "--:--"}
          </strong>
          <small>At Maghrib</small>
        </div>
      </section>

      <section className="masjid-placeholder-card">
        <div className="masjid-icon">
          <Navigation size={22} />
        </div>

        <div>
          <span className="eyebrow">MY MASJID</span>
          <h3>Masjid & Jamaat Times</h3>
          <p>
            Jamaat/Iqamah timings will come from a verified masjid
            timetable. They are not automatically guessed.
          </p>
        </div>

        <ChevronDown size={18} />
      </section>

      <section className="reminder-card">
        <div className="reminder-icon">
          {notifications ? <Bell size={20} /> : <BellOff size={20} />}
        </div>

        <div className="reminder-content">
          <strong>Prayer Reminders</strong>
          <span>
            {notifications
              ? "Notifications are enabled"
              : "Notifications are disabled"}
          </span>
        </div>

        <button
          className={`toggle-button ${
            notifications ? "toggle-active" : ""
          }`}
          onClick={() => setNotifications((value) => !value)}
          aria-label="Toggle prayer reminders"
        >
          <span />
        </button>
      </section>

      {showSettings && (
        <section className="prayer-settings-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CALCULATION</span>
              <h2>Prayer Settings</h2>
            </div>
          </div>

          <label className="settings-field">
            <span>Calculation Method</span>
            <select
              value={methodKey}
              onChange={(event) =>
                setMethodKey(
                  event.target.value as CalculationMethodKey
                )
              }
            >
              {Object.entries(METHODS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>Asr Juristic Method</span>
            <select
              value={madhab}
              onChange={(event) =>
                setMadhab(event.target.value as "shafi" | "hanafi")
              }
            >
              <option value="hanafi">Hanafi — 2× shadow</option>
              <option value="shafi">Standard — 1× shadow</option>
            </select>
          </label>

          <div className="adjustments-heading">
            <span>Minute Adjustments</span>
            <small>Use only if your local timetable requires it.</small>
          </div>

          {(
            [
              ["fajr", "Fajr"],
              ["dhuhr", "Dhuhr"],
              ["asr", "Asr"],
              ["maghrib", "Maghrib"],
              ["isha", "Isha"],
            ] as const
          ).map(([key, label]) => (
            <div className="adjustment-row" key={key}>
              <span>{label}</span>

              <div className="adjustment-controls">
                <button
                  onClick={() =>
                    updateAdjustment(
                      key,
                      adjustments[key] - 1
                    )
                  }
                >
                  −
                </button>

                <strong>
                  {adjustments[key] > 0 ? "+" : ""}
                  {adjustments[key]} min
                </strong>

                <button
                  onClick={() =>
                    updateAdjustment(
                      key,
                      adjustments[key] + 1
                    )
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}

          <p className="settings-note">
            Prayer start times are calculated locally from astronomical
            coordinates. Jamaat/Iqamah times must be supplied by the
            selected masjid.
          </p>
        </section>
      )}

      <div className="prayer-disclaimer">
        Calculation-based timings can differ from a local masjid
        timetable. For Jamaat/Iqamah, follow your verified local
        masjid schedule.
      </div>
    </div>
  );
}
