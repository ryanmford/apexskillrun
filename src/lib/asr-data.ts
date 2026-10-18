import { PlayerProfile, SkillData, SetterProfile, TeamProfile } from "../types";
import {
  normalizeName,
  fixCountryEntity,
  cleanNumeric,
  isPlaceholderPlayer,
  csvToObjects,
  CONFIG,
  getNormalizedNameList,
  parseSkillDifficulty,
} from "./asr-utils";
import { normalizeForSearch } from "./utils";

export const parseSafeDate = (dStr: string | null | undefined): Date | null => {
  if (!dStr) return null;
  const s = String(dStr).trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    return new Date(s.replace(/-/g, "/"));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const isFootwearTeam = (tName: string, shoeField?: string): boolean => {
  if (!tName) return false;
  const nLow = tName.toLowerCase().trim();
  const shoeKeywords = [
    "vans", "salomon", "feiyue", "adidas", "puma", "nike", 
    "strike mvmnt", "strike movement", "new balance", "inov-8", 
    "merrell", "asics", "reebok", "saucony", "hoka", "on running", 
    "trail running", "ultrarange", "speedcross", "haze", "trainer",
    "shoes", "footwear", "equipment"
  ];
  if (shoeKeywords.some(kw => nLow === kw || nLow.includes(kw))) {
    return true;
  }
  if (shoeField) {
    const sLow = shoeField.toLowerCase().trim();
    if (sLow && sLow !== "-" && (nLow.includes(sLow) || sLow.includes(nLow))) {
      return true;
    }
  }
  return false;
};

const RANKING_MAPPING = {
  name: ["athlete", "name", "player"],
  country: ["country"],
  flag: ["flag"],
  rating: ["ovr", "overall", "rating"],
  pts: ["pts", "points", "asr"],
  sends: ["sends", "totalruns", "total", "#", "runs"],
  sets: ["sets", "total sets"],
  contribution: ["🪙", "contribution"],
  fire: ["🔥", "fire"],
  ig: ["ig", "instagram", "social"],
  avg: ["avg time", "average", "avg"],
  cert: ["cert", "level", "certification"],
  location: ["location", "city", "region", "hometown", "home town"],
  homeGym: ["gym", "home gym"],
  shoe: ["shoe", "shoes", "footwear"],
  shoeSize: ["size", "shoe size"],
};

const SET_LIST_MAPPING = {
  challenge: ["challenge", "track", "level", "course"],
  length: ["length", "dist"],
  elev: ["elev", "gain", "elevation"],
  rating: ["rating", "diff", "difficulty", "points"],
  type: ["type", "style"],
  city: ["city", "location"],
  country: ["country", "nation"],
  flag: ["flag", "emoji"],
  dateSet: ["set on", "updated", "date set"],
  demo: ["demo", "rules", "video", "url"],
  coverImage: ["img", "pic", "photo", "cover", "image", "coverimage"],
  coords: ["coord", "gps", "location", "pin"],
  state: ["state", "prov", "region"],
  leads: ["lead", "lead setter", "leads", "leadsetters"],
  assists: ["assistant", "assistants", "assistant setter", "assistantsetters"],
  isOpen: ["open?"],
  is2026: ["2026?"],
  isAllTime: ["all-time?"],
  sponsorName: ["sponsor name", "challenge sponsor sponsor"],
  sponsorLink: ["sponsor link"],
  notes: ["notes", "note", "desc", "description"],
};

const SETTER_MAPPING = {
  name: ["setter", "name"],
  leads: ["leads"],
  assists: ["assist", "assists", "assistant"],
  sets: ["sets", "total sets"],
  country: ["country", "nation"],
  flag: ["flag", "emoji", "region"],
  ig: ["ig", "instagram"],
  contribution: ["🪙", "contribution"],
  cert: ["cert", "level", "certification"],
  location: ["location", "city"],
  homeGym: ["gym", "home gym"],
};

const LIVE_FEED_MAPPING = {
  athlete: ["athlete", "name", "player"],
  challenge: ["challenge", "track", "level", "course"],
  result: ["result", "time", "pb", "✅"],
  gender: ["div", "gender", "sex"],
  date: ["date", "day", "timestamp"],
  tag: ["tag", "event", "category", "season"],
  proof: ["proof", "link", "video", "url"],
  fire: ["🔥"],
  filmer: ["filmer", "videographer", "filmed by"],
};

export const processRankingData = (csv: string, gender: string) => {
  const dataRows = csvToObjects(csv, RANKING_MAPPING);
  return dataRows
    .map((vals, i) => {
      const pName = (vals.name || "").trim() || "UNKNOWN";
      if (pName.length < 2 || isPlaceholderPlayer(pName)) return null;

      const fixed = fixCountryEntity(vals.country, vals.flag);
      const rawIg = (vals.ig || "")
        .replace(/(https?:\/\/)?(www\.)?instagram\.com\//i, "")
        .replace(/\?.*/, "")
        .replace(/@/g, "")
        .replace(/\/$/, "")
        .trim();

      const pLocation =
        (vals.__raw ? vals.__raw[18] || "" : vals.location || "").trim() ||
        CONFIG.FALLBACKS.UNKNOWN_LOCATION;
      const pHomeGym =
        (vals.__raw ? vals.__raw[20] || "" : vals.homeGym || "").trim() ||
        CONFIG.FALLBACKS.UNAFFILIATED;
      const pTeamLocation = (vals.__raw ? vals.__raw[21] || "" : "").trim();

      const pTeams: TeamProfile[] = [];
      const shoeField = (vals.shoe || "").trim();
      if (vals.__raw) {
        // Check for team slots: (X,Y,Z), (AA,AB,AC), (AD,AE,AF)
        for (let j = 23; j <= 31; j += 3) {
          const tName = (vals.__raw[j] || "").trim();
          if (tName && tName.toUpperCase() !== "UNAFFILIATED" && !isFootwearTeam(tName, shoeField)) {
            pTeams.push({
              name: tName,
              location: (vals.__raw[j + 1] || "").trim(),
              flag: (vals.__raw[j + 2] || "").trim(),
            } as TeamProfile);

          }
        }
      }

      const townFlagRaw = (vals.__raw ? vals.__raw[19] || "" : "").trim();
      const gymFlagRaw = (vals.__raw ? vals.__raw[22] || "" : "").trim();
      const townEntity = fixCountryEntity("", townFlagRaw);
      const gymEntity = fixCountryEntity("", gymFlagRaw);

      const teamNamesStr = pTeams.map((t) => t.name).join(" ");
      const searchKey = normalizeForSearch(
        `${pName} ${fixed.name} ${rawIg} ${pLocation} ${pHomeGym} ${teamNamesStr}`
      );
      return {
        id: `${gender}-${normalizeName(pName)}-${i}`,
        name: pName,
        pKey: normalizeName(pName),
        gender,
        countryName: fixed.name,
        region: fixed.flag,
        location: pLocation,
        homeGym: pHomeGym,
        teams: pTeams,
        teamLocation: pTeamLocation,
        townFlag: townEntity.flag,
        gymFlag: gymEntity.flag,
        igHandle: rawIg,
        rating: cleanNumeric(vals.rating) || 0,
        sends: Math.floor(cleanNumeric(vals.sends) || 0),
        pts: cleanNumeric(vals.pts) || 0,
        sets: Math.floor(cleanNumeric(vals.sets) || 0),
        contributionScore: cleanNumeric(vals.contribution) || 0,
        allTimeFireCount: Math.floor(cleanNumeric(vals.fire) || 0),
        avgTime: cleanNumeric(vals.avg) || 0,
        certLevel: (vals.cert || "").trim().toUpperCase() || "NONE",
        shoe: (vals.shoe || "").trim(),
        shoeSize: (vals.shoeSize || "").trim(),
        searchKey,
      };
    })
    .filter(Boolean);
};

export const processSetListData = (csv: string) => {
  const dataRows = csvToObjects(csv, SET_LIST_MAPPING);
  const map: Record<string, SkillData> = {};
  dataRows.forEach((vals) => {
    const challenge = (vals.challenge || "").trim().toUpperCase();
    if (challenge) {
      const fixed = fixCountryEntity(vals.country, vals.flag);
      const isOpenRaw = vals.isOpen ? String(vals.isOpen).toUpperCase().trim() : "YES";
      const is2026Raw = vals.is2026 ? String(vals.is2026).toUpperCase().trim() : "";
      const isAllTimeRaw = vals.isAllTime ? String(vals.isAllTime).toUpperCase().trim() : "";
      const rulesVideoFromCol = (vals.demo || "").trim();
      const sponsorName = (vals.sponsorName || "").trim();
      const sponsorLink = (vals.sponsorLink || "").trim();

      const isOpenSkill = isOpenRaw === "YES" || isOpenRaw === "TRUE" || isOpenRaw.includes("OPEN");
      const is2026Skill = is2026Raw === "YES" || is2026Raw === "TRUE" || is2026Raw.includes("2026");
      const isAllTimeSkill = isAllTimeRaw === "YES" || isAllTimeRaw === "TRUE" || isAllTimeRaw.includes("ALL");
      const leadsRaw = (vals.leads || "").trim();
      const assistsRaw = (vals.assists || "").trim();

      map[challenge] = {
        name: challenge,
        isOpenSkill,
        is2026Skill,
        isAllTimeSkill,
        flag: fixed.flag || "🏳️",
        city: (vals.city || "").trim().toUpperCase() || "UNKNOWN",
        stateProv: (vals.state || "").trim().toUpperCase(),
        country: fixed.name.toUpperCase() || "UNKNOWN",
        difficulty: parseSkillDifficulty(String(vals.rating || "").trim()),
        points: parseFloat(String(vals.rating || "0").trim()) || 0,
        length: String(vals.length || "").trim(),
        elevation: (vals.elev || "").trim(),
        type: (vals.type || "").trim(),
        dateSet: (vals.dateSet || "").trim(),
        setter: leadsRaw + (assistsRaw ? `, ${assistsRaw}` : ""),
        leadSetters: leadsRaw,
        leadSettersNormalized: getNormalizedNameList(leadsRaw),
        assistantsetters: assistsRaw,
        assistantSettersNormalized: getNormalizedNameList(assistsRaw),
        demoVideo: rulesVideoFromCol || (vals.demo || "").trim(),
        coverImage: (vals.coverImage || "").trim(),
        coordinates: (vals.coords || "").trim(),
        sponsorName,
        sponsorLink,
        notes: (vals.notes || "").trim(),
        searchKey: normalizeForSearch(
          `${challenge} ${vals.city} ${vals.state || ""} ${fixed.name} ${(vals.city || "").replace(/ /g, "")}`
        ),
      };
    }
  });
  return map;
};

export const processSettersData = (csv: string) => {
  const dataRows = csvToObjects(csv, SETTER_MAPPING);
  return dataRows
    .map((vals, i) => {
      const name = (vals.name || "").trim();
      if (!name || isPlaceholderPlayer(name)) return null;
      const fixed = fixCountryEntity(vals.country, vals.flag);

      const pLocation =
        (vals.__raw ? vals.__raw[18] || "" : vals.location || "").trim() ||
        CONFIG.FALLBACKS.UNKNOWN_LOCATION;
      const pHomeGym =
        (vals.__raw ? vals.__raw[20] || "" : vals.homeGym || "").trim() ||
        CONFIG.FALLBACKS.UNAFFILIATED;

      const townFlagRaw = (vals.__raw ? vals.__raw[19] || "" : "").trim();
      const gymFlagRaw = (vals.__raw ? vals.__raw[22] || "" : "").trim();
      const townEntity = fixCountryEntity("", townFlagRaw);
      const gymEntity = fixCountryEntity("", gymFlagRaw);

      const pTeams: TeamProfile[] = [];
      if (vals.__raw) {
        for (let j = 23; j <= 31; j += 3) {
          const tName = (vals.__raw[j] || "").trim();
          if (tName && tName.toUpperCase() !== "UNAFFILIATED" && !isFootwearTeam(tName)) {
            pTeams.push({
              name: tName,
              location: (vals.__raw[j + 1] || "").trim(),
              flag: (vals.__raw[j + 2] || "").trim(),
            } as TeamProfile);

          }
        }
      }

      const teamNamesStr = pTeams.map((t) => t.name).join(" ");
      return {
        id: `setter-${normalizeName(name)}-${i}`,
        name,
        pKey: normalizeName(name),
        region: fixed.flag || "🏳️",
        location: pLocation,
        homeGym: pHomeGym,
        teams: pTeams,
        townFlag: townEntity.flag,
        gymFlag: gymEntity.flag,
        countryName: fixed.name,
        igHandle: (vals.ig || "").replace(/@/g, "").trim(),
        sets: cleanNumeric(vals.sets) || 0,
        leads: cleanNumeric(vals.leads) || 0,
        assists: cleanNumeric(vals.assists) || 0,
        contributionScore: cleanNumeric(vals.contribution) || 0,
        certLevel: (vals.cert || "").trim().toUpperCase() || "NONE",
        searchKey: normalizeForSearch(
          `${name} ${fixed.name} ${pLocation} ${pHomeGym} ${teamNamesStr}`
        ),
      };
    })
    .filter(Boolean);
};

export const processLiveFeedData = (
  csv: string,
  athleteMetadata: Record<string, PlayerProfile> = {},
  skillSetMap: Record<string, SkillData> = {},
) => {
  const result: Record<string, any> = {
    allTimePerformances: {},
    openPerformances: {},
    season26Performances: {},
    allTimeRankings: [],
    openRankings: [],
    season26Rankings: [],
    allTimeLeaderboards: { M: {}, F: {} },
    openLeaderboards: { M: {}, F: {} },
    season26Leaderboards: { M: {}, F: {} },
    athleteMetadata,
    athleteDisplayNameMap: {},
    skillMetadata: skillSetMap,
    atRawBest: {},
    opRawBest: {},
    s26RawBest: {},
    filmerCredits: {},
    recentFeed: [],
  };
  if (!csv) return result;
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  let hIdx = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (/athlete|name|player|challenge|track|course|pb|result|time|name|challenge|track|pb|result/i.test(lines[i])) {
      hIdx = i;
      break;
    }
  }
  if (hIdx === -1) return result;

  const dataRows = csvToObjects(csv, LIVE_FEED_MAPPING, hIdx);
  const OPEN_START = new Date(CONFIG.DATES.OPEN_START);
  const OPEN_END = new Date(CONFIG.DATES.OPEN_END);
  const allTimeAthleteBestTimes: Record<string, { [loc: string]: any }> = {};
  const allTimeAthleteLeaderboards: { M: Record<string, unknown>; F: Record<string, unknown> } = { M: {}, F: {} };
  const allTimeAthleteTotalSubmissions: Record<string, number> = {};
  const openAthleteBestTimes: Record<string, { [loc: string]: any }> = {};
  const openAthleteLeaderboards: { M: Record<string, unknown>; F: Record<string, unknown> } = { M: {}, F: {} };
  const openAthleteTotalSubmissions: Record<string, number> = {};
  const season26AthleteBestTimes: Record<string, Record<string, { label: string; value: string; num: number; videoUrl: string; date: string | null }>> = {};
  const season26AthleteLeaderboards: Record<string, Record<string, Record<string, number>>> = { M: {}, F: {} };
  const season26AthleteTotalSubmissions: Record<string, number> = {};
        const athleteDisplayNameMap: Record<string, string> = {};
  const filmerCreditsCount: Record<string, number> = {};
  const skillRunsHistory: Record<string, unknown[]> = {};

  dataRows.forEach((vals) => {
    const pName = (vals.athlete || "").trim();
    const rawSkill = (vals.challenge || "").trim();
    const numericValue = cleanNumeric(vals.result);
    if (!pName || !rawSkill || numericValue === null) return;

    const rawGenderValue = (vals.gender || "").toUpperCase().trim();
    const baseKey = normalizeName(pName);
    const pGender =
      athleteMetadata[baseKey]?.gender ||
      (rawGenderValue.startsWith("W") || rawGenderValue.startsWith("F")
        ? "F"
        : "M");

    let pKey = baseKey;
    if (isPlaceholderPlayer(pName))
      pKey = `${baseKey}-${pGender.toLowerCase()}`;

    const normC = rawSkill.toUpperCase();
    const isSkillOpen = skillSetMap[normC]?.isOpenSkill;

    const isPlaceholder = isPlaceholderPlayer(pName);

    if (!isPlaceholder) {
      if (!skillRunsHistory[normC]) skillRunsHistory[normC] = [];
      skillRunsHistory[normC].push({
        pKey,
        name: pName,
        gender: pGender,
        challenge: rawSkill,
        num: numericValue,
        time: numericValue,
        videoUrl: vals.proof || (vals.__raw && vals.__raw[7]) || "",
        date: vals.date ? parseSafeDate(vals.date)?.toISOString() || null : null,
      });

      if (!athleteDisplayNameMap[pKey]) athleteDisplayNameMap[pKey] = pName;

      allTimeAthleteTotalSubmissions[pKey] = (allTimeAthleteTotalSubmissions[pKey] || 0) + 1;

      const rawFilmer = (
        vals.filmer ||
        (vals.__raw && vals.__raw[8]) ||
        ""
      ).trim();
      if (rawFilmer) {
        const filmerKey = normalizeName(rawFilmer);
        filmerCreditsCount[filmerKey] = (filmerCreditsCount[filmerKey] || 0) + 1;
      }

      if (!athleteMetadata[pKey]) {
        athleteMetadata[pKey] = {
          sends: 0,
          rating: 0,
          pKey,
          name: pName,
          gender: pGender,
          region: "🏳️",
          location: "",
          homeGym: "",
          teamLocation: "",
          countryName: "",
          searchKey: normalizeForSearch(pName),
        };
      } else if (pName.length > (athleteMetadata[pKey].name || "").length) {
        athleteMetadata[pKey].name = pName;
        athleteDisplayNameMap[pKey] = pName;
      }

      if (!allTimeAthleteBestTimes[pKey]) allTimeAthleteBestTimes[pKey] = {};
      if (
        !allTimeAthleteBestTimes[pKey][normC] ||
        numericValue < allTimeAthleteBestTimes[pKey][normC].num
      ) {
        allTimeAthleteBestTimes[pKey][normC] = {
          label: rawSkill,
          value: vals.result,
          num: numericValue,
          videoUrl: vals.proof || (vals.__raw && vals.__raw[7]) || "",
          date: vals.date ? parseSafeDate(vals.date)?.toISOString() || null : null,
        };
      }
    }
    if (!allTimeAthleteLeaderboards[pGender][normC])
      allTimeAthleteLeaderboards[pGender][normC] = {};
    if (
      !allTimeAthleteLeaderboards[pGender][normC][pKey] ||
      numericValue < allTimeAthleteLeaderboards[pGender][normC][pKey]
    ) {
      allTimeAthleteLeaderboards[pGender][normC][pKey] = numericValue;
    }
    const runDate = vals.date ? parseSafeDate(vals.date) : null;
    const isASROpenTag = (vals.tag || "").toUpperCase().includes("OPEN");
    const isInOpenWindow =
      runDate &&
      !isNaN(runDate.getTime()) &&
      runDate >= OPEN_START &&
      runDate <= OPEN_END;

    if ((isASROpenTag || isInOpenWindow) && isSkillOpen) {
      if (!isPlaceholder) {
        if (!openAthleteBestTimes[pKey]) openAthleteBestTimes[pKey] = {};
        if (
          !openAthleteBestTimes[pKey][normC] ||
          numericValue < openAthleteBestTimes[pKey][normC].num
        ) {
          openAthleteBestTimes[pKey][normC] = {
            label: rawSkill,
            value: vals.result,
            num: numericValue,
            videoUrl: vals.proof || (vals.__raw && vals.__raw[7]) || "",
            date: vals.date ? parseSafeDate(vals.date)?.toISOString() || null : null,
          };
        }
        openAthleteTotalSubmissions[pKey] =
          (openAthleteTotalSubmissions[pKey] || 0) + 1;
      }
      if (!openAthleteLeaderboards[pGender][normC])
        openAthleteLeaderboards[pGender][normC] = {};
      if (
        !openAthleteLeaderboards[pGender][normC][pKey] ||
        numericValue < openAthleteLeaderboards[pGender][normC][pKey]
      ) {
        openAthleteLeaderboards[pGender][normC][pKey] = numericValue;
      }
    }
    const tagString = (vals.tag || "").toUpperCase();
    let is2026 = false;
    if (tagString.includes("2026")) {
        is2026 = true;
    } else if (vals.date) {
        const dateStr = String(vals.date).trim();
        if (dateStr.includes("2026") || /\/(?:20)?26(?:\s|$)/.test(dateStr) || dateStr.endsWith("/26")) {
            is2026 = true;
        } else {
            const d = parseSafeDate(dateStr);
            if (d && d.getFullYear() === 2026) is2026 = true;
        }
    }

    if (is2026) {
      if (!isPlaceholder) {
        if (!season26AthleteBestTimes[pKey]) season26AthleteBestTimes[pKey] = {};
        if (
          !season26AthleteBestTimes[pKey][normC] ||
          numericValue < season26AthleteBestTimes[pKey][normC].num
        ) {
          season26AthleteBestTimes[pKey][normC] = {
            label: rawSkill,
            value: vals.result,
            num: numericValue,
            videoUrl: vals.proof || (vals.__raw && vals.__raw[7]) || "",
            date: vals.date ? parseSafeDate(vals.date)?.toISOString() || null : null,
          };
        }
        season26AthleteTotalSubmissions[pKey] = (season26AthleteTotalSubmissions[pKey] || 0) + 1;
      }
      if (!season26AthleteLeaderboards[pGender][normC])
        season26AthleteLeaderboards[pGender][normC] = {};
      if (
        !season26AthleteLeaderboards[pGender][normC][pKey] ||
        numericValue < season26AthleteLeaderboards[pGender][normC][pKey]
      ) {
        season26AthleteLeaderboards[pGender][normC][pKey] = numericValue;
      }
    }
  });

  const buildPerfs = (source: Record<string, { [loc: string]: { label: string, value: string, num: number, videoUrl: string, date: string | null } }>, mode: "all-time" | "open" | "2026" = "all-time") => {
    const res: Record<string, unknown[]> = {};
    const memoizedBoards: Record<
      string,
      { record: number; rankMap: Map<string, number> }
    > = {};

    Object.keys(source).forEach((pKey) => {
      const pGender = athleteMetadata[pKey]?.gender || "M";
      res[pKey] = Object.entries(source[pKey]).map(
        ([normL, data]: [string, { label: string, value: string, num: number, videoUrl: string, date: string | null }]) => {
          const boardKey = `${pGender}-${normL}-${mode}`;
          if (!memoizedBoards[boardKey]) {
            const allTimeBoard =
              (allTimeAthleteLeaderboards[pGender] || {})[normL] || {};
            const contextBoard = mode === "2026"
              ? (season26AthleteLeaderboards[pGender] || {})[normL] || {}
              : mode === "open"
              ? (openAthleteLeaderboards[pGender] || {})[normL] || {}
              : allTimeBoard;
            const vals = Object.values(allTimeBoard) as number[];
            const record = vals.length ? Math.min(...vals) : 0;
            const sorted = Object.entries(contextBoard).sort(
              (a: [string, unknown], b: [string, unknown]) => (a[1] as number) - (b[1] as number),
            );
            let currentRank = 1;
            let prevTime = -1;
            const rankMap = new Map<string, number>();
            sorted.forEach((e, idx) => {
              const time = e[1] as number;
              if (time !== prevTime) {
                currentRank = idx + 1;
                prevTime = time;
              }
              rankMap.set(e[0], currentRank);
            });

            memoizedBoards[boardKey] = { record, rankMap };
          }

          const { record, rankMap } = memoizedBoards[boardKey];
          const rank = rankMap.get(pKey) || 0;
          const skillMeta: any = skillSetMap[normL] || {};
          return {
            label: data.label,
            value: data.value,
            num: data.num,
            rank,
            points: record && data.num ? (record / data.num) * 100 : 0, skillPoints: skillMeta.points || 0,
            videoUrl: data.videoUrl,
            date: data.date,
            city: skillMeta.city,
            country: skillMeta.country,
            location: skillMeta.city || skillMeta.country,
          };
        },
      );

      if (athleteMetadata[pKey]) {
        athleteMetadata[pKey].films = filmerCreditsCount[pKey] || 0;
      }
    });
    return res;
  };

  result.allTimePerformances = buildPerfs(allTimeAthleteBestTimes, "all-time");
  result.season26Performances = buildPerfs(season26AthleteBestTimes, "2026");
    result.openPerformances = buildPerfs(openAthleteBestTimes, "open");
  result.allTimeLeaderboards = allTimeAthleteLeaderboards;
  result.openLeaderboards = openAthleteLeaderboards;
  result.season26Leaderboards = season26AthleteLeaderboards;
  result.season26RawBest = season26AthleteBestTimes;
      result.athleteDisplayNameMap = athleteDisplayNameMap;
  result.skillRunsHistory = skillRunsHistory;
  result.skillMetadata = skillSetMap;
  result.atRawBest = allTimeAthleteBestTimes;
  result.opRawBest = openAthleteBestTimes;
  result.filmerCredits = filmerCreditsCount;

  const chronologicalRuns = [...dataRows]
    .filter((send: Record<string, unknown>) => !isPlaceholderPlayer((String(send.athlete) || "").trim()))
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const dateA = a.date ? parseSafeDate(a.date as string)?.getTime() || 0 : 0;
      const dateB = b.date ? parseSafeDate(b.date as string)?.getTime() || 0 : 0;
      return dateB - dateA;
    })
    .slice(0, 100);

  const recentFeedMemoBoards: Record<string, [string, unknown][]> = {};
  result.recentFeed = chronologicalRuns.map((send, i) => {
    const pName = (send.athlete || "").trim();
    const normC = (send.challenge || "").trim().toUpperCase();
    const numericValue = cleanNumeric(send.result);
    const pKey = normalizeName(pName);
    const athleteMeta = athleteMetadata[pKey];
    const pGender = athleteMeta?.gender || "M";

    const boardKey = `${pGender}-${normC}`;
    let sortedathletes = recentFeedMemoBoards[boardKey];
    if (!sortedathletes) {
      const skillRecords =
        (allTimeAthleteLeaderboards[pGender] || {})[normC] || {};
      sortedathletes = Object.entries(skillRecords).sort(
        (a: [string, unknown], b: [string, unknown]) => (a[1] as number) - (b[1] as number),
      );
      recentFeedMemoBoards[boardKey] = sortedathletes;
    }

    const runRank =
      sortedathletes.findIndex((entry) => entry[1] === numericValue) + 1;

    return {
      id: `feed-${i}`,
      name: pName,
      athlete: athleteMeta,
      athleteMeta: athleteMeta,
      skillName: send.challenge,
      challenge: { name: send.challenge, ...(skillSetMap[normC] || {}) },
      result: send.result,
      time: numericValue,
      videoUrl: send.proof || (send.__raw && send.__raw[7]) || "",
      isCR: runRank === 1 && !isPlaceholderPlayer(pName),
      rank: runRank,
      timeString: send.date || "LATEST",
    };
  });

  const athleteFirstSendsMap: Record<string, number> = {};
  Object.keys(skillRunsHistory).forEach((normC) => {
    const runs = skillRunsHistory[normC].filter(r => parseSafeDate((r as any).date));
    if (runs.length > 0) {
      runs.sort((a, b) => (parseSafeDate((a as any).date)?.getTime() || 0) - (parseSafeDate((b as any).date)?.getTime() || 0));
      const firstDate = parseSafeDate((runs[0] as any).date)?.getTime() || 0;
      const firstRunners = Array.from(new Set(runs.filter(r => (parseSafeDate((r as any).date)?.getTime() || 0) === firstDate).map(r => (r as any).pKey)));
      firstRunners.forEach(pKey => {
        athleteFirstSendsMap[pKey] = (athleteFirstSendsMap[pKey] || 0) + 1;
      });
    }
  });

  result.season26Rankings = Object.keys(athleteMetadata)
    .filter((k) => {
      const meta = athleteMetadata[k];
      const perfs = result.season26Performances[k] || [];
      return !isPlaceholderPlayer(meta.name) && perfs.length > 0;
    })
    .map((pKey) => {
      const meta = athleteMetadata[pKey];
      const perfs = result.season26Performances[pKey] || [];
      const top10Perfs = [...perfs].sort((a, b) => (b.skillPoints || 0) - (a.skillPoints || 0)).slice(0, 10);
      const top10TotalPts = top10Perfs.reduce((sum: number, p: { skillPoints?: number }) => sum + (p.skillPoints || 0), 0);
      const totalskillPoints = perfs.reduce((sum: number, p: { skillPoints?: number }) => sum + (p.skillPoints || 0), 0);
      const latestRunDate = perfs.reduce((latest: Date, p: { date?: string | null }) => {
        if (!p.date) return latest;
        const runDate = parseSafeDate(p.date);
        if (!runDate) return latest;
        return runDate > latest ? runDate : latest;
      }, new Date(0));
      return {
        ...meta,
        id: `season26-${pKey}`,
        rating: top10Perfs.length > 0 ? top10TotalPts / top10Perfs.length : 0,
        athletes: perfs.length,
        challenges: perfs.length,
        sends: Math.max(season26AthleteTotalSubmissions[pKey] || 0, perfs.length),
        firstSends: athleteFirstSendsMap[pKey] || 0,
        latestRunDate,
        pts: totalskillPoints,
        sets: meta.sets || 0,
      };
    })
    .sort((a: any, b: any) => {
      if (Math.abs((b.rating || 0) - (a.rating || 0)) > 0.000001) {
        return (b.rating || 0) - (a.rating || 0);
      }
      if ((b.pts || 0) !== (a.pts || 0)) {
        return (b.pts || 0) - (a.pts || 0);
      }
      if ((b.sends || 0) !== (a.sends || 0)) {
        return (b.sends || 0) - (a.sends || 0);
      }
      return (a.latestRunDate?.getTime() || Infinity) - (b.latestRunDate?.getTime() || Infinity);
    });


  result.openRankings = Object.keys(athleteMetadata)
    .filter((k) => {
      const meta = athleteMetadata[k];
      const perfs = result.openPerformances[k] || [];
      return !isPlaceholderPlayer(meta.name) && perfs.length > 0;
    })
    .map((pKey) => {
      const meta = athleteMetadata[pKey];
      const perfs = result.openPerformances[pKey] || [];
      const top10Perfs = [...perfs].sort((a, b) => (b.skillPoints || 0) - (a.skillPoints || 0)).slice(0, 10);
      const top10TotalPts = top10Perfs.reduce((sum: number, p: { skillPoints?: number }) => sum + (p.skillPoints || 0), 0);
      const totalskillPoints = perfs.reduce((sum: number, p: { skillPoints?: number }) => sum + (p.skillPoints || 0), 0);
      const latestRunDate = perfs.reduce((latest: Date, p: { date?: string | null }) => {
        if (!p.date) return latest;
        const runDate = parseSafeDate(p.date);
        if (!runDate) return latest;
        return runDate > latest ? runDate : latest;
      }, new Date(0));
      return {
        ...meta,
        id: `open-${pKey}`,
        rating: top10Perfs.length > 0 ? top10TotalPts / top10Perfs.length : 0,
        athletes: perfs.length,
        challenges: perfs.length,
        sends: Math.max(openAthleteTotalSubmissions[pKey] || 0, perfs.length),
        firstSends: athleteFirstSendsMap[pKey] || 0,
        latestRunDate,
        pts: totalskillPoints,
        sets: meta.sets || 0,
      };
    })
    .sort((a: any, b: any) => {
      if (Math.abs((b.rating || 0) - (a.rating || 0)) > 0.000001) {
        return (b.rating || 0) - (a.rating || 0);
      }
      if ((b.pts || 0) !== (a.pts || 0)) {
        return (b.pts || 0) - (a.pts || 0);
      }
      if ((b.sends || 0) !== (a.sends || 0)) {
        return (b.sends || 0) - (a.sends || 0);
      }
      return (a.latestRunDate?.getTime() || Infinity) - (b.latestRunDate?.getTime() || Infinity);
    });


  result.allTimeRankings = Object.keys(athleteMetadata)
    .filter((k) => {
      const meta = athleteMetadata[k];
      const perfs = result.allTimePerformances[k] || [];
      return !isPlaceholderPlayer(meta.name) && perfs.length > 0;
    })
    .map((pKey) => {
      const meta = athleteMetadata[pKey];
      const perfs = result.allTimePerformances[pKey] || [];
      const top10Perfs = [...perfs].sort((a, b) => (b.skillPoints || 0) - (a.skillPoints || 0)).slice(0, 10);
      const top10TotalPts = top10Perfs.reduce((sum: number, p: { skillPoints?: number }) => sum + (p.skillPoints || 0), 0);
      const totalskillPoints = perfs.reduce((sum: number, p: { skillPoints?: number }) => sum + (p.skillPoints || 0), 0);
      const latestRunDate = perfs.reduce((latest: Date, p: { date?: string | null }) => {
        if (!p.date) return latest;
        const runDate = parseSafeDate(p.date);
        if (!runDate) return latest;
        return runDate > latest ? runDate : latest;
      }, new Date(0));
      return {
        ...meta,
        id: `at-${pKey}`,
        rating: top10Perfs.length > 0 ? top10TotalPts / top10Perfs.length : 0,
        athletes: perfs.length,
        challenges: perfs.length,
        sends: Math.max(allTimeAthleteTotalSubmissions[pKey] || 0, perfs.length),
        firstSends: athleteFirstSendsMap[pKey] || 0,
        latestRunDate,
        pts: totalskillPoints,
        // Using their sets from metadata (which came from CSV columns)
        sets: meta.sets || 0,
      };
    })
    .sort((a: any, b: any) => {
      if (Math.abs((b.rating || 0) - (a.rating || 0)) > 0.000001) {
        return (b.rating || 0) - (a.rating || 0);
      }
      if ((b.pts || 0) !== (a.pts || 0)) {
        return (b.pts || 0) - (a.pts || 0);
      }
      if ((b.sends || 0) !== (a.sends || 0)) {
        return (b.sends || 0) - (a.sends || 0);
      }
      return (a.latestRunDate?.getTime() || Infinity) - (b.latestRunDate?.getTime() || Infinity);
    });

  return result;
};

export const calculateWofStats = (
  data: PlayerProfile[],
  atPerfs: Record<string, { city?: string; country?: string; label?: string; [key: string]: unknown }[]>,
  lbAT: { M: Record<string, unknown>; F: Record<string, unknown> },
  atMet: Record<string, PlayerProfile>,
  settersWithImpact: SetterProfile[],
  cMet?: Record<string, SkillData>,
) => {
  try {
    if (!data || !data.length) return null;
    const qualifiedAthletes = data
      .filter((p) => !isPlaceholderPlayer(p.name) && (p.challenges || 0) >= 3)
      .map((p) => {
        const performances = atPerfs[p.pKey] || [];
        const uniqueCities = new Set<string>();
        const uniqueCountries = new Set<string>();
        performances.forEach((run: Record<string, unknown>) => {
          const skillKey = String(run.label || run.name || run.challenge || "").toUpperCase();
          const skillMeta = (cMet && skillKey && cMet[skillKey]) || {};
          const city = String(run.city || skillMeta.city || "").trim().toUpperCase();
          const country = String(run.country || skillMeta.country || "").trim().toUpperCase();
          if (city && city !== "UNKNOWN" && city !== "N/A" && city !== "NONE") {
            uniqueCities.add(city);
          }
          if (country && country !== "UNKNOWN" && country !== "N/A" && country !== "NONE") {
            uniqueCountries.add(country);
          }
        });

        return {
          ...p,
          cities: uniqueCities.size,
          countries: uniqueCountries.size,
        };
      });
    return {
      topStats: {
        rating: [...qualifiedAthletes]
          .filter((a) => (a.rating || 0) > 0)
          .sort((a: any, b: any) => {
            if (Math.abs((b.rating || 0) - (a.rating || 0)) > 0.000001) {
              return (b.rating || 0) - (a.rating || 0);
            }
            if ((b.pts || 0) !== (a.pts || 0)) {
              return (b.pts || 0) - (a.pts || 0);
            }
            if ((b.sends || 0) !== (a.sends || 0)) {
              return (b.sends || 0) - (a.sends || 0);
            }
            return (a.latestRunDate?.getTime() || Infinity) - (b.latestRunDate?.getTime() || Infinity);
          })
          .slice(0, 20),
        pts: [...qualifiedAthletes]
          .filter((a) => (a.pts || 0) > 0)
          .sort((a: any, b: any) => (b.pts || 0) - (a.pts || 0) || b.sends - a.sends)
          .slice(0, 20),
        sends: [...qualifiedAthletes]
          .filter((a) => (a.sends || 0) > 0)
          .sort((a, b) => b.sends - a.sends)
          .slice(0, 20),
        firstSends: [...qualifiedAthletes]
          .filter((a) => (a.firstSends || 0) > 0)
          .sort((a, b) => (b.firstSends || 0) - (a.firstSends || 0) || b.sends - a.sends)
          .slice(0, 20),
        cities: [...qualifiedAthletes]
          .filter((a) => (a.cities || 0) > 0)
          .sort((a, b) => (b.cities || 0) - (a.cities || 0) || (b.challenges || 0) - (a.challenges || 0) || b.sends - a.sends)
          .slice(0, 20),
        countries: [...qualifiedAthletes]
          .filter((a) => (a.countries || 0) > 0)
          .sort((a, b) => (b.countries || 0) - (a.countries || 0) || (b.challenges || 0) - (a.challenges || 0) || b.sends - a.sends)
          .slice(0, 20),
        impact: [...(settersWithImpact || [])]
          .filter((a) => (a.impact || 0) > 0)
          .sort((a, b) => b.impact - a.impact)
          .slice(0, 20),
        sets: [...(settersWithImpact || [])]
          .filter((a) => (a.sets || 0) > 0)
          .sort((a, b) => b.sets - a.sets)
          .slice(0, 20),
        contributionScore: [...qualifiedAthletes]
          .filter((a) => (a.contributionScore || 0) > 0)
          .sort((a, b) => (b.contributionScore || 0) - (a.contributionScore || 0))
          .slice(0, 20),
      },
    };
  } catch (e) {
    console.error("HOF stats calculation failed", e);
    return null;
  }
};

export const fetchGoogleSheetCSV = async (sheetId: string, gid: string): Promise<string> => {
  const cacheBucket = Math.floor(Date.now() / 300000); // 5 mins cache bucket for gviz
  const directUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}&cb=${cacheBucket}`;
  const proxyUrl = `/api/proxy-sheet?gid=${gid}&cb=${cacheBucket}`;

  let response = await fetch(directUrl).catch(() => null);

  if (!response || !response.ok) {
    response = await fetch(proxyUrl);
  }

  if (!response || !response.ok) {
    throw new Error(`Failed to fetch spreadsheet: ${response?.statusText || 'Unknown Network Error'}`);
  }

  return response.text();
};
