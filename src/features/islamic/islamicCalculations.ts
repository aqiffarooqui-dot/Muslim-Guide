import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export const PRAYERS: { key: PrayerKey; name: string }[] = [
  { key: "fajr", name: "Fajr" },
  { key: "dhuhr", name: "Dhuhr" },
  { key: "asr", name: "Asr" },
  { key: "maghrib", name: "Maghrib" },
  { key: "isha", name: "Isha" },
];

export function hijri(date: Date) {
  try {
    const p = new Intl.DateTimeFormat("en-IN-u-ca-islamic-umalqura", {
      day: "numeric", month: "long", year: "numeric",
    }).formatToParts(date);
    return {
      day: Number(p.find(x => x.type === "day")?.value || 0),
      month: p.find(x => x.type === "month")?.value || "",
      year: Number(p.find(x => x.type === "year")?.value || 0),
    };
  } catch { return { day: 0, month: "", year: 0 }; }
}

export function prayerTimesForDate(latitude: number, longitude: number, date: Date) {
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;
  const times = new PrayerTimes(new Coordinates(latitude, longitude), date, params);
  return {
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function findRamadanStart(anchor = new Date()) {
  const d = new Date(anchor);
  d.setHours(12, 0, 0, 0);
  for (let i = -420; i <= 420; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    const h = hijri(x);
    if (h.day === 1 && h.month.toLowerCase().includes("ramad")) return x;
  }
  return null;
}
