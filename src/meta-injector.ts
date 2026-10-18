import { normalizeName, CONFIG, getCombinedFlags, toTitleCase } from "./lib/asr-utils.ts";
import { computeAllState } from "./lib/asr-data-compute.ts";
import type { ASRDataContext, PlayerProfile } from "./types.ts";

export interface MetaData {
  title: string;
  description: string;
  initialData?: ASRDataContext;
  ogType?: 'player' | 'skill' | 'challenge';
  ogStats?: { value: string; label: string }[];
  ogMapCoords?: [number, number] | null;
}

let cachedData: ASRDataContext | null = null;
let lastFetchTime = 0;

async function fetchSheets() {
  const getProxyUrl = (gid: string) => `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  
  const fetchWithRetry = async (url: string) => {
    for (let i = 0; i < 3; i++) {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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
  const hasPartialError = !hasTotalError && (!mensCsv || !womensCsv || !liveCsv || !setsCsv);

  const parsedState = computeAllState({
    rM: mensCsv,
    rF: womensCsv,
    rLive: liveCsv,
    rSet: setsCsv,
    hasTotalError,
    hasPartialError
  });

  cachedData = parsedState;
  lastFetchTime = Date.now();
  return cachedData;
}

export async function getPageMeta(urlPath: string, searchParams: URLSearchParams): Promise<MetaData> {
  const timeSinceLastFetch = Date.now() - lastFetchTime;
  if (!cachedData || timeSinceLastFetch > 5 * 60 * 1000) {
    try {
      await fetchSheets();
    } catch(e) {
      console.error("Meta fetch failed", e);
    }
  }

  const baseTitle = "APEX SKILL RUN";
  const baseDesc = "FINDING THE HIGHEST SKILLED HUMANS IRL 🌎 🌍 🌏";

  if (!cachedData) return { title: baseTitle, description: baseDesc };

  let title = baseTitle;
  let description = baseDesc;
  let ogType: 'player' | 'challenge' | undefined;
  let ogStats: { value: string; label: string }[] | undefined;
  let ogMapCoords: [number, number] | null = null;

  try {
    const parts = urlPath.replace(/^\//, "").split("/");
    const eventType = searchParams.get("eventType") || "all-time";

    if (parts[0] === "players" && parts[1]) {
      const slug = normalizeName(decodeURIComponent(parts[1]));
      const isAllTime = eventType === "all-time";
      
      const rankData = isAllTime ? (cachedData.data || []) : (eventType === "2026" ? (cachedData.season26Data || []) : (cachedData.openData || []));
      const player = rankData.find((p: PlayerProfile) => normalizeName(p.name || "") === slug);
      
      if (player) {
         const flags = getCombinedFlags(player).trim();
         const titlePrefix = flags ? `${flags} ` : '';
         title = `${titlePrefix}${player.name.toUpperCase()}`;
         const leaderboards = isAllTime ? cachedData.playerLB_AT : (eventType === "2026" ? cachedData.playerLB_2026 : cachedData.playerLB_OP);
         const gender = player.gender || "M";
         const pKey = player.pKey || normalizeName(player.name || "");
         const lbRank = (leaderboards as any)?.[gender]?.[pKey]?.rank;
         const rank = lbRank || 'UR';
         const rating = player.rating ? player.rating.toFixed(2) : '0.00';
         const gym = player.country && player.country !== CONFIG.FALLBACKS.UNKNOWN_LOCATION ? player.country : 'Unknown Location';
         
         const skillsCount = player.challenges || 0;
         const runsCount = player.sends || 0;
         
         const newDesc = `CHALLENGES: ${skillsCount} | SENDS: ${runsCount}`;

         if (isAllTime) {
             description = newDesc.toUpperCase();
         } else if (eventType === "2026") {
             description = `2026 SEASON STATS: ${rating} RATING | 2026 RANK: ${rank || 'UR'} | GYM: ${gym}`.toUpperCase();
         } else {
             description = `2026 STATS: ${rating} RATING | 2026 RANK: ${rank || 'UR'} | GYM: ${gym}`.toUpperCase();
         }
         
         const setterData = (cachedData.settersWithImpact as any[])?.find(s => normalizeName(s.name) === slug);
         const setsCount = setterData?.sets || 0;
         const impactCount = setterData?.impact || 0;

         ogType = 'player';
         ogStats = [
             { value: rating, label: 'PTS' },
             { value: rank === 'UR' ? 'UR' : `${rank}`, label: 'RANK' }
         ];
         
         if (setsCount > 0) {
             ogStats.push({ value: setsCount.toString(), label: 'SETS' });
         }
         if (impactCount > 0) {
             ogStats.push({ value: impactCount.toString(), label: 'IMPACT' });
         }
         
         const completedSkills = [];
         const allSkills = Object.keys(cachedData.cMet || {});
         for (const c of allSkills) {
           if (cachedData.lbAT?.M?.[c]?.[player.name] || cachedData.lbAT?.F?.[c]?.[player.name] || cachedData.lbSeason26?.M?.[c]?.[player.name] || cachedData.lbSeason26?.F?.[c]?.[player.name]) {
             completedSkills.push(c);
           }
         }
         const randSkill = completedSkills.length > 0 ? completedSkills[Math.floor(Math.random() * completedSkills.length)] : null;
         ogMapCoords = randSkill && cachedData.cMet[randSkill] ? (cachedData.cMet[randSkill] as any).parsedCoords || null : null;
      }
    } else if (parts[0] === "challenges" && parts[1]) {
      const slug = normalizeName(decodeURIComponent(parts[1]));
      const skillStr = Object.keys(cachedData.cMet || {}).find(c => normalizeName(c) === slug);
      if (skillStr) {
         const skillInfo: any = cachedData.cMet[skillStr] || {};
         const flags = getCombinedFlags(skillInfo).trim();
         const titlePrefix = flags ? `${flags} ` : '';
         title = `${titlePrefix}${skillStr.toUpperCase()} CHALLENGE SEND`;
         
         const isAllTime = eventType === "all-time";
         const leaderboards = isAllTime ? cachedData.lbAT : (eventType === "2026" ? cachedData.lbSeason26 : cachedData.lbOP);
         
         let totalClears = 0;
         let mBest = Infinity;
         let fBest = Infinity;
         
         if (leaderboards) {
            const mData = leaderboards.M?.[skillStr] || {};
            const fData = leaderboards.F?.[skillStr] || {};
            
            const mTimes = Object.values(mData) as number[];
            const fTimes = Object.values(fData) as number[];
            
            totalClears = mTimes.length + fTimes.length;
            if (mTimes.length) mBest = Math.min(...mTimes);
            if (fTimes.length) fBest = Math.min(...fTimes);
         }
         
         const best = Math.min(mBest, fBest);
         const locStr = skillInfo.city ? toTitleCase(skillInfo.city) : skillInfo.country ? toTitleCase(skillInfo.country) : 'Secret Location';
         
         const totalRunsCount = skillInfo.totalAllTimeRuns || skillInfo.totalRuns || totalClears;
         description = `SENDS: ${totalRunsCount} | 📍 ${locStr}`.toUpperCase();
         ogType = 'challenge';
         ogStats = [
             { value: mBest !== Infinity ? mBest.toFixed(2) : '--', label: "WR (M)" },
             { value: fBest !== Infinity ? fBest.toFixed(2) : '--', label: "WR (W)" }
         ];
         ogMapCoords = skillInfo.parsedCoords || null;
      }
    }
  } catch(e) {
    console.error("Meta evaluation error", e);
  }

  return { title, description, initialData: cachedData, ogType, ogStats, ogMapCoords };
}
