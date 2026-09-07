import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export const PRAYERS: { key: PrayerKey; name: string }[] = [
  { key: "fajr", name: "Fajr" },
  { key: "dhuhr", name: "Dhuhr" },
  { key: "asr", name: "Asr" },
  { key: "maghrib", name: "Maghrib" },
  { key: "isha", name: "Isha" },
];

function calculationParams() {
  const method = typeof localStorage !== "undefined" ? localStorage.getItem("mg-calculation-method") : null;
  const madhab = typeof localStorage !== "undefined" ? localStorage.getItem("mg-madhab") : null;
  let params;
  switch (method) {
    case "Muslim World League": params = CalculationMethod.MuslimWorldLeague(); break;
    case "Egyptian": params = CalculationMethod.Egyptian(); break;
    case "Umm Al-Qura": params = CalculationMethod.UmmAlQura(); break;
    case "North America": params = CalculationMethod.NorthAmerica(); break;
    case "Moonsighting Committee": params = CalculationMethod.MoonsightingCommittee(); break;
    case "Karachi / South Asia":
    default: params = CalculationMethod.Karachi(); break;
  }
  params.madhab = madhab === "Shafi" ? Madhab.Shafi : Madhab.Hanafi;
  return params;
}

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
  const times = new PrayerTimes(new Coordinates(latitude, longitude), date, calculationParams());
  return { fajr: times.fajr, dhuhr: times.dhuhr, asr: times.asr, maghrib: times.maghrib, isha: times.isha };
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function findRamadanStart(anchor = new Date()) {
  const d = new Date(anchor); d.setHours(12, 0, 0, 0);
  for (let i = -420; i <= 420; i++) {
    const x = new Date(d); x.setDate(d.getDate() + i);
    const h = hijri(x);
    if (h.day === 1 && h.month.toLowerCase().includes("ramad")) return x;
  }
  return null;
}
