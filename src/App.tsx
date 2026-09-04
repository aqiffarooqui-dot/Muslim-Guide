import React, { useMemo, useState } from "react";
import {
  Home,
  BookOpen,
  Clock3,
  Sparkles,
  MoreHorizontal,
  Search,
  MapPin,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Sun,
  Moon,
  Languages,
  Settings,
  Heart,
  Compass,
  BookMarked,
  CircleDot,
  CalendarDays,
  X,
} from "lucide-react";

import quranArabicRaw from "./data/quran-uthmani.txt?raw";
import quranEnglishRaw from "./data/quran-en-saheeh.txt?raw";
import quranHindiRaw from "./data/quran-hi-farooq-nadwi.txt?raw";
import quranUrduRaw from "./data/quran-ur-jalandhry.txt?raw";
import PrayerPage from "./features/prayer/PrayerPage";

type Page = "home" | "quran" | "prayer" | "ai" | "more";

type QuranLanguage = "urdu" | "hindi" | "english";

type Surah = {
  number: number;
  arabic: string;
  transliteration: string;
  english: string;
  ayahs: number;
  revelation: string;
};

type QuranAyah = {
  surah: number;
  ayah: number;
  text: string;
};

const surahs: Surah[] = [
  { number: 1, arabic: "الفاتحة", transliteration: "Al-Fatihah", english: "The Opening", ayahs: 7, revelation: "Makkah" },
  { number: 2, arabic: "البقرة", transliteration: "Al-Baqarah", english: "The Cow", ayahs: 286, revelation: "Madinah" },
  { number: 3, arabic: "آل عمران", transliteration: "Aal-E-Imran", english: "Family of Imran", ayahs: 200, revelation: "Madinah" },
  { number: 4, arabic: "النساء", transliteration: "An-Nisa", english: "The Women", ayahs: 176, revelation: "Madinah" },
  { number: 5, arabic: "المائدة", transliteration: "Al-Ma'idah", english: "The Table Spread", ayahs: 120, revelation: "Madinah" },
  { number: 6, arabic: "الأنعام", transliteration: "Al-An'am", english: "The Cattle", ayahs: 165, revelation: "Makkah" },
  { number: 7, arabic: "الأعراف", transliteration: "Al-A'raf", english: "The Heights", ayahs: 206, revelation: "Makkah" },
  { number: 8, arabic: "الأنفال", transliteration: "Al-Anfal", english: "The Spoils of War", ayahs: 75, revelation: "Madinah" },
  { number: 9, arabic: "التوبة", transliteration: "At-Tawbah", english: "The Repentance", ayahs: 129, revelation: "Madinah" },
  { number: 10, arabic: "يونس", transliteration: "Yunus", english: "Jonah", ayahs: 109, revelation: "Makkah" },
  { number: 11, arabic: "هود", transliteration: "Hud", english: "Hud", ayahs: 123, revelation: "Makkah" },
  { number: 12, arabic: "يوسف", transliteration: "Yusuf", english: "Joseph", ayahs: 111, revelation: "Makkah" },
  { number: 13, arabic: "الرعد", transliteration: "Ar-Ra'd", english: "The Thunder", ayahs: 43, revelation: "Madinah" },
  { number: 14, arabic: "إبراهيم", transliteration: "Ibrahim", english: "Abraham", ayahs: 52, revelation: "Makkah" },
  { number: 15, arabic: "الحجر", transliteration: "Al-Hijr", english: "The Rocky Tract", ayahs: 99, revelation: "Makkah" },
  { number: 16, arabic: "النحل", transliteration: "An-Nahl", english: "The Bee", ayahs: 128, revelation: "Makkah" },
  { number: 17, arabic: "الإسراء", transliteration: "Al-Isra", english: "The Night Journey", ayahs: 111, revelation: "Makkah" },
  { number: 18, arabic: "الكهف", transliteration: "Al-Kahf", english: "The Cave", ayahs: 110, revelation: "Makkah" },
  { number: 19, arabic: "مريم", transliteration: "Maryam", english: "Mary", ayahs: 98, revelation: "Makkah" },
  { number: 20, arabic: "طه", transliteration: "Ta-Ha", english: "Ta-Ha", ayahs: 135, revelation: "Makkah" },
  { number: 21, arabic: "الأنبياء", transliteration: "Al-Anbiya", english: "The Prophets", ayahs: 112, revelation: "Makkah" },
  { number: 22, arabic: "الحج", transliteration: "Al-Hajj", english: "The Pilgrimage", ayahs: 78, revelation: "Madinah" },
  { number: 23, arabic: "المؤمنون", transliteration: "Al-Mu'minun", english: "The Believers", ayahs: 118, revelation: "Makkah" },
  { number: 24, arabic: "النور", transliteration: "An-Nur", english: "The Light", ayahs: 64, revelation: "Madinah" },
  { number: 25, arabic: "الفرقان", transliteration: "Al-Furqan", english: "The Criterion", ayahs: 77, revelation: "Makkah" },
  { number: 26, arabic: "الشعراء", transliteration: "Ash-Shu'ara", english: "The Poets", ayahs: 227, revelation: "Makkah" },
  { number: 27, arabic: "النمل", transliteration: "An-Naml", english: "The Ant", ayahs: 93, revelation: "Makkah" },
  { number: 28, arabic: "القصص", transliteration: "Al-Qasas", english: "The Stories", ayahs: 88, revelation: "Makkah" },
  { number: 29, arabic: "العنكبوت", transliteration: "Al-Ankabut", english: "The Spider", ayahs: 69, revelation: "Makkah" },
  { number: 30, arabic: "الروم", transliteration: "Ar-Rum", english: "The Romans", ayahs: 60, revelation: "Makkah" },
  { number: 31, arabic: "لقمان", transliteration: "Luqman", english: "Luqman", ayahs: 34, revelation: "Makkah" },
  { number: 32, arabic: "السجدة", transliteration: "As-Sajdah", english: "The Prostration", ayahs: 30, revelation: "Makkah" },
  { number: 33, arabic: "الأحزاب", transliteration: "Al-Ahzab", english: "The Combined Forces", ayahs: 73, revelation: "Madinah" },
  { number: 34, arabic: "سبإ", transliteration: "Saba", english: "Sheba", ayahs: 54, revelation: "Makkah" },
  { number: 35, arabic: "فاطر", transliteration: "Fatir", english: "Originator", ayahs: 45, revelation: "Makkah" },
  { number: 36, arabic: "يس", transliteration: "Ya-Sin", english: "Ya-Sin", ayahs: 83, revelation: "Makkah" },
  { number: 37, arabic: "الصافات", transliteration: "As-Saffat", english: "Those Who Set The Ranks", ayahs: 182, revelation: "Makkah" },
  { number: 38, arabic: "ص", transliteration: "Sad", english: "Sad", ayahs: 88, revelation: "Makkah" },
  { number: 39, arabic: "الزمر", transliteration: "Az-Zumar", english: "The Troops", ayahs: 75, revelation: "Makkah" },
  { number: 40, arabic: "غافر", transliteration: "Ghafir", english: "The Forgiver", ayahs: 85, revelation: "Makkah" },
  { number: 41, arabic: "فصلت", transliteration: "Fussilat", english: "Explained in Detail", ayahs: 54, revelation: "Makkah" },
  { number: 42, arabic: "الشورى", transliteration: "Ash-Shura", english: "The Consultation", ayahs: 53, revelation: "Makkah" },
  { number: 43, arabic: "الزخرف", transliteration: "Az-Zukhruf", english: "The Ornaments of Gold", ayahs: 89, revelation: "Makkah" },
  { number: 44, arabic: "الدخان", transliteration: "Ad-Dukhan", english: "The Smoke", ayahs: 59, revelation: "Makkah" },
  { number: 45, arabic: "الجاثية", transliteration: "Al-Jathiyah", english: "The Crouching", ayahs: 37, revelation: "Makkah" },
  { number: 46, arabic: "الأحقاف", transliteration: "Al-Ahqaf", english: "The Wind-Curved Sandhills", ayahs: 35, revelation: "Makkah" },
  { number: 47, arabic: "محمد", transliteration: "Muhammad", english: "Muhammad", ayahs: 38, revelation: "Madinah" },
  { number: 48, arabic: "الفتح", transliteration: "Al-Fath", english: "The Victory", ayahs: 29, revelation: "Madinah" },
  { number: 49, arabic: "الحجرات", transliteration: "Al-Hujurat", english: "The Rooms", ayahs: 18, revelation: "Madinah" },
  { number: 50, arabic: "ق", transliteration: "Qaf", english: "Qaf", ayahs: 45, revelation: "Makkah" },
  { number: 51, arabic: "الذاريات", transliteration: "Adh-Dhariyat", english: "The Winnowing Winds", ayahs: 60, revelation: "Makkah" },
  { number: 52, arabic: "الطور", transliteration: "At-Tur", english: "The Mount", ayahs: 49, revelation: "Makkah" },
  { number: 53, arabic: "النجم", transliteration: "An-Najm", english: "The Star", ayahs: 62, revelation: "Makkah" },
  { number: 54, arabic: "القمر", transliteration: "Al-Qamar", english: "The Moon", ayahs: 55, revelation: "Makkah" },
  { number: 55, arabic: "الرحمن", transliteration: "Ar-Rahman", english: "The Beneficent", ayahs: 78, revelation: "Madinah" },
  { number: 56, arabic: "الواقعة", transliteration: "Al-Waqi'ah", english: "The Inevitable", ayahs: 96, revelation: "Makkah" },
  { number: 57, arabic: "الحديد", transliteration: "Al-Hadid", english: "The Iron", ayahs: 29, revelation: "Madinah" },
  { number: 58, arabic: "المجادلة", transliteration: "Al-Mujadila", english: "The Pleading Woman", ayahs: 22, revelation: "Madinah" },
  { number: 59, arabic: "الحشر", transliteration: "Al-Hashr", english: "The Exile", ayahs: 24, revelation: "Madinah" },
  { number: 60, arabic: "الممتحنة", transliteration: "Al-Mumtahanah", english: "She That Is To Be Examined", ayahs: 13, revelation: "Madinah" },
  { number: 61, arabic: "الصف", transliteration: "As-Saff", english: "The Ranks", ayahs: 14, revelation: "Madinah" },
  { number: 62, arabic: "الجمعة", transliteration: "Al-Jumu'ah", english: "Friday", ayahs: 11, revelation: "Madinah" },
  { number: 63, arabic: "المنافقون", transliteration: "Al-Munafiqun", english: "The Hypocrites", ayahs: 11, revelation: "Madinah" },
  { number: 64, arabic: "التغابن", transliteration: "At-Taghabun", english: "Mutual Disillusion", ayahs: 18, revelation: "Madinah" },
  { number: 65, arabic: "الطلاق", transliteration: "At-Talaq", english: "The Divorce", ayahs: 12, revelation: "Madinah" },
  { number: 66, arabic: "التحريم", transliteration: "At-Tahrim", english: "The Prohibition", ayahs: 12, revelation: "Madinah" },
  { number: 67, arabic: "الملك", transliteration: "Al-Mulk", english: "The Sovereignty", ayahs: 30, revelation: "Makkah" },
  { number: 68, arabic: "القلم", transliteration: "Al-Qalam", english: "The Pen", ayahs: 52, revelation: "Makkah" },
  { number: 69, arabic: "الحاقة", transliteration: "Al-Haqqah", english: "The Reality", ayahs: 52, revelation: "Makkah" },
  { number: 70, arabic: "المعارج", transliteration: "Al-Ma'arij", english: "The Ascending Stairways", ayahs: 44, revelation: "Makkah" },
  { number: 71, arabic: "نوح", transliteration: "Nuh", english: "Noah", ayahs: 28, revelation: "Makkah" },
  { number: 72, arabic: "الجن", transliteration: "Al-Jinn", english: "The Jinn", ayahs: 28, revelation: "Makkah" },
  { number: 73, arabic: "المزمل", transliteration: "Al-Muzzammil", english: "The Enshrouded One", ayahs: 20, revelation: "Makkah" },
  { number: 74, arabic: "المدثر", transliteration: "Al-Muddaththir", english: "The Cloaked One", ayahs: 56, revelation: "Makkah" },
  { number: 75, arabic: "القيامة", transliteration: "Al-Qiyamah", english: "The Resurrection", ayahs: 40, revelation: "Makkah" },
  { number: 76, arabic: "الإنسان", transliteration: "Al-Insan", english: "Man", ayahs: 31, revelation: "Madinah" },
  { number: 77, arabic: "المرسلات", transliteration: "Al-Mursalat", english: "The Emissaries", ayahs: 50, revelation: "Makkah" },
  { number: 78, arabic: "النبأ", transliteration: "An-Naba", english: "The Tidings", ayahs: 40, revelation: "Makkah" },
  { number: 79, arabic: "النازعات", transliteration: "An-Nazi'at", english: "Those Who Drag Forth", ayahs: 46, revelation: "Makkah" },
  { number: 80, arabic: "عبس", transliteration: "Abasa", english: "He Frowned", ayahs: 42, revelation: "Makkah" },
  { number: 81, arabic: "التكوير", transliteration: "At-Takwir", english: "The Overthrowing", ayahs: 29, revelation: "Makkah" },
  { number: 82, arabic: "الانفطار", transliteration: "Al-Infitar", english: "The Cleaving", ayahs: 19, revelation: "Makkah" },
  { number: 83, arabic: "المطففين", transliteration: "Al-Mutaffifin", english: "The Defrauding", ayahs: 36, revelation: "Makkah" },
  { number: 84, arabic: "الانشقاق", transliteration: "Al-Inshiqaq", english: "The Sundering", ayahs: 25, revelation: "Makkah" },
  { number: 85, arabic: "البروج", transliteration: "Al-Buruj", english: "The Mansions of the Stars", ayahs: 22, revelation: "Makkah" },
  { number: 86, arabic: "الطارق", transliteration: "At-Tariq", english: "The Nightcomer", ayahs: 17, revelation: "Makkah" },
  { number: 87, arabic: "الأعلى", transliteration: "Al-A'la", english: "The Most High", ayahs: 19, revelation: "Makkah" },
  { number: 88, arabic: "الغاشية", transliteration: "Al-Ghashiyah", english: "The Overwhelming", ayahs: 26, revelation: "Makkah" },
  { number: 89, arabic: "الفجر", transliteration: "Al-Fajr", english: "The Dawn", ayahs: 30, revelation: "Makkah" },
  { number: 90, arabic: "البلد", transliteration: "Al-Balad", english: "The City", ayahs: 20, revelation: "Makkah" },
  { number: 91, arabic: "الشمس", transliteration: "Ash-Shams", english: "The Sun", ayahs: 15, revelation: "Makkah" },
  { number: 92, arabic: "الليل", transliteration: "Al-Layl", english: "The Night", ayahs: 21, revelation: "Makkah" },
  { number: 93, arabic: "الضحى", transliteration: "Ad-Duha", english: "The Morning Hours", ayahs: 11, revelation: "Makkah" },
  { number: 94, arabic: "الشرح", transliteration: "Ash-Sharh", english: "The Relief", ayahs: 8, revelation: "Makkah" },
  { number: 95, arabic: "التين", transliteration: "At-Tin", english: "The Fig", ayahs: 8, revelation: "Makkah" },
  { number: 96, arabic: "العلق", transliteration: "Al-Alaq", english: "The Clot", ayahs: 19, revelation: "Makkah" },
  { number: 97, arabic: "القدر", transliteration: "Al-Qadr", english: "The Power", ayahs: 5, revelation: "Makkah" },
  { number: 98, arabic: "البينة", transliteration: "Al-Bayyinah", english: "The Clear Proof", ayahs: 8, revelation: "Madinah" },
  { number: 99, arabic: "الزلزلة", transliteration: "Az-Zalzalah", english: "The Earthquake", ayahs: 8, revelation: "Madinah" },
  { number: 100, arabic: "العاديات", transliteration: "Al-Adiyat", english: "The Courser", ayahs: 11, revelation: "Makkah" },
  { number: 101, arabic: "القارعة", transliteration: "Al-Qari'ah", english: "The Calamity", ayahs: 11, revelation: "Makkah" },
  { number: 102, arabic: "التكاثر", transliteration: "At-Takathur", english: "The Rivalry in World Increase", ayahs: 8, revelation: "Makkah" },
  { number: 103, arabic: "العصر", transliteration: "Al-Asr", english: "The Declining Day", ayahs: 3, revelation: "Makkah" },
  { number: 104, arabic: "الهمزة", transliteration: "Al-Humazah", english: "The Traducer", ayahs: 9, revelation: "Makkah" },
  { number: 105, arabic: "الفيل", transliteration: "Al-Fil", english: "The Elephant", ayahs: 5, revelation: "Makkah" },
  { number: 106, arabic: "قريش", transliteration: "Quraysh", english: "Quraysh", ayahs: 4, revelation: "Makkah" },
  { number: 107, arabic: "الماعون", transliteration: "Al-Ma'un", english: "Small Kindnesses", ayahs: 7, revelation: "Makkah" },
  { number: 108, arabic: "الكوثر", transliteration: "Al-Kawthar", english: "Abundance", ayahs: 3, revelation: "Makkah" },
  { number: 109, arabic: "الكافرون", transliteration: "Al-Kafirun", english: "The Disbelievers", ayahs: 6, revelation: "Makkah" },
  { number: 110, arabic: "النصر", transliteration: "An-Nasr", english: "The Divine Support", ayahs: 3, revelation: "Madinah" },
  { number: 111, arabic: "المسد", transliteration: "Al-Masad", english: "The Palm Fiber", ayahs: 5, revelation: "Makkah" },
  { number: 112, arabic: "الإخلاص", transliteration: "Al-Ikhlas", english: "Sincerity", ayahs: 4, revelation: "Makkah" },
  { number: 113, arabic: "الفلق", transliteration: "Al-Falaq", english: "The Daybreak", ayahs: 5, revelation: "Makkah" },
  { number: 114, arabic: "الناس", transliteration: "An-Nas", english: "Mankind", ayahs: 6, revelation: "Makkah" },
];

function parseQuranText(raw: string): QuranAyah[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+\|\d+\|/.test(line))
    .map((line) => {
      const first = line.indexOf("|");
      const second = line.indexOf("|", first + 1);

      return {
        surah: Number(line.slice(0, first)),
        ayah: Number(line.slice(first + 1, second)),
        text: line.slice(second + 1),
      };
    });
}

const quranArabic = parseQuranText(quranArabicRaw);
const quranEnglish = parseQuranText(quranEnglishRaw);
const quranHindi = parseQuranText(quranHindiRaw);
const quranUrdu = parseQuranText(quranUrduRaw);

function getSurahAyahs(
  source: QuranAyah[],
  surahNumber: number
): QuranAyah[] {
  return source.filter((ayah) => ayah.surah === surahNumber);
}

function getTranslationLabel(language: QuranLanguage) {
  switch (language) {
    case "urdu":
      return "اردو";
    case "hindi":
      return "हिन्दी";
    case "english":
      return "English";
  }
}

function getTranslationSource(language: QuranLanguage) {
  switch (language) {
    case "urdu":
      return "Urdu — Fateh Muhammad Jalandhry";
    case "hindi":
      return "Hindi — Farooq Khan & Saifur Rahman Nadwi";
    case "english":
      return "English — Saheeh International";
  }
}

function HomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="page home-page">
      <header className="top-header">
        <div>
          <p className="eyebrow">Assalamu Alaikum</p>
          <h1>Muslim Guide</h1>
        </div>

        <button className="icon-button">
          <Moon size={20} />
        </button>
      </header>

      <div className="date-row">
        <div>
          <strong>Friday, 4 September</strong>
          <span>12 Rabi' al-Awwal 1448</span>
        </div>
        <MapPin size={18} />
      </div>

      <section className="prayer-card">
        <div className="prayer-card-top">
          <div>
            <span className="small-label">NEXT PRAYER</span>
            <h2>Maghrib</h2>
            <p>Today · Sunset prayer</p>
          </div>

          <div className="prayer-time">
            <strong>6:31</strong>
            <span>PM</span>
          </div>
        </div>

        <div className="countdown">
          <span>Next prayer in</span>
          <strong>02h 10m</strong>
        </div>
      </section>

      <section>
        <div className="section-title-row">
          <h2>Prayer Times</h2>
          <button onClick={() => onNavigate("prayer")}>
            View all <ChevronRight size={16} />
          </button>
        </div>

        <div className="prayer-list">
          {[
            ["Fajr", "04:39 AM"],
            ["Dhuhr", "12:18 PM"],
            ["Asr", "04:48 PM"],
            ["Maghrib", "06:31 PM"],
            ["Isha", "07:47 PM"],
          ].map(([name, time]) => (
            <div className="prayer-row" key={name}>
              <div>
                <span>{name}</span>
              </div>
              <strong>{time}</strong>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section-title-row">
          <h2>Quick Access</h2>
        </div>

        <div className="quick-grid">
          <button onClick={() => onNavigate("quran")}>
            <BookOpen />
            <span>Quran</span>
          </button>

          <button>
            <BookMarked />
            <span>Hadith</span>
          </button>

          <button>
            <Heart />
            <span>Duas</span>
          </button>

          <button>
            <Compass />
            <span>Qibla</span>
          </button>

          <button>
            <CircleDot />
            <span>Tasbeeh</span>
          </button>

          <button>
            <CalendarDays />
            <span>Calendar</span>
          </button>
        </div>
      </section>

      <section className="masjid-card">
        <div className="masjid-icon">
          <MapPin size={21} />
        </div>

        <div>
          <span className="small-label">MY MASJID</span>
          <h3>Select your nearby Masjid</h3>
          <p>See verified Jamaat timings</p>
        </div>

        <ChevronRight size={20} />
      </section>

      <section className="reminder-card">
        <div>
          <span className="small-label">DAILY REMINDER</span>
          <p>
            Indeed, in the remembrance of Allah do hearts find rest.
          </p>
          <span>Quran 13:28</span>
        </div>
      </section>
    </div>
  );
}

function QuranPage() {
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);

  const [language, setLanguage] = useState<QuranLanguage>("urdu");

  const [search, setSearch] = useState("");

  const [bookmarks, setBookmarks] = useState<string[]>([]);

  const filteredSurahs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return surahs;

    return surahs.filter(
      (surah) =>
        surah.transliteration.toLowerCase().includes(query) ||
        surah.english.toLowerCase().includes(query) ||
        String(surah.number).includes(query) ||
        surah.arabic.includes(search.trim())
    );
  }, [search]);

  const toggleBookmark = (ayah: QuranAyah) => {
    const key = `${ayah.surah}:${ayah.ayah}`;

    setBookmarks((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  const translationData = useMemo(() => {
    switch (language) {
      case "urdu":
        return quranUrdu;
      case "hindi":
        return quranHindi;
      case "english":
        return quranEnglish;
    }
  }, [language]);

  if (selectedSurah) {
    const arabicAyahs = getSurahAyahs(
      quranArabic,
      selectedSurah.number
    );

    const translationAyahs = getSurahAyahs(
      translationData,
      selectedSurah.number
    );

    return (
      <div className="page quran-reader-page">
        <header className="quran-header">
          <button
            className="icon-button"
            onClick={() => setSelectedSurah(null)}
          >
            <X size={21} />
          </button>

          <div className="quran-header-title">
            <strong>{selectedSurah.transliteration}</strong>
            <span>
              {selectedSurah.arabic} · {selectedSurah.ayahs} Ayahs
            </span>
          </div>

          <div className="translation-selector">
            <Languages size={16} />
            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as QuranLanguage)
              }
            >
              <option value="urdu">اردو</option>
              <option value="hindi">हिन्दी</option>
              <option value="english">English</option>
            </select>
          </div>
        </header>

        <div className="translation-info">
          <span>Translation</span>
          <strong>{getTranslationLabel(language)}</strong>
          <small>{getTranslationSource(language)}</small>
        </div>

        <div className="ayah-list">
          {arabicAyahs.map((arabicAyah) => {
            const translation = translationAyahs.find(
              (item) => item.ayah === arabicAyah.ayah
            );

            const bookmarkKey = `${arabicAyah.surah}:${arabicAyah.ayah}`;

            const isBookmarked = bookmarks.includes(bookmarkKey);

            return (
              <article
                className="ayah-card"
                key={bookmarkKey}
              >
                <div className="ayah-card-top">
                  <span className="ayah-number">
                    {arabicAyah.ayah}
                  </span>

                  <button
                    className="bookmark-button"
                    onClick={() => toggleBookmark(arabicAyah)}
                    aria-label="Bookmark ayah"
                  >
                    {isBookmarked ? (
                      <BookmarkCheck size={19} />
                    ) : (
                      <Bookmark size={19} />
                    )}
                  </button>
                </div>

                <div className="arabic-text">
                  {arabicAyah.text}
                </div>

                <div className="translation-divider" />

                <div className="translation-heading">
                  <span>{getTranslationLabel(language)}</span>
                </div>

                <div
                  className={`translation-text ${
                    language === "urdu" ? "urdu-text" : ""
                  }`}
                >
                  {translation?.text ||
                    "Translation not available for this Ayah."}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="page quran-page">
      <header className="quran-main-header">
        <div className="quran-icon">
          <BookOpen size={25} />
        </div>

        <div>
          <p className="eyebrow">THE HOLY QURAN</p>
          <h1>Quran</h1>
        </div>
      </header>

      <div className="quran-search">
        <Search size={19} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Surah..."
        />

        {search && (
          <button onClick={() => setSearch("")}>
            <X size={17} />
          </button>
        )}
      </div>

      <section className="continue-reading">
        <div>
          <span className="small-label">CONTINUE READING</span>
          <h2>Al-Baqarah</h2>
          <p>Ayah 1 · Last read</p>
        </div>

        <ChevronRight size={21} />
      </section>

      <div className="section-title-row quran-section-heading">
        <h2>Surahs</h2>
        <span>{surahs.length} Surahs</span>
      </div>

      <div className="surah-list">
        {filteredSurahs.map((surah) => (
          <button
            className="surah-item"
            key={surah.number}
            onClick={() => setSelectedSurah(surah)}
          >
            <span className="surah-number">
              {surah.number}
            </span>

            <div className="surah-info">
              <strong>{surah.transliteration}</strong>
              <span>
                {surah.english} · {surah.ayahs} Ayahs
              </span>
            </div>

            <div className="surah-arabic">
              {surah.arabic}
            </div>

            <ChevronRight size={18} />
          </button>
        ))}

        {filteredSurahs.length === 0 && (
          <div className="empty-state">
            <Search size={28} />
            <h3>No Surah found</h3>
            <p>Try another Surah name or number.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AIPage() {
  return (
    <div className="page placeholder-page">
      <div className="placeholder-icon">
        <Sparkles size={30} />
      </div>
      <h1>Islamic AI</h1>
      <p>
        Ask questions and get answers grounded in Quran and
        authentic Hadith sources.
      </p>
    </div>
  );
}

function MorePage() {
  const items = [
    { icon: BookMarked, title: "Hadith", subtitle: "Six major collections" },
    { icon: Heart, title: "Duas & Azkar", subtitle: "Daily supplications" },
    { icon: CircleDot, title: "Tasbeeh", subtitle: "Digital counter" },
    { icon: Compass, title: "Qibla", subtitle: "Find the direction" },
    { icon: CalendarDays, title: "Islamic Calendar", subtitle: "Hijri dates & events" },
    { icon: Sun, title: "Ramadan", subtitle: "Fasting & Ramadan tools" },
    { icon: Settings, title: "Settings", subtitle: "App preferences" },
  ];

  return (
    <div className="page more-page">
      <header className="top-header">
        <div>
          <p className="eyebrow">MUSLIM GUIDE</p>
          <h1>More</h1>
        </div>
      </header>

      <div className="more-list">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button className="more-item" key={item.title}>
              <div className="more-item-icon">
                <Icon size={21} />
              </div>

              <div>
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </div>

              <ChevronRight size={18} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BottomNavigation({
  activePage,
  onNavigate,
}: {
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  const items: {
    page: Page;
    label: string;
    icon: React.ElementType;
  }[] = [
    { page: "home", label: "Home", icon: Home },
    { page: "quran", label: "Quran", icon: BookOpen },
    { page: "prayer", label: "Prayer", icon: Clock3 },
    { page: "ai", label: "AI", icon: Sparkles },
    { page: "more", label: "More", icon: MoreHorizontal },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activePage === item.page;

        return (
          <button
            key={item.page}
            className={active ? "active" : ""}
            onClick={() => onNavigate(item.page)}
          >
            <Icon size={21} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>("home");

  const renderPage = () => {
    switch (activePage) {
      case "home":
        return <HomePage onNavigate={setActivePage} />;

      case "quran":
        return <QuranPage />;

      case "prayer":
        return <PrayerPage />;

      case "ai":
        return <AIPage />;

      case "more":
        return <MorePage />;

      default:
        return <HomePage onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="app-shell">
      <main className="app-content">{renderPage()}</main>

      <BottomNavigation
        activePage={activePage}
        onNavigate={setActivePage}
      />
    </div>
  );
}