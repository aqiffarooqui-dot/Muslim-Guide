import React, { useEffect, useState } from "react";
import {
  MapPin,
  Pencil,
  Save,
  Clock3,
  CalendarDays,
  X,
} from "lucide-react";

type MasjidData = {
  name: string;
  address: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jumuah1: string;
  jumuah2: string;
};

const EMPTY: MasjidData = {
  name: "",
  address: "",
  fajr: "",
  dhuhr: "",
  asr: "",
  maghrib: "",
  isha: "",
  jumuah1: "",
  jumuah2: "",
};

const STORAGE_KEY = "muslim-guide-my-masjid";

export default function MasjidJamaatCard() {
  const [masjid, setMasjid] = useState<MasjidData>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MasjidData>(EMPTY);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as MasjidData;
        setMasjid({ ...EMPTY, ...parsed });
      }
    } catch {
      // Ignore invalid local data.
    }
  }, []);

  function startEditing() {
    setDraft(masjid);
    setEditing(true);
  }

  function saveMasjid() {
    const clean = {
      name: draft.name.trim(),
      address: draft.address.trim(),
      fajr: draft.fajr,
      dhuhr: draft.dhuhr,
      asr: draft.asr,
      maghrib: draft.maghrib,
      isha: draft.isha,
      jumuah1: draft.jumuah1,
      jumuah2: draft.jumuah2,
    };

    setMasjid(clean);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    setEditing(false);
  }

  function clearMasjid() {
    localStorage.removeItem(STORAGE_KEY);
    setMasjid(EMPTY);
    setDraft(EMPTY);
    setEditing(false);
  }

  const rows = [
    ["Fajr", masjid.fajr],
    ["Dhuhr", masjid.dhuhr],
    ["Asr", masjid.asr],
    ["Maghrib", masjid.maghrib],
    ["Isha", masjid.isha],
  ];

  if (editing) {
    return (
      <section className="masjid-jamaat-card">
        <div className="masjid-card-header">
          <div>
            <span className="eyebrow">MY MASJID</span>
            <h3>Masjid & Jamaat</h3>
          </div>

          <button
            className="icon-button"
            onClick={() => setEditing(false)}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="masjid-form">
          <label>
            <span>Masjid Name</span>
            <input
              value={draft.name}
              onChange={(e) =>
                setDraft({ ...draft, name: e.target.value })
              }
              placeholder="Enter your masjid name"
            />
          </label>

          <label>
            <span>Address / Area</span>
            <input
              value={draft.address}
              onChange={(e) =>
                setDraft({ ...draft, address: e.target.value })
              }
              placeholder="Enter masjid address"
            />
          </label>

          <div className="masjid-form-grid">
            {(
              [
                ["fajr", "Fajr Jamaat"],
                ["dhuhr", "Dhuhr Jamaat"],
                ["asr", "Asr Jamaat"],
                ["maghrib", "Maghrib Jamaat"],
                ["isha", "Isha Jamaat"],
                ["jumuah1", "Jumu'ah 1"],
                ["jumuah2", "Jumu'ah 2"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  type="time"
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [key]: e.target.value,
                    })
                  }
                />
              </label>
            ))}
          </div>

          <div className="masjid-form-actions">
            <button
              className="secondary-button"
              onClick={clearMasjid}
            >
              Clear
            </button>

            <button className="primary-button" onClick={saveMasjid}>
              <Save size={16} />
              Save Masjid
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!masjid.name) {
    return (
      <section className="masjid-jamaat-card masjid-empty-card">
        <div className="masjid-icon">
          <MapPin size={22} />
        </div>

        <div className="masjid-empty-content">
          <span className="eyebrow">MY MASJID</span>
          <h3>Add Your Masjid</h3>
          <p>
            Add your local masjid and enter its verified Jamaat and
            Jumu'ah timetable. The app will save it offline on this
            device.
          </p>

          <button className="primary-button" onClick={startEditing}>
            <Pencil size={16} />
            Add Masjid
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="masjid-jamaat-card">
      <div className="masjid-card-header">
        <div className="masjid-title-wrap">
          <div className="masjid-icon">
            <MapPin size={22} />
          </div>

          <div>
            <span className="eyebrow">MY MASJID</span>
            <h3>{masjid.name}</h3>
            {masjid.address && <p>{masjid.address}</p>}
          </div>
        </div>

        <button
          className="icon-button"
          onClick={startEditing}
          aria-label="Edit masjid"
        >
          <Pencil size={18} />
        </button>
      </div>

      <div className="jamaat-section">
        <div className="jamaat-section-title">
          <Clock3 size={17} />
          <strong>Jamaat / Iqamah</strong>
        </div>

        <div className="jamaat-grid">
          {rows.map(([name, time]) => (
            <div className="jamaat-row" key={name}>
              <span>{name}</span>
              <strong>{time || "Not set"}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="jumuah-section">
        <div className="jamaat-section-title">
          <CalendarDays size={17} />
          <strong>Jumu'ah</strong>
        </div>

        <div className="jumuah-grid">
          <div>
            <span>1st Jumu'ah</span>
            <strong>{masjid.jumuah1 || "Not set"}</strong>
          </div>

          <div>
            <span>2nd Jumu'ah</span>
            <strong>{masjid.jumuah2 || "Not set"}</strong>
          </div>
        </div>
      </div>

      <small className="masjid-data-note">
        Timings are entered from your local masjid timetable. Muslim
        Guide does not invent Jamaat timings.
      </small>
    </section>
  );
}
