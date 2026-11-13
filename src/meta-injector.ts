import {
  normalizeName,
  CONFIG,
  getCombinedFlags,
  toTitleCase,
  fixCountryEntity,
  formatLocation,
} from "./lib/asr-utils.ts";
import { computeAllState } from "./lib/asr-data-compute.ts";
import type { ASRDataContext, PlayerProfile } from "./types.ts";

export interface MetaData {
  title: string;
  description: string;
  initialData?: ASRDataContext;
  ogType?:
    | "player"
    | "skill"
    | "challenge"
    | "team"
    | "gym"
    | "setter"
    | "region"
    | "directory";
  ogStats?: { value: string; label: string }[];
  ogMapCoords?: [number, number] | null;
}

let cachedData: ASRDataContext | null = null;
let lastFetchTime = 0;
let inflightFetch: Promise<ASRDataContext | null> | null = null;

async function fetchSheets(): Promise<ASRDataContext | null> {
  const getProxyUrl = (gid: string) =>
    `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;

  const fetchWithRetry = async (url: string) => {
    for (let i = 0; i < 3; i++) {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.ok) return await res.text();
    }
    return "";
  };

  const [mensCsv, womensCsv, liveCsv, setsCsv] = await Promise.all([
    fetchWithRetry(getProxyUrl(CONFIG.SHEET_GIDS.MENS)),
    fetchWithRetry(getProxyUrl(CONFIG.SHEET_GIDS.WOMENS)),
    fetchWithRetry(getProxyUrl(CONFIG.SHEET_GIDS.LIVE)),
    fetchWithRetry(getProxyUrl(CONFIG.SHEET_GIDS.SETS)),
  ]);

  const hasTotalError = !mensCsv && !womensCsv && !liveCsv;
  const hasPartialError =
    !hasTotalError && (!mensCsv || !womensCsv || !liveCsv || !setsCsv);

  const parsedState = computeAllState({
    rM: mensCsv,
    rF: womensCsv,
    rLive: liveCsv,
    rSet: setsCsv,
    hasTotalError,
    hasPartialError,
  });

  cachedData = parsedState;
  lastFetchTime = Date.now();
  return cachedData;
}

async function ensureCachedData(): Promise<ASRDataContext | null> {
  const timeSinceLastFetch = Date.now() - lastFetchTime;
  if (cachedData && timeSinceLastFetch <= 5 * 60 * 1000) {
    return cachedData;
  }
  if (!inflightFetch) {
    inflightFetch = fetchSheets().finally(() => {
      inflightFetch = null;
    });
  }
  return inflightFetch;
}

export async function getPageMeta(
  urlPath: string,
  searchParams: URLSearchParams,
  includeInitialData: boolean = true,
): Promise<MetaData> {
  try {
    await ensureCachedData();
  } catch (e) {
    console.error("Meta fetch failed", e);
  }

  const baseTitle = "APEX SKILL RUN";
  const baseDesc = "FINDING THE HIGHEST SKILLED HUMANS IRL 🌎 🌍 🌏";

  if (!cachedData) return { title: baseTitle, description: baseDesc };

  let title = baseTitle;
  let description = baseDesc;
  let ogType: MetaData["ogType"];
  let ogStats: { value: string; label: string }[] | undefined;
  let ogMapCoords: [number, number] | null = null;

  try {
    const parts = urlPath.replace(/^\//, "").split("/").filter(Boolean);
    const eventType = searchParams.get("mode") || searchParams.get("eventType") || "all-time";

    const masterSkillMap = new Map<string, any>();
    (cachedData.masterSkillList || []).forEach((s: any) => {
      if (s?.name) masterSkillMap.set(String(s.name).toUpperCase(), s);
    });

    if (parts[0] === "players" && parts[1]) {
      const slug = normalizeName(decodeURIComponent(parts[1]));
      const isAllTime = eventType === "all-time";

      const rankData = isAllTime
        ? cachedData.data || []
        : eventType === "2026"
          ? cachedData.season26Data || []
          : cachedData.openData || [];
      const player =
        rankData.find((p: PlayerProfile) => normalizeName(p.name || "") === slug) ||
        (cachedData.data || []).find(
          (p: PlayerProfile) => normalizeName(p.name || "") === slug,
        );

      if (player) {
        const flags = getCombinedFlags(player).trim();
        const titlePrefix = flags ? `${flags} ` : "";
        title = `${titlePrefix}${player.name.toUpperCase()}`;
        const leaderboards = isAllTime
          ? cachedData.playerLB_AT
          : eventType === "2026"
            ? cachedData.playerLB_2026
            : cachedData.playerLB_OP;
        const gender = player.gender || "M";
        const pKey = player.pKey || normalizeName(player.name || "");
        const lbEntry = (leaderboards as any)?.[gender]?.[pKey];
        const rank = lbEntry?.rank || "UR";
        const effectiveRating = lbEntry?.rating ?? player.rating ?? 0;
        const rating = Number(effectiveRating).toFixed(2);
        const gym =
          player.homeGym && player.homeGym !== CONFIG.FALLBACKS.UNAFFILIATED
            ? player.homeGym
            : player.location &&
                player.location !== CONFIG.FALLBACKS.UNKNOWN_LOCATION
              ? player.location
              : player.countryName &&
                  player.countryName !== CONFIG.FALLBACKS.UNKNOWN_LOCATION
                ? player.countryName
                : "UNAFFILIATED";

        const skillsCount = lbEntry?.challenges ?? player.challenges ?? 0;
        const runsCount = lbEntry?.sends ?? player.sends ?? 0;
        const firstSendsCount = lbEntry?.firstSends ?? player.firstSends ?? 0;

        let newDesc = `CHALLENGES: ${skillsCount} | SENDS: ${runsCount}`;
        if (firstSendsCount > 0) newDesc += ` | 1ST SENDS: ${firstSendsCount}`;

        if (isAllTime) {
          description = newDesc.toUpperCase();
        } else if (eventType === "2026") {
          description = `2026 SEASON STATS: ${rating} RATING | 2026 RANK: ${rank || "UR"} | GYM: ${gym}`.toUpperCase();
        } else {
          description = `OPEN STATS: ${rating} RATING | OPEN RANK: ${rank || "UR"} | GYM: ${gym}`.toUpperCase();
        }

        const setterData = (cachedData.settersWithImpact as any[])?.find(
          (s) => normalizeName(s.name) === slug,
        );
        const setsCount = setterData?.sets || 0;
        const impactCount = setterData?.impact || 0;

        ogType = "player";
        ogStats = [
          { value: rating, label: "RATING" },
          { value: rank === "UR" ? "UR" : `${rank}`, label: "RANK" },
        ];

        if (setsCount > 0) {
          ogStats.push({ value: String(Math.round(setsCount)), label: "SETS" });
        }
        if (impactCount > 0) {
          ogStats.push({
            value: String(Math.round(impactCount)),
            label: "IMPACT",
          });
        }

        const completedWithCoords: any[] = [];
        masterSkillMap.forEach((mSkill, upperName) => {
          const hasSent =
            cachedData?.lbAT?.M?.[upperName]?.[pKey] ||
            cachedData?.lbAT?.F?.[upperName]?.[pKey] ||
            cachedData?.lbSeason26?.M?.[upperName]?.[pKey] ||
            cachedData?.lbSeason26?.F?.[upperName]?.[pKey];
          if (
            hasSent &&
            Array.isArray(mSkill.parsedCoords) &&
            mSkill.parsedCoords.length === 2
          ) {
            completedWithCoords.push(mSkill);
          }
        });
        completedWithCoords.sort(
          (a, b) => (Number(b.points) || 0) - (Number(a.points) || 0),
        );
        ogMapCoords =
          completedWithCoords.length > 0
            ? completedWithCoords[0].parsedCoords
            : null;
      }
    } else if (parts[0] === "setters" && parts[1]) {
      const slug = normalizeName(decodeURIComponent(parts[1]));
      const setter: any =
        (cachedData.settersWithImpact as any[])?.find(
          (s) => normalizeName(s.name || "") === slug,
        ) || (cachedData.setterMet as any)?.[slug];
      const athleteMeta: any = (cachedData.atMet as any)?.[slug];

      if (setter || athleteMeta) {
        const displayName = setter?.name || athleteMeta?.name || decodeURIComponent(parts[1]);
        const flags = getCombinedFlags(setter || athleteMeta).trim();
        const titlePrefix = flags ? `${flags} ` : "";
        title = `${titlePrefix}${String(displayName).toUpperCase()}`;

        const impactCount = Math.round(Number(setter?.impact || 0));
        const setsCount = Math.round(Number(setter?.sets || 0));
        const leadsCount = Math.round(Number(setter?.leads || 0));
        const coins = Number(
          athleteMeta?.contributionScore ?? setter?.contribution ?? 0,
        );

        description = `IMPACT: ${impactCount} | SETS: ${setsCount} | LEADS: ${leadsCount}`.toUpperCase();
        ogType = "setter";
        ogStats = [
          { value: String(impactCount), label: "IMPACT" },
          { value: String(setsCount), label: "SETS" },
        ];
        if (leadsCount > 0) {
          ogStats.push({ value: String(leadsCount), label: "LEADS" });
        }
        if (coins > 0) {
          ogStats.push({ value: coins.toFixed(2), label: "COIN" });
        }

        const authoredWithCoords = (cachedData.masterSkillList || []).filter(
          (c: any) => {
            if (!Array.isArray(c.parsedCoords) || c.parsedCoords.length !== 2)
              return false;
            const leads = String(c.leadSetters || "")
              .split(",")
              .map((n) => normalizeName(n));
            const assists = String(c.assistantsetters || "")
              .split(",")
              .map((n) => normalizeName(n));
            return leads.includes(slug) || assists.includes(slug);
          },
        );
        authoredWithCoords.sort(
          (a: any, b: any) =>
            (Number(b.totalAllTimeRuns) || 0) - (Number(a.totalAllTimeRuns) || 0),
        );
        ogMapCoords =
          authoredWithCoords.length > 0
            ? (authoredWithCoords[0] as any).parsedCoords
            : null;
      }
    } else if ((parts[0] === "challenges" || parts[0] === "map") && parts[1]) {
      const slug = normalizeName(decodeURIComponent(parts[1]));
      const masterSkill: any = (cachedData.masterSkillList || []).find(
        (c: any) => normalizeName(c.name || "") === slug,
      );
      const fallbackSkillStr = !masterSkill
        ? Object.keys(cachedData.cMet || {}).find((c) => normalizeName(c) === slug)
        : undefined;
      const skillStr = masterSkill?.name || fallbackSkillStr;

      if (skillStr) {
        const upperSkill = String(skillStr).toUpperCase();
        const skillInfo: any =
          masterSkill ||
          cachedData.cMet?.[upperSkill] ||
          cachedData.cMet?.[skillStr] ||
          {};
        const flags = getCombinedFlags(skillInfo).trim();
        const titlePrefix = flags ? `${flags} ` : "";
        title = `${titlePrefix}${upperSkill} CHALLENGE SEND`;

        const isAllTime = eventType === "all-time";
        const leaderboards = isAllTime
          ? cachedData.lbAT
          : eventType === "2026"
            ? cachedData.lbSeason26
            : cachedData.lbOpen;

        let totalClears = 0;
        if (leaderboards) {
          const mData =
            leaderboards.M?.[upperSkill] || leaderboards.M?.[skillStr] || {};
          const fData =
            leaderboards.F?.[upperSkill] || leaderboards.F?.[skillStr] || {};
          totalClears = Object.keys(mData).length + Object.keys(fData).length;
        }

        const locStr =
          skillInfo.city && skillInfo.city !== "UNKNOWN"
            ? toTitleCase(skillInfo.city)
            : skillInfo.country && skillInfo.country !== "UNKNOWN"
              ? toTitleCase(skillInfo.country)
              : "Secret Location";

        const totalRunsCount = isAllTime
          ? skillInfo.totalAllTimeRuns || skillInfo.totalRuns || totalClears
          : totalClears;
        const ptsFormatted = skillInfo.points
          ? Number(skillInfo.points).toFixed(2)
          : "--";
        description = `SENDS: ${totalRunsCount} | 📍 ${locStr}`.toUpperCase();
        ogType = "challenge";
        ogStats = [
          { value: ptsFormatted, label: "POINTS" },
          { value: String(totalRunsCount), label: "SENDS" },
        ];
        ogMapCoords = Array.isArray(skillInfo.parsedCoords)
          ? skillInfo.parsedCoords
          : null;
      }
    } else if ((parts[0] === "gyms" || parts[0] === "teams") && parts[1]) {
      const slug = normalizeName(decodeURIComponent(parts[1]));
      const primaryCat = parts[0] === "gyms" ? "gyms" : "teams";
      const secondaryCat = primaryCat === "gyms" ? "teams" : "gyms";
      const contextKey =
        eventType === "2026"
          ? "season26"
          : eventType === "open"
            ? "open"
            : "allTime";

      const findInPool = (cat: "gyms" | "teams", ctx: string) => {
        const list: any[] = (cachedData?.teamsAggregated as any)?.[cat]?.[ctx] || [];
        const idx = list.findIndex((t) => normalizeName(t?.name || "") === slug);
        if (idx === -1) return null;
        let tieRank = 1;
        for (let i = 1; i <= idx; i++) {
          if (Math.round((list[i].pts || 0) * 100) !== Math.round((list[i - 1].pts || 0) * 100)) {
            tieRank = i + 1;
          }
        }
        return { entity: list[idx], rank: tieRank, category: cat };
      };

      const resolved =
        findInPool(primaryCat, contextKey) ||
        findInPool(primaryCat, "allTime") ||
        findInPool(secondaryCat, contextKey) ||
        findInPool(secondaryCat, "allTime");

      if (resolved) {
        const { entity, rank, category } = resolved;
        const flags = getCombinedFlags(entity).trim();
        const titlePrefix = flags && flags !== "🏳️" ? `${flags} ` : "";
        title = `${titlePrefix}${String(entity.name).toUpperCase()}`;

        const ptsStr = Number(entity.pts || 0).toFixed(2);
        const playersCount = Number(entity.playersCount || entity.players?.length || 0);
        const sendsCount = Number(entity.runsCount || 0);
        const labelType = category === "gyms" ? "GYM" : "TEAM";

        description = `${labelType} | POINTS: ${ptsStr} | PLAYERS: ${playersCount} | SENDS: ${sendsCount}`;
        ogType = category === "gyms" ? "gym" : "team";
        ogStats = [
          { value: ptsStr, label: "POINTS" },
          { value: String(rank), label: "RANK" },
          { value: String(playersCount), label: "PLAYERS" },
          { value: String(sendsCount), label: "SENDS" },
        ];
      }
    } else if (parts[0] === "regions" && parts[1]) {
      const rawRegion = decodeURIComponent(parts[1]).trim();
      const regionUpper = rawRegion
        .toUpperCase()
        .replace(/[\uD83C][\uDDE6-\uDDFF]|\p{Extended_Pictographic}/gu, "")
        .trim();
      const targetTokens = regionUpper
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const potentialCountry = targetTokens[targetTokens.length - 1] || "";
      const flagInfo = fixCountryEntity(potentialCountry, "");
      const flag =
        flagInfo.flag && flagInfo.flag !== "🏳️"
          ? flagInfo.flag
          : getCombinedFlags(rawRegion).trim();
      const titlePrefix = flag && flag !== "🏳️" ? `${flag} ` : "";

      const matchingSkills = (cachedData.masterSkillList || []).filter((c: any) => {
        const locStr = formatLocation(c);
        if (!locStr || locStr === "UNKNOWN") return false;
        const stripped = locStr
          .replace(/[\uD83C][\uDDE6-\uDDFF]|\p{Extended_Pictographic}/gu, "")
          .trim()
          .toUpperCase();
        const objTokens = stripped
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (objTokens.length >= targetTokens.length) {
          return targetTokens.every((t) => objTokens.includes(t));
        }
        return (
          objTokens.length > 0 &&
          objTokens[0] === targetTokens[0] &&
          objTokens.every((t) => targetTokens.includes(t))
        );
      });

      matchingSkills.sort(
        (a: any, b: any) =>
          (Number(b.totalAllTimeRuns) || 0) - (Number(a.totalAllTimeRuns) || 0),
      );
      const totalRegionSends = matchingSkills.reduce(
        (sum: number, c: any) => sum + Number(c.totalAllTimeRuns || c.totalRuns || 0),
        0,
      );

      title = `${titlePrefix}${regionUpper}`;
      description = `CHALLENGES: ${matchingSkills.length} | SENDS: ${totalRegionSends} | APEX SKILL RUN`;
      ogType = "region";
      ogStats = [
        { value: String(matchingSkills.length), label: "CHALLENGES" },
        { value: String(totalRegionSends), label: "SENDS" },
      ];
      const topWithCoords = matchingSkills.find(
        (c: any) => Array.isArray(c.parsedCoords) && c.parsedCoords.length === 2,
      );
      ogMapCoords = topWithCoords ? (topWithCoords as any).parsedCoords : null;
    } else if (
      parts[0] === "rankings" ||
      parts[0] === "challenges" ||
      parts[0] === "map" ||
      parts[0] === "hof"
    ) {
      const kpi: any = cachedData.kpiStats || {};
      const totalPlayers = Number(kpi.totalAthletes || (cachedData.data || []).length || 0);
      const totalSkills = Number(
        kpi.totalSkills || (cachedData.masterSkillList || []).length || 0,
      );
      const totalRuns = Number(kpi.totalRuns || 0);
      const totalCountries = Number(kpi.totalCountries || 0);

      if (parts[0] === "rankings") {
        title = "GLOBAL RANKINGS — APEX SKILL RUN";
        description = `PLAYERS: ${totalPlayers} | CHALLENGES: ${totalSkills} | SENDS: ${totalRuns} | COUNTRIES: ${totalCountries}`;
      } else if (parts[0] === "hof") {
        title = "HALL OF FAME — APEX SKILL RUN";
        description = `ALL-TIME CHAMPIONS & WORLD RECORDS | PLAYERS: ${totalPlayers} | SENDS: ${totalRuns}`;
      } else {
        title = "CHALLENGE MAP — APEX SKILL RUN";
        description = `CHALLENGES: ${totalSkills} | SENDS: ${totalRuns} | COUNTRIES: ${totalCountries}`;
      }

      ogType = "directory";
      ogStats = [
        { value: String(totalSkills), label: "CHALLENGES" },
        { value: String(totalPlayers), label: "PLAYERS" },
        { value: String(totalRuns), label: "SENDS" },
        { value: String(totalCountries), label: "COUNTRIES" },
      ];
    }
  } catch (e) {
    console.error("Meta evaluation error", e);
  }

  return {
    title,
    description,
    initialData: includeInitialData ? cachedData : undefined,
    ogType,
    ogStats,
    ogMapCoords,
  };
}
