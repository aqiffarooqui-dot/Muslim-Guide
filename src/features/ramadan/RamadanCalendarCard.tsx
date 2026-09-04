import { useMemo } from "react";

type Props = {
  fajr: Date | null;
  maghrib: Date | null;
};

function formatTime(date: Date | null) {
  if (!date) return "--:--";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function RamadanCalendarCard({
  fajr,
  maghrib,
}: Props) {
  const hijriDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        calendar: "islamic-umalqura",
      }).format(new Date());
    } catch {
      return "Hijri date unavailable";
    }
  }, []);

  const gregorianDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <section className="ramadan-calendar-card">
      <div className="ramadan-card-header">
        <div>
          <span className="section-kicker">ISLAMIC CALENDAR</span>
          <h3>Ramadan & Daily Timings</h3>
        </div>

        <div className="ramadan-moon">☾</div>
      </div>

      <div className="islamic-date-box">
        <strong>{hijriDate}</strong>
        <span>{gregorianDate}</span>
      </div>

      <div className="ramadan-times-grid">
        <div className="ramadan-time-item">
          <span>🌙 Sehri Ends</span>
          <strong>{formatTime(fajr)}</strong>
          <small>Fajr start</small>
        </div>

        <div className="ramadan-time-item">
          <span>🌅 Iftar</span>
          <strong>{formatTime(maghrib)}</strong>
          <small>Maghrib time</small>
        </div>
      </div>

      <div className="ramadan-note">
        Sehri/Iftar timings astronomical calculation se hain.
        Ramadan me local masjid timetable ko priority dein.
      </div>
    </section>
  );
}