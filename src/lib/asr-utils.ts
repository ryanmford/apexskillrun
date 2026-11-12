export const CONFIG = {
  SNAPSHOT_KEY: "asr_data_vault_v1_integrated_v64_fix_open",
  PREFS_KEY: "asr_user_prefs_v1",
  REFRESH_INTERVAL: 300000, // 5 mins
  SKOOL_LINK:
    "https://www.skool.com/apexmovement/about?ref=cdbeb6ddf53f452ab40ac16f6a8deb93",
  SPREADSHEET_ID: "19qI0mQJc4iW_tz-OycA1atgAM4qMzrS_diChMAbrobo",
  SHEET_GIDS: {
    MENS: "595214914",
    WOMENS: "566627843",
    LIVE: "623600169",
    SETS: "1961325686",
  },
  DATES: {
    OPEN_START: "2026-03-02T00:00:00Z",
    OPEN_END: "2026-05-31T23:59:59Z",
    COUNTDOWN_TARGET: "2026-06-04T07:00:00Z",
  },
  FALLBACKS: {
    UNKNOWN_LOCATION: "UNKNOWN",
    UNKNOWN_FLAG: "🏳️",
    UNAFFILIATED: "UNAFFILIATED",
  },
};

export const THEME = {
  CARD: (t: string) =>
    t === "dark"
      ? "bg-zinc-900/20 border-white/5 backdrop-blur-md shadow-sm text-zinc-100"
      : "bg-white border-zinc-100 backdrop-blur-md shadow-sm text-black",
  GLASS: (t: string) =>
    t === "dark"
      ? "bg-zinc-900/40 border-white/5 backdrop-blur-2xl shadow-xl"
      : "bg-white/60 border-zinc-100 backdrop-blur-xl shadow-lg",
  MODAL_SURFACE: (t: string) =>
    t === "dark"
      ? "bg-[#050505] border-white/5 text-zinc-100 shadow-2xl"
      : "bg-white border-zinc-100 text-black shadow-xl",
  HEADING_SM:
    "text-[9px] sm:text-[10px] font-display font-black uppercase tracking-[0.35em] opacity-50",
  HEADING_HOF:
    "text-[11px] sm:text-[13px] font-display font-bold uppercase tracking-tight opacity-90",
  HEADING_MAIN:
    "text-4xl sm:text-[64px] font-display font-black uppercase tracking-normal italic leading-none",
  LABEL:
    "text-[8px] sm:text-[9.5px] font-display font-black uppercase tracking-widest sm:tracking-[0.15em] opacity-60",
  VALUE: "font-mono font-black tabular-nums tracking-tighter",
  BENTO_CARD: (t: string) =>
    cn(
      "rounded-[1.5rem] border backdrop-blur-md transition-all duration-150",
      t === "dark"
        ? "bg-zinc-900/50 border-white/10 shadow-sm hover:bg-white/5 hover:border-white/20"
        : "bg-white/60 border-black/5 shadow-sm hover:bg-black/5 hover:border-black/10"
    ),
  INPUT: (t: string) =>
    t === "dark"
      ? "bg-black/40 text-white focus:bg-white/[0.03] border-white/10 focus:border-blue-500/50 shadow-inner"
      : "bg-white/80 text-zinc-900 border-zinc-200 focus:border-blue-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]",
  ICON_BUTTON: (t: string) =>
    cn(
      "p-2 sm:p-3 transition-all active:scale-90 text-zinc-500 hover:text-blue-500 flex items-center justify-center",
      t === "dark" ? "" : "",
    ),
  PILL_BASE: (t: string) =>
    cn(
      "px-6 py-3 rounded-full font-black uppercase tracking-[0.2em] text-[9.5px] transition-all border shadow-lg backdrop-blur-md",
      t === "dark"
        ? "bg-zinc-900/50 text-white border-white/10"
        : "bg-white/50 text-black border-black/10",
    ),
  NAV_ITEM: (t: string, active: boolean) =>
    cn(
      "relative z-10 flex-1 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
      active
        ? "text-white"
        : t === "dark"
          ? "text-zinc-500 hover:text-zinc-300"
          : "text-zinc-400 hover:text-zinc-600",
    ),
};

export const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

const ALIAS_MAP: Record<string, string> = {
  "muhammadsteedbaloch": "muhammadbaloch",
};

export const createSlug = (n: string) => {
  if (!n) return "";
  return String(n)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "") // remove anything that's not a letter, number, space, or hyphen
    .trim()
    .replace(/[\s-]+/g, "-"); // replace spaces and consecutive hyphens with a single hyphen
};

export const normalizeName = (n: string) => {
  if (!n) return "";
  const raw = String(n)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return ALIAS_MAP[raw] || raw;
};

const normalizeCountryName = (name: string) => {
  if (!name) return "";
  let n = String(name)
    .toUpperCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Remove emojis and country flags, especially those preceded by a comma
  n = n.replace(/,\s*\p{Extended_Pictographic}+/gu, "");
  n = n.replace(/\p{Extended_Pictographic}+/gu, "");
  n = n.replace(/,\s*[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, "");
  n = n.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, "");
  n = n.trim().replace(/,$/, "").trim();

  if (n === "UNKNOWN" || n === "UNDEFINED" || n === "NULL") return "";
  const map: Record<string, string> = {
    "UNITED STATES OF AMERICA": "USA",
    "UNITED STATES": "USA",
    US: "USA",
    USA: "USA",
    "UNITED KINGDOM": "UK",
    "GREAT BRITAIN": "UK",
    ENGLAND: "UK",
    UK: "UK",
    SCOTLAND: "UK",
    WALES: "UK",
    "NORTHERN IRELAND": "UK",
    "SOUTH KOREA": "KOREA",
    "REPUBLIC OF KOREA": "KOREA",
    "RUSSIAN FEDERATION": "RUSSIA",
    "THE NETHERLANDS": "NETHERLANDS",
    "CZECH REPUBLIC": "CZECHIA",
    "UNITED MEXICAN STATES": "MEXICO",
    MACAO: "MACAU",
    "MACAU SAR": "MACAU",
    ISRAEL: "ISRAEL",
    TAIWAN: "TAIWAN",
    SWITZERLAND: "SWITZERLAND",
  };
  return map[n] || n;
};

export const fixCountryEntity = (name: string, flag: string) => {
  const n = String(name || "").trim();
  const f = String(flag || "").trim();
  const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/;

  if (flagRegex.test(n))
    return { name: CONFIG.FALLBACKS.UNKNOWN_LOCATION, flag: n };
  if (flagRegex.test(f))
    return { name: n || CONFIG.FALLBACKS.UNKNOWN_LOCATION, flag: f };

  const normalized = normalizeCountryName(n);
  const flagMandatoryMap: Record<string, string> = {
    USA: "🇺🇸",
    UK: "🇬🇧",
    CANADA: "🇨🇦",
    MEXICO: "🇲🇽",
    FRANCE: "🇫🇷",
    GERMANY: "🇩🇪",
    SPAIN: "🇪🇸",
    ITALY: "🇮🇹",
    JAPAN: "🇯🇵",
    AUSTRALIA: "🇦🇺",
    BRAZIL: "🇧🇷",
    "PUERTO RICO": "🇵🇷",
    CZECHIA: "🇨🇿",
    NETHERLANDS: "🇳🇱",
    SWITZERLAND: "🇨🇭",
    AUSTRIA: "🇦🇹",
    BELGIUM: "🇧🇪",
    SWEDEN: "🇸🇪",
    NORWAY: "🇳🇴",
    FINLAND: "🇫🇮",
    DENMARK: "🇩🇰",
    KOREA: "🇰🇷",
    CHINA: "🇨🇳",
    MACAU: "🇲🇴",
    "HONG KONG": "🇭🇰",
    "NEW ZEALAND": "🇳🇿",
    SINGAPORE: "🇸🇬",
    IRELAND: "🇮🇪",
    PORTUGAL: "🇵🇹",
    POLAND: "🇵🇱",
    "SOUTH AFRICA": "🇿🇦",
    ARGENTINA: "🇦🇷",
    CHILE: "🇨🇱",
    ISRAEL: "🇮🇱",
    TAIWAN: "🇹🇼",
    RUSSIA: "🇷🇺",
    UKRAINE: "🇺🇦",
    VIETNAM: "🇻🇳",
    THAILAND: "🇹🇭",
    MALAYSIA: "🇲🇾",
    PHILIPPINES: "🇵🇭",
  };

  const finalName = normalized || CONFIG.FALLBACKS.UNKNOWN_LOCATION;
  const finalFlag =
    flagMandatoryMap[finalName] ||
    (f && f !== "🏳️" ? f : CONFIG.FALLBACKS.UNKNOWN_FLAG);
  return { name: finalName, flag: finalFlag };
};

export const getSetterLevel = (impact: number, sets: number): string | null => {
  if (impact >= 1000 && sets >= 100) return "3";
  if (impact >= 100 && sets >= 10) return "2";
  if (impact >= 10 && sets >= 3) return "1";
  return null;
};

export const formatLocation = (locObj: { city?: string; country?: string; state?: string; stateProv?: string; region?: string; nation?: string; location?: string } | string) => {
  if (!locObj) return CONFIG.FALLBACKS.UNKNOWN_LOCATION;

  let city: string;
  let state = "";
  let country = "";

  if (typeof locObj === "string") {
    const parts = locObj.split(",").map((p) => p.trim());
    if (parts.length >= 3) {
      city = parts[0];
      state = parts[1];
      country = parts[parts.length - 1];
    } else if (parts.length === 2) {
      city = parts[0];
      country = parts[1];
    } else {
      city = parts[0];
    }
  } else {
    city = locObj.city || locObj.location || "";
    state = locObj.state || locObj.stateProv || locObj.region || "";
    country = locObj.country || locObj.nation || "";
  }

  const clean = (s: string) => {
    return String(s || "")
      .toUpperCase()
      .trim()
      .replace(/,\s*\p{Extended_Pictographic}+/gu, "")
      .replace(/\p{Extended_Pictographic}+/gu, "")
      .replace(/,\s*[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, "")
      .replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, "")
      .trim()
      .replace(/,$/, "")
      .trim();
  };

  const c = clean(city);
  const s = clean(state);
  const normalizedCountry = normalizeCountryName(country).toUpperCase().trim();

  if (!c && !normalizedCountry) return CONFIG.FALLBACKS.UNKNOWN_LOCATION;

  // De-dupe if city is same as country or state
  const parts = [c];
  if (s && s !== c && s !== normalizedCountry && !c.includes(s)) parts.push(s);
  if (
    normalizedCountry &&
    normalizedCountry !== c &&
    !c.endsWith(normalizedCountry)
  )
    parts.push(normalizedCountry);

  return parts.filter(Boolean).join(", ");
};

export const cleanNumeric = (v: string | number | null | undefined) => {
  if (typeof v === "number") return isNaN(v) ? null : v;
  if (v === undefined || v === null || v === "") return null;
  const str = String(v);
  if (str.includes("✅")) return 1;
  if (str.includes("#")) return null;

  const timeVal = str.replace(/[^\d:.-]/g, "").trim();
  if (timeVal.includes(":")) {
    const parts = timeVal.split(":");
    let totalSeconds = 0;
    if (parts.length === 2) {
      totalSeconds = parseInt(parts[0] || "0", 10) * 60 + parseFloat(parts[1] || "0");
    } else if (parts.length === 3) {
      totalSeconds = parseInt(parts[0] || "0", 10) * 3600 + parseInt(parts[1] || "0", 10) * 60 + parseFloat(parts[2] || "0");
    }
    if (!isNaN(totalSeconds)) return totalSeconds;
  }

  const clean = str
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  if (!clean) return null;
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
};

const parseLine = (line: string = "") => {
  const result: string[] = [];
  let inQuotes = false;
  let start = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === "," && !inQuotes) {
      let val = line.substring(start, i).trim();
      if (
        val.length > 1 &&
        val.charCodeAt(0) === 34 &&
        val.charCodeAt(val.length - 1) === 34
      ) {
        val = val.substring(1, val.length - 1).trim();
      }
      result.push(val);
      start = i + 1;
    }
  }
  let val = line.substring(start).trim();
  if (
    val.length > 1 &&
    val.charCodeAt(0) === 34 &&
    val.charCodeAt(val.length - 1) === 34
  ) {
    val = val.substring(1, val.length - 1).trim();
  }
  result.push(val);
  return result;
};

export const csvToObjects = (
  csv: string,
  mapping: Record<string, string[]>,
  headerRowIndex: number = 0,
) => {
  if (!csv) return [];
  const rawCsv = csv.replace(/^\uFEFF/, "");
  const lines: string[] = [];
  let currentLine = "";
  let inQuotes = false;
  
  for (let i = 0; i < rawCsv.length; i++) {
    const char = rawCsv[i];
    if (char === '"') inQuotes = !inQuotes;
    
    if (char === '\n' && !inQuotes) {
      lines.push(currentLine.trimEnd());
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  if (currentLine) lines.push(currentLine.trimEnd());
  
  const validLines = lines.filter((l) => l.trim());
  if (validLines.length <= headerRowIndex) return [];
  
  const headers = parseLine(validLines[headerRowIndex]);
  const colMap: Record<string, number> = {};

  Object.entries(mapping).forEach(([field, searchTerms]: [string, string[]]) => {
    colMap[field] = headers.findIndex((h) =>
      searchTerms.some((term: string) =>
        h.toLowerCase().trim().includes(term.toLowerCase()),
      ),
    );
  });

  return validLines.slice(headerRowIndex + 1).map((line) => {
    const vals = parseLine(line);
    const obj: Record<string, any> = {};
    Object.keys(mapping).forEach((field) => {
      const idx = colMap[field];
      obj[field] = idx !== -1 ? vals[idx] : undefined;
    });
    obj.__raw = vals;
    return obj;
  });
};

export const formatFlagsWithSpace = (f: string) => {
  if (!f) return "";
  const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;
  const matches = String(f).match(flagRegex);
  if (matches && matches.length > 1) {
    return matches.join(" ");
  }
  return f;
};

export interface FlaggedObject {
  flag?: string | null;
  region?: string | null;
  country?: string | null;
  countryName?: string | null;
  townFlag?: string | null;
  gymFlag?: string | null;
  [key: string]: unknown;
}

export const getCombinedFlags = (...objects: (string | FlaggedObject | null | undefined)[]): string => {
  const flags = new Set<string>();
  const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;

  // Process explicit strings or explicit flag/region fields first
  for (const obj of objects) {
    if (!obj) continue;
    
    if (typeof obj === "string") {
      const matches = obj.match(flagRegex);
      if (matches) matches.forEach((m) => flags.add(m));
      continue;
    }

    const explicitFlagField = obj.flag || obj.region;
    if (explicitFlagField) {
      const matches = String(explicitFlagField).match(flagRegex);
      if (matches && matches.length > 0) {
        matches.forEach((m) => flags.add(m));
      }
    }
  }

  // If we found any explicit flags, return them immediately.
  if (flags.size > 0) {
    return Array.from(flags).join(" ");
  }

  // Fallback: only if NO explicit flags were found across all objects
  for (const obj of objects) {
    if (!obj || typeof obj === "string") continue;

    const possibleFlagFields = [
      obj.country,
      obj.countryName,
      obj.townFlag,
      obj.gymFlag,
    ];

    for (const val of possibleFlagFields) {
      if (!val) continue;

      let resolvedFlag = String(val);
      if (!flagRegex.test(resolvedFlag) && resolvedFlag.trim() !== "") {
        resolvedFlag = fixCountryEntity(resolvedFlag, "").flag;
      }

      const matches = resolvedFlag.match(flagRegex);
      if (matches) {
        matches.forEach((m) => flags.add(m));
      }
    }
  }

  return Array.from(flags).join(" ");
};

export const toTitleCase = (str: string): string => {
  if (!str) return "";
  return str.split(" ").map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(" ");
};

export const getContinentData = (country: string) => {
  const continents: Record<string, string[]> = {
    eu: [
      "ALBANIA",
      "ANDORRA",
      "ARMENIA",
      "AUSTRIA",
      "AZERBAIJAN",
      "BELARUS",
      "BELGIUM",
      "BOSNIA AND HERZEGOVINA",
      "BULGARIA",
      "CROATIA",
      "CYPRIA",
      "CZECHIA",
      "CZECH REPUBLIC",
      "DENMARK",
      "ESTONIA",
      "FINLAND",
      "FRANCE",
      "GEORGIA",
      "GERMANY",
      "GREECE",
      "HUNGARY",
      "ICELAND",
      "IRELAND",
      "ITALY",
      "KAZAKHSTAN",
      "KOSOVO",
      "LATVIA",
      "LIECHTENSTEIN",
      "LITHUANIA",
      "LUXEMBOURG",
      "MALTA",
      "MOLDOVA",
      "MONACO",
      "MONTENEGRO",
      "NETHERLANDS",
      "NORTH MACEDONIA",
      "NORWAY",
      "POLAND",
      "PORTUGAL",
      "ROMANIA",
      "RUSSIA",
      "SAN MARINO",
      "SERBIA",
      "SLOVAKIA",
      "SLOVENIA",
      "SPAIN",
      "SWEDEN",
      "SWITZERLAND",
      "TURKEY",
      "UKRAINE",
      "UK",
      "UNITED KINGDOM",
    ],
    na: [
      "ANTIGUA AND BARBUDA",
      "BAHAMAS",
      "BARBADOS",
      "BELIZE",
      "CANADA",
      "COSTA RICA",
      "CUBA",
      "DOMINICA",
      "DOMINICAN REPUBLIC",
      "EL SALVADOR",
      "GRENADA",
      "GUATEMALA",
      "HAITI",
      "HONDURAS",
      "JAMAICA",
      "MEXICO",
      "NICARAGUA",
      "PANAMA",
      "SAINT KITTS AND NEVIS",
      "SAINT LUCIA",
      "SAINT VINCENT AND THE GRENADINES",
      "TRINIDAD AND TOBAGO",
      "USA",
      "UNITED STATES",
      "PUERTO RICO",
    ],
    sa: [
      "ARGENTINA",
      "BOLIVIA",
      "BRAZIL",
      "CHILE",
      "COLOMBIA",
      "ECUADOR",
      "GUYANA",
      "PARAGUAY",
      "PERU",
      "SURINAME",
      "URUGUAY",
      "VENEZUELA",
    ],
    as: [
      "AFGHANISTAN",
      "BAHRAIN",
      "BANGLADESH",
      "BHUTAN",
      "BRUNEI",
      "CAMBODIA",
      "CHINA",
      "INDIA",
      "INDONESIA",
      "IRAN",
      "IRAQ",
      "ISRAEL",
      "JAPAN",
      "JORDAN",
      "KOREA",
      "SOUTH KOREA",
      "KUWAIT",
      "KYRGYZSTAN",
      "LAOS",
      "LEBANON",
      "MALAYSIA",
      "MALDIVES",
      "MONGOLIA",
      "MYANMAR",
      "NEPAL",
      "OMAN",
      "PAKISTAN",
      "PALESTINE",
      "PHILIPPINES",
      "QATAR",
      "SAUDI ARABIA",
      "SINGAPORE",
      "SRI LANKA",
      "SYRIA",
      "TAIWAN",
      "TAJIKISTAN",
      "THAILAND",
      "TIMOR-LESTE",
      "TURKMENISTAN",
      "UNITED ARAB EMIRATES",
      "UZBEKISTAN",
      "VIETNAM",
      "YEMEN",
    ],
    af: [
      "ALGERIA",
      "ANGOLA",
      "BENIN",
      "BOTSWANA",
      "BURKINA FASO",
      "BURUNDI",
      "CABO VERDE",
      "CAMEROON",
      "CENTRAL AFRICAN REPUBLIC",
      "CHAD",
      "COMOROS",
      "CONGO",
      "DJIBOUTI",
      "EGYPT",
      "EQUATORIAL GUINEA",
      "ERITREA",
      "ESWATINI",
      "ETHIOPIA",
      "GABON",
      "GAMBIA",
      "GHANA",
      "IVORY COAST",
      "KENYA",
      "LESOTHO",
      "LIBERIA",
      "LIBYA",
      "MADAGASRAR",
      "MALAWI",
      "MALI",
      "MAURITANIA",
      "MAURITIUS",
      "MOROCCO",
      "MOZAMBIQUE",
      "NAMIBIA",
      "NIGER",
      "NIGERIA",
      "RWANDA",
      "SAO TOME AND PRINCIPE",
      "SENEGAL",
      "SEYCHELLES",
      "SIERRA LEONE",
      "SOMALIA",
      "SOUTH AFRICA",
      "SOUTH SUDAN",
      "SUDAN",
      "TANZANIA",
      "TOGO",
      "TUNISIA",
      "UGANDA",
      "ZAMBIA",
      "ZIMBABWE",
    ],
    oc: [
      "AUSTRALIA",
      "FIJI",
      "KIRIBATI",
      "MARSHALL ISLANDS",
      "MICRONESIA",
      "NAURU",
      "NEW ZEALAND",
      "PALAU",
      "PAPUA NEW GUINEA",
      "SAMOA",
      "SOLOMON ISLANDS",
      "TONGA",
      "TUVALU",
      "VANUATU",
    ],
  };
  const c = normalizeCountryName(country);
  const regionMap: Record<string, { name: string; flag: string }> = {
    eu: { name: "EUROPE", flag: "🌍" },
    na: { name: "NORTH AMERICA", flag: "🌎" },
    sa: { name: "SOUTH AMERICA", flag: "🌎" },
    as: { name: "ASIA", flag: "🌏" },
    oc: { name: "AUSTRALIA / OCEANIA", flag: "🌏" },
    af: { name: "AFRICA", flag: "🌍" },
  };
  for (const [regionCode, countriesArr] of Object.entries(continents)) {
    if ((countriesArr as string[]).includes(c)) return regionMap[regionCode];
  }
  return { name: "OTHER", flag: "🌐" };
};

export const isPlaceholderPlayer = (name: string) => {
  if (!name) return false;
  const n = String(name).toUpperCase();
  return (
    n.includes("INTERIM") ||
    n.includes("TOP TIME") ||
    n.includes("PLACEHOLDER") ||
    n.includes("UNKNOWN") ||
    n.includes("UNCLAIMED")
  );
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const trackEvent = (eventName: string, params = {}) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  } else {
    console.log(`[GA4 Event] ${eventName}`, params);
  }
};

export const trackPageview = (path: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    const cleanPath = path.replace(/^#\/?/, "") || "players";
    window.gtag("event", "page_view", {
      page_path: `/${cleanPath}`,
      page_title: `ASR - ${cleanPath.toUpperCase()}`,
    });
  }
};

export const robustSort = (a: Record<string, unknown>, b: Record<string, unknown>, key: string, dir: number) => {
  const aVal = a[key];
  const bVal = b[key];

  if (typeof aVal === "number" && typeof bVal === "number") {
    return (aVal - bVal) * dir;
  }

  if (
    aVal !== null &&
    aVal !== undefined &&
    bVal !== null &&
    bVal !== undefined
  ) {
    const aFloat = Number(aVal);
    const bFloat = Number(bVal);
    if (!isNaN(aFloat) && !isNaN(bFloat)) {
      return (aFloat - bFloat) * dir;
    }
  }

  const aStr = String(aVal || "").toLowerCase();
  const bStr = String(bVal || "").toLowerCase();
  return (aStr === bStr ? 0 : aStr < bStr ? -1 : 1) * dir; // Much faster than localeCompare
};

export const isQualifiedAthlete = (p: { sends?: number, challenges?: number, gender?: string, name?: string }, mode?: string | boolean) => {
  if (!p || isPlaceholderPlayer(p.name || "")) return false;
  const challenges = p.challenges || 0;
  return challenges >= 3;
};

export const getNormalizedNameList = (listStr: string) => {
  if (!listStr) return [];
  return listStr
    .split(/[,&/]| and /i)
    .map((n) => normalizeName(n))
    .filter(Boolean);
};

export const formatYYYYMMDD = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const parseSkillDifficulty = (diff: string): string => {
  if (!diff) return "-";
  const d = diff.toLowerCase();
  
  if (d.includes("green") || d.includes("🟢")) {
    if (d.includes("-") || d.includes("minus")) return "1";
    if (d.includes("+") || d.includes("plus")) return "3";
    return "2";
  }
  
  if (d.includes("blue") || d.includes("🔵")) {
    if (d.includes("-") || d.includes("minus")) return "4";
    if (d.includes("+") || d.includes("plus")) return "6";
    return "5";
  }
  
  if (d.includes("black") || d.includes("⚫")) {
    if (d.includes("-") || d.includes("minus")) return "7";
    if (d.includes("+") || d.includes("plus")) return "9";
    return "8";
  }
  
  return diff;
};

export type SkillRatingTierId = "1-20" | "21-40" | "41-60" | "61-80" | "81-100";

export interface SkillRatingTierConfig {
  id: SkillRatingTierId;
  label: string;
  tierName: string;
  min: number;
  max: number;
  dotCls: string;
  textDarkCls: string;
  textLightCls: string;
  badgeDarkCls: string;
  badgeLightCls: string;
  activePillDarkCls: string;
  activePillLightCls: string;
  pinHex: string;
}

export const UNRATED_SKILL_TIER: SkillRatingTierConfig = {
  id: "1-20",
  label: "UNRATED",
  tierName: "UNRATED",
  min: 0,
  max: 100,
  dotCls: "bg-zinc-400",
  textDarkCls: "text-white",
  textLightCls: "text-zinc-900",
  badgeDarkCls: "bg-zinc-800 text-zinc-200 border-zinc-700",
  badgeLightCls: "bg-zinc-100 text-zinc-800 border-zinc-300",
  activePillDarkCls: "bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.25)]",
  activePillLightCls: "bg-zinc-900 text-white border-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.2)]",
  pinHex: "#a1a1aa",
};

export const SKILL_RATING_TIERS: SkillRatingTierConfig[] = [
  {
    id: "1-20",
    label: "1–20",
    tierName: "ENTRY",
    min: 1,
    max: 20,
    dotCls: "bg-emerald-400",
    textDarkCls: "text-emerald-400",
    textLightCls: "text-emerald-600",
    badgeDarkCls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35",
    badgeLightCls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    activePillDarkCls: "bg-emerald-500/20 text-emerald-300 border-emerald-400/70 shadow-[0_0_12px_rgba(16,185,129,0.25)]",
    activePillLightCls: "bg-emerald-600 text-white border-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.3)]",
    pinHex: "#10b981",
  },
  {
    id: "21-40",
    label: "21–40",
    tierName: "CORE",
    min: 21,
    max: 40,
    dotCls: "bg-sky-400",
    textDarkCls: "text-sky-400",
    textLightCls: "text-sky-600",
    badgeDarkCls: "bg-sky-500/15 text-sky-300 border-sky-500/35",
    badgeLightCls: "bg-sky-500/10 text-sky-700 border-sky-500/30",
    activePillDarkCls: "bg-sky-500/20 text-sky-300 border-sky-400/70 shadow-[0_0_12px_rgba(14,165,233,0.25)]",
    activePillLightCls: "bg-sky-600 text-white border-sky-600 shadow-[0_2px_8px_rgba(14,165,233,0.3)]",
    pinHex: "#0ea5e9",
  },
  {
    id: "41-60",
    label: "41–60",
    tierName: "SOLID",
    min: 41,
    max: 60,
    dotCls: "bg-amber-400",
    textDarkCls: "text-amber-400",
    textLightCls: "text-amber-600",
    badgeDarkCls: "bg-amber-500/15 text-amber-300 border-amber-500/35",
    badgeLightCls: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    activePillDarkCls: "bg-amber-500/20 text-amber-300 border-amber-400/70 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
    activePillLightCls: "bg-amber-500 text-white border-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.3)]",
    pinHex: "#f59e0b",
  },
  {
    id: "61-80",
    label: "61–80",
    tierName: "HARD",
    min: 61,
    max: 80,
    dotCls: "bg-rose-500",
    textDarkCls: "text-rose-400",
    textLightCls: "text-rose-600",
    badgeDarkCls: "bg-rose-500/15 text-rose-300 border-rose-500/35",
    badgeLightCls: "bg-rose-500/10 text-rose-700 border-rose-500/30",
    activePillDarkCls: "bg-rose-500/20 text-rose-300 border-rose-400/70 shadow-[0_0_12px_rgba(244,63,94,0.25)]",
    activePillLightCls: "bg-rose-600 text-white border-rose-600 shadow-[0_2px_8px_rgba(244,63,94,0.3)]",
    pinHex: "#f43f5e",
  },
  {
    id: "81-100",
    label: "81–100",
    tierName: "APEX",
    min: 81,
    max: 100,
    dotCls: "bg-purple-500",
    textDarkCls: "text-purple-400",
    textLightCls: "text-purple-600",
    badgeDarkCls: "bg-purple-500/15 text-purple-300 border-purple-500/35",
    badgeLightCls: "bg-purple-500/10 text-purple-700 border-purple-500/30",
    activePillDarkCls: "bg-purple-500/20 text-purple-300 border-purple-400/70 shadow-[0_0_12px_rgba(168,85,247,0.25)]",
    activePillLightCls: "bg-purple-600 text-white border-purple-600 shadow-[0_2px_8px_rgba(168,85,247,0.3)]",
    pinHex: "#a855f7",
  },
];

export const getSkillRating = (skill?: { points?: number | string; difficulty?: string | number } | null): number => {
  if (!skill) return 0;
  if (typeof skill.points === "number" && !isNaN(skill.points) && skill.points > 0) {
    return skill.points;
  }
  const p = parseFloat(String(skill.points || ""));
  if (!isNaN(p) && p > 0) return p;
  const d = parseFloat(String(skill.difficulty || ""));
  if (!isNaN(d) && d > 0) return d;
  return 0;
};

export const getSkillTierConfig = (rating: number): SkillRatingTierConfig => {
  const r = Math.round(rating);
  if (r <= 0) return UNRATED_SKILL_TIER;
  if (r <= 20) return SKILL_RATING_TIERS[0];
  if (r <= 40) return SKILL_RATING_TIERS[1];
  if (r <= 60) return SKILL_RATING_TIERS[2];
  if (r <= 80) return SKILL_RATING_TIERS[3];
  return SKILL_RATING_TIERS[4];
};

export const parseRatingRangeParam = (param: string | null | undefined): { min: number; max: number } | null => {
  if (!param || param === "all") return null;
  const clean = param.trim();
  const rangeMatch = clean.match(/^(\d{1,3})\s*[-–..]+\s*(\d{1,3})$/);
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1], 10);
    const b = parseInt(rangeMatch[2], 10);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  return null;
};

export const parseRatingRangesList = (param: string | null | undefined): { min: number; max: number }[] => {
  if (!param || param === "all") return [];
  const parts = param.split(",").map(s => s.trim()).filter(Boolean);
  const ranges: { min: number; max: number }[] = [];
  for (const p of parts) {
    const r = parseRatingRangeParam(p);
    if (r) ranges.push(r);
  }
  return ranges;
};

export const toggleRatingTierParam = (currentParam: string | null | undefined, clickedTierId: SkillRatingTierId): string => {
  const allTierIds: SkillRatingTierId[] = ["1-20", "21-40", "41-60", "61-80", "81-100"];
  const currentParts = (currentParam && currentParam !== "all" ? currentParam.split(",") : [])
    .map(s => s.trim())
    .filter((s): s is SkillRatingTierId => allTierIds.includes(s as SkillRatingTierId));

  const nextSet = new Set<SkillRatingTierId>(currentParts);
  if (nextSet.has(clickedTierId)) {
    nextSet.delete(clickedTierId);
  } else {
    nextSet.add(clickedTierId);
  }

  // If 0 selected, return "all" (unfiltered)
  if (nextSet.size === 0) {
    return "all";
  }

  return allTierIds.filter(id => nextSet.has(id)).join(",");
};

export const parseSearchQueryWithRating = (rawQuery: string): {
  textQuery: string;
  ratingRange: { min: number; max: number } | null;
} => {
  if (!rawQuery || !rawQuery.trim()) {
    return { textQuery: "", ratingRange: null };
  }
  const tokens = rawQuery.trim().split(/\s+/);
  const textTokens: string[] = [];
  let ratingRange: { min: number; max: number } | null = null;

  for (const token of tokens) {
    // Match range e.g. "1-25", "10-40", "10..40"
    const rangeMatch = token.match(/^(\d{1,3})(?:[-–]|\.\.)(\d{1,3})$/);
    if (rangeMatch) {
      const a = parseInt(rangeMatch[1], 10);
      const b = parseInt(rangeMatch[2], 10);
      if (a >= 0 && b <= 100) {
        ratingRange = { min: Math.max(1, Math.min(a, b)), max: Math.max(a, b) };
        continue;
      }
    }
    // Match <=30 or <30
    const ltMatch = token.match(/^<=?(\d{1,3})$/);
    if (ltMatch) {
      const maxVal = parseInt(ltMatch[1], 10);
      const isStrict = !token.startsWith("<=");
      ratingRange = { min: 1, max: isStrict ? Math.max(1, maxVal - 1) : maxVal };
      continue;
    }
    // Match >=70 or >70 or 70+
    const gtMatch = token.match(/^(?:>=?(\d{1,3})|(\d{1,3})\+)$/);
    if (gtMatch) {
      const minVal = parseInt(gtMatch[1] || gtMatch[2], 10);
      const isStrict = token.startsWith(">") && !token.startsWith(">=");
      ratingRange = { min: isStrict ? Math.min(100, minVal + 1) : minVal, max: 100 };
      continue;
    }
    // Match =50
    const eqMatch = token.match(/^=(\d{1,3})$/);
    if (eqMatch) {
      const val = parseInt(eqMatch[1], 10);
      ratingRange = { min: val, max: val };
      continue;
    }
    textTokens.push(token);
  }

  return {
    textQuery: textTokens.join(" "),
    ratingRange,
  };
};


