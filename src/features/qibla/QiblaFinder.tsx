import { useEffect, useMemo, useState } from "react";
import { Compass, MapPin, Navigation } from "lucide-react";

type Props = {
  latitude: number | null;
  longitude: number | null;
};

const KAABA_LAT = 21.422487;
const KAABA_LON = 39.826206;

function radians(value: number) {
  return (value * Math.PI) / 180;
}

function degrees(value: number) {
  return (value * 180) / Math.PI;
}

function qiblaBearing(latitude: number, longitude: number) {
  const lat1 = radians(latitude);
  const lat2 = radians(KAABA_LAT);
  const deltaLon = radians(KAABA_LON - longitude);
  const y = Math.sin(deltaLon);
  const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(deltaLon);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

function distanceKm(latitude: number, longitude: number) {
  const radius = 6371;
  const dLat = radians(KAABA_LAT - latitude);
  const dLon = radians(KAABA_LON - longitude);
  const lat1 = radians(latitude);
  const lat2 = radians(KAABA_LAT);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function QiblaFinder({ latitude, longitude }: Props) {
  const [heading, setHeading] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");

  const bearing = useMemo(
    () => latitude !== null && longitude !== null ? qiblaBearing(latitude, longitude) : null,
    [latitude, longitude]
  );

  const distance = useMemo(
    () => latitude !== null && longitude !== null ? distanceKm(latitude, longitude) : null,
    [latitude, longitude]
  );

  useEffect(() => {
    if (!active) return;

    const onOrientation = (event: DeviceOrientationEvent) => {
      const sensor = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (typeof sensor.webkitCompassHeading === "number") {
        setHeading(sensor.webkitCompassHeading);
      } else if (typeof event.alpha === "number") {
        setHeading((360 - event.alpha) % 360);
      }
    };

    window.addEventListener("deviceorientation", onOrientation, true);
    return () => window.removeEventListener("deviceorientation", onOrientation, true);
  }, [active]);

  async function startCompass() {
    try {
      const deviceEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      };

      if (deviceEvent.requestPermission) {
        const permission = await deviceEvent.requestPermission();
        if (permission !== "granted") {
          setMessage("Compass permission denied. Bearing is still available.");
          return;
        }
      }

      setMessage("");
      setActive(true);
    } catch {
      setMessage("Compass unavailable. Use the bearing shown below.");
    }
  }

  const rotation = bearing !== null && heading !== null
    ? (bearing - heading + 360) % 360
    : bearing ?? 0;

  return (
    <section className="qibla-card">
      <div className="qibla-header">
        <div>
          <span className="section-kicker">QIBLA</span>
          <h3>Qibla Finder</h3>
        </div>
        <Compass size={24} />
      </div>

      <div className="qibla-compass">
        <span className="qibla-north">N</span>
        <span className="qibla-east">E</span>
        <span className="qibla-south">S</span>
        <span className="qibla-west">W</span>
        <div className="qibla-needle" style={{ transform: `translate(-50%, -100%) rotate(${rotation}deg)` }}>
          <Navigation size={34} />
          <span>🕋</span>
        </div>
        <div className="qibla-center" />
      </div>

      <div className="qibla-stats">
        <div>
          <span>Qibla bearing</span>
          <strong>{bearing === null ? "--" : `${bearing.toFixed(1)}°`}</strong>
        </div>
        <div>
          <span>Kaaba distance</span>
          <strong>{distance === null ? "--" : `${Math.round(distance)} km`}</strong>
        </div>
      </div>

      <button className="primary-button qibla-button" onClick={startCompass}>
        <Compass size={17} />
        {active ? "Compass Active" : "Use Live Compass"}
      </button>

      <div className="qibla-note">
        <MapPin size={15} />
        {latitude === null || longitude === null
          ? "Allow location access on the Prayer page first."
          : "Keep the phone flat and calibrate away from magnetic objects."}
      </div>

      {message && <div className="qibla-message">{message}</div>}
    </section>
  );
}
