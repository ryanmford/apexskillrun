import { useMemo } from "react";
import { normalizeName } from "../lib/asr-utils";
import { parseSafeDate } from "../lib/asr-data";
import { Zap, Medal, Waypoints } from "lucide-react";
import { PlayerProfile, TeamProfile, ASRDataContext, SetterProfile } from "../types";

const EMPTY_OBJ = {};
const EMPTY_ARR: unknown[] = [];
const EMPTY_LB = { M: {}, F: {} };

export const usePlayerDetailsData = (
  player: PlayerProfile,
  activeMode: "open" | "all-time" | "2026",
  dataContext: ASRDataContext,
) => {
  const lbAT = dataContext.lbAT || EMPTY_LB;
  const lbOP = dataContext.lbOP || EMPTY_LB;
  const atMet = dataContext.atMet || EMPTY_OBJ;
  const cMet = dataContext.cMet || EMPTY_OBJ;
  const pRaw = dataContext.pRaw || EMPTY_OBJ;
  const setterMet = dataContext.setterMet || EMPTY_OBJ;
  const lbAT_Skills = dataContext.lbAT_Skills || EMPTY_LB;
  const skillRunsHistory = dataContext.skillRunsHistory || EMPTY_OBJ;
  const masterSkillList = dataContext.masterSkillList || EMPTY_ARR;

  const pKey = player.pKey || normalizeName(player.name);
  const meta = atMet[pKey] || player;

  const stats = useMemo(() => {
    const lbSeason26 = dataContext.lbSeason26;
    const lb = (activeMode === "all-time" ? lbAT : activeMode === "2026" ? lbSeason26 : lbOP) || { M: {}, F: {} };
    const allStats = { ...(lb.M || {}), ...(lb.F || {}) };
    const pData = allStats[pKey] || {};

    const allTimeStats = { ...(lbAT?.M || {}), ...(lbAT?.F || {}) };
    const atData = allTimeStats[pKey] || {};

    return {
      rank: pData.rank || "UR",
      rating: pData.rating || 0,
      pts: pData.pts || 0,
      challenges: pData.challenges || 0,
      sends: pData.sends || 0,
      firstSends:
        pData.firstSends !== undefined
          ? pData.firstSends
          : activeMode === "all-time"
            ? meta.firstSends || 0
            : 0,
    };
  }, [lbAT, lbOP, dataContext.lbSeason26, activeMode, pKey, meta]);

  const sends = useMemo(() => {
    const sourceData = pRaw || {};
    const raw = sourceData[activeMode]?.[pKey] || [];
    return raw
      .map((r: Record<string, unknown>) => ({
        ...r, pts: r.skillPoints,
        skillMeta: cMet[((r.label as string) || "").toUpperCase()],
      }))
      .sort(
        (a: Record<string, unknown>, b: Record<string, unknown>) => {
          const aPts = (a.pts ?? a.points ?? 0) as number;
          const bPts = (b.pts ?? b.points ?? 0) as number;
          if (bPts !== aPts) {
            return bPts - aPts;
          }
          const aTime = (a.num ?? a.time ?? Infinity) as number;
          const bTime = (b.num ?? b.time ?? Infinity) as number;
          return aTime - bTime;
        }
      );
  }, [pRaw, pKey, activeMode, cMet]);

  const allRuns = useMemo(() => {
    const sourceData = pRaw || {};
    return sourceData["all-time"]?.[pKey] || [];
  }, [pRaw, pKey]);

  const allTimeAvgTime = useMemo(() => {
    if (!allRuns.length) return "--:--";
    const total = allRuns.reduce(
      (sum: number, r: { num?: number }) => sum + (r.num || 0),
      0,
    );
    return (total / allRuns.length).toFixed(2);
  }, [allRuns]);

  const avgTime = useMemo(() => {
    if (!sends.length) return "--:--";
    const total = sends.reduce((sum: number, r: { num?: number }) => sum + (r.num || 0), 0);
    return (total / sends.length).toFixed(2);
  }, [sends]);

  const setterInfo = setterMet?.[pKey];

  const skillsSet = useMemo(() => {
    return Object.entries(cMet)
      .filter(([_k, c]: [string, any]) => {
        const leads = (c.leadSetters || "")
          .split(",")
          .map((s: string) => normalizeName(s));
        const assists = (c.assistantsetters || "")
          .split(",")
          .map((s: string) => normalizeName(s));
        return leads.includes(pKey) || assists.includes(pKey);
      })
      .map(([name, c]: [string, any]) => {
        const isLead = (c.leadSetters || "")
          .split(",")
          .map((s: string) => normalizeName(s))
          .includes(pKey);
        const normName = String(name).toUpperCase();
        const mc = masterSkillList.find(
          (challenge: { name?: string }) => String(challenge.name).toUpperCase() === normName,
        ) as Record<string, any> | undefined;
        const historyRuns = (skillRunsHistory[normName] || []) as Record<string, any>[];
        const skillRuns =
          mc?.totalAllTimeRuns ||
          historyRuns.length ||
          Object.keys(lbAT_Skills.M?.[name] || {}).length +
            Object.keys(lbAT_Skills.F?.[name] || {}).length;

        const datedRuns = historyRuns
          .filter((r) => !r?.isInterim && r?.date && parseSafeDate(String(r.date)))
          .sort(
            (a, b) =>
              (parseSafeDate(String(a.date))?.getTime() ?? Infinity) -
              (parseSafeDate(String(b.date))?.getTime() ?? Infinity),
          );

        const datedRunsWithVideo = datedRuns.filter((r) => Boolean(r.videoUrl));
        const anyRunWithVideo = historyRuns.find((r) => !r?.isInterim && Boolean(r?.videoUrl));
        const resolvedVideoUrl =
          datedRunsWithVideo[0]?.videoUrl ||
          c.demoVideo ||
          c.videoUrl ||
          mc?.videoUrl ||
          anyRunWithVideo?.videoUrl ||
          "";

        const parsedDateSet = c.dateSet && parseSafeDate(String(c.dateSet)) ? String(c.dateSet) : null;
        const resolvedDate = parsedDateSet || (datedRuns[0]?.date ? String(datedRuns[0].date) : null);
        const ptsVal = Number(c.points ?? 0);

        return {
          name,
          ...c,
          pts: ptsVal,
          points: ptsVal,
          videoUrl: resolvedVideoUrl,
          date: resolvedDate,
          role: isLead ? "LEAD" : "ASSIST",
          sends: skillRuns,
          impact: skillRuns,
        };
      })
      .sort((a: { pts: number; date?: string | null; sends: number }, b: { pts: number; date?: string | null; sends: number }) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        const aTime = a.date ? (parseSafeDate(a.date)?.getTime() || 0) : 0;
        const bTime = b.date ? (parseSafeDate(b.date)?.getTime() || 0) : 0;
        if (bTime !== aTime) return bTime - aTime;
        return b.sends - a.sends;
      });
  }, [cMet, pKey, lbAT_Skills, skillRunsHistory, masterSkillList]);

  const rankListSets = useMemo(() => {
    let currentRank = 1;
    return skillsSet.map(
      (
        s: {
          length?: string | number;
          dateSet?: string;
          date?: string | null;
          name?: string;
          rating?: number;
          pts?: number;
          videoUrl?: string;
          sends: number;
        },
        i: number,
      ) => {
        if (i > 0 && s.pts !== skillsSet[i - 1].pts) {
          currentRank = i + 1;
        }
        return {
          ...s,
          rank: currentRank,
          athleteSlug: s.name,
          pKey: s.name,
        };
      },
    );
  }, [skillsSet]);

  const mappedSetsChartData = useMemo(() => {
    return skillsSet.map((s: { length?: string | number; dateSet?: string; date?: string | null; name?: string; rating?: number }) => ({
      ...s,
      date: s.date || s.dateSet,
    }));
  }, [skillsSet]);

  const calculatedAvgLength = useMemo(() => {
    const lengths = skillsSet
      .filter(
        (c: { length?: string | number }) => !isNaN(parseFloat(String(c.length))) && parseFloat(String(c.length)) > 0,
      )
      .map((c: { length?: string | number }) => parseFloat(String(c.length)));
    if (!lengths.length) return 0;
    return (
      lengths.reduce((sum: number, l: number) => sum + l, 0) / lengths.length
    );
  }, [skillsSet]);

  const vitals = useMemo(() => {
    return {
      height: meta.height || meta.vitals?.height || "-",
      weight: meta.weight || meta.vitals?.weight || "-",
      wingspan: meta.wingspan || meta.vitals?.wingspan || "-",
      apeIndex:
        meta.apeIndex ||
        (meta.vitals?.wingspan && meta.vitals?.height
          ? (
              parseFloat(meta.vitals.wingspan) - parseFloat(meta.vitals.height)
            ).toFixed(2)
          : "-"),
      shoe: meta.shoe || "-",
      shoeSize: meta.shoeSize || "-",
    };
  }, [meta]);

  const rankListRuns = useMemo(() => {
    return sends.map((r: any) => ({
      ...r, pts: r.skillPoints,
      pKey: r.pKey || r.label,
    }));
  }, [sends]);

  const vaultItems = useMemo(() => {
    const totalRuns = allRuns.length;
    const allTimeStats = { ...(lbAT?.M || {}), ...(lbAT?.F || {}) };
    const vaultAtData = allTimeStats[pKey] || {};

    const golds = allRuns.filter((r: { rank?: number }) => r.rank === 1).length;
    const silvers = allRuns.filter((r: { rank?: number }) => r.rank === 2).length;
    const bronzes = allRuns.filter((r: { rank?: number }) => r.rank === 3).length;
    const impact = setterInfo?.impact || 0;
    const rating = vaultAtData.rating || 0;

    const podium = { gold: golds, silver: silvers, bronze: bronzes };

    const tokens = [
      {
        id: "t5",
        title: "COIN",
        count: (meta.contributionScore || 0).toFixed(2),
        icon: "🪙",
        date: "Contribution",
      },
    ];

    const trophies: any[] = [];

    const cards = [
      {
        id: "c1",
        title: "Speed Demon",
        metric: rating.toFixed(2),
        metricLabel: "PEAK PERFORMANCE RATE",
        tier: rating >= 90 ? 3 : rating >= 80 ? 2 : 1,
        maxTier: 3,
        progress: Math.min(100, rating),
        nextGoal: rating >= 90 ? 100 : rating >= 80 ? 90 : 80,
        rarity: rating >= 95 ? "mythic" : rating >= 85 ? "epic" : "rare",
        locked: false,
        icon: <Zap size={24} />,
        date: "Current Standing",
        telemetry: [
          { label: "TOP RANK", value: vaultAtData.rank || "UR" },
        ],
      },
    ];

    if (impact > 0) {
      cards.push({
        id: "c3",
        title: "Architect",
        metric: impact,
        metricLabel: "SETTER IMPACT",
        tier: impact >= 1000 ? 3 : impact >= 500 ? 2 : 1,
        maxTier: 3,
        progress: impact,
        nextGoal: impact >= 1000 ? 1000 : impact >= 500 ? 1000 : 500,
        rarity: impact >= 1000 ? "mythic" : impact >= 500 ? "epic" : "rare",
        locked: false,
        icon: <Waypoints size={24} />,
        date: "Global Design",
        telemetry: [
          { label: "LEAD SETS", value: setterInfo?.leads || 0 },
          { label: "ASSISTS", value: setterInfo?.assists || 0 },
        ],
      });
    }

    return { podium, tokens, trophies, cards };
  }, [meta, allRuns, setterInfo, pKey, lbAT, allTimeAvgTime]);

  return {
    meta,
    pKey,
    stats,
    sends,
    allRuns,
    avgTime,
    allTimeAvgTime,
    setterInfo,
    skillsSet,
    rankListSets,
    mappedSetsChartData,
    calculatedAvgLength,
    vitals,
    rankListRuns,
    vaultItems,
  };
};

export const useTeamDetailsData = (
  team: TeamProfile,
  mode: "open" | "all-time" | "2026",
  dataContext: ASRDataContext,
) => {
  const atMet = dataContext?.atMet || EMPTY_OBJ;
  const openData = dataContext?.openData || EMPTY_ARR;
  const settersWithImpact = dataContext?.settersWithImpact || EMPTY_ARR;
  const pRaw = dataContext?.pRaw || EMPTY_OBJ;
  const lbAT = dataContext?.lbAT || EMPTY_LB;
  const teamsAggregated = dataContext?.teamsAggregated || EMPTY_OBJ;

  const contextStr = mode === "all-time" ? "allTime" : mode === "2026" ? "season26" : "open";
  const targetUpper = (team?.name || "").toUpperCase();

  const resolvedCategory = useMemo(() => {
    if (team?.category === "gyms" || team?.category === "teams") {
      return team.category;
    }
    const inTeams = (teamsAggregated?.["teams"]?.[contextStr] || []).some(
      (t: { name?: string }) => (t.name || "").toUpperCase() === targetUpper,
    );
    if (inTeams) return "teams";
    return "gyms";
  }, [team?.category, teamsAggregated, contextStr, targetUpper]);

  const teamsAggregatedMap =
    teamsAggregated?.[resolvedCategory] || teamsAggregated?.["gyms"];
  const teamsAgg = teamsAggregatedMap?.[contextStr] || [];

  const tMeta = Array.isArray(teamsAgg)
    ? teamsAgg.find(
        (t: { name?: string }) =>
          (t.name || "").toUpperCase() === targetUpper,
      ) || team
    : team;

  const players = useMemo(() => {
    if (tMeta?.players) {
      return [...tMeta.players].sort(
        (a: PlayerProfile & { contribution?: number }, b: PlayerProfile & { contribution?: number }) => (b.contribution || 0) - (a.contribution || 0),
      );
    }
    const season26Data = dataContext.season26Data;
    const allTimeData = dataContext.data && dataContext.data.length > 0 ? dataContext.data : Object.values(atMet);
    const source = mode === "all-time" ? allTimeData : mode === "2026" ? (season26Data || []) : openData;
    return source
      .filter((p: PlayerProfile) => {
        if (!targetUpper) return false;
        const gymMatch =
          p.homeGym && p.homeGym.toUpperCase() === targetUpper;
        const teamsMatch =
          p.teams &&
          p.teams.some(
            (t: { name?: string } | string) => (typeof t === "string" ? t : (t?.name || "")).toUpperCase() === targetUpper,
          );
        return gymMatch || teamsMatch;
      })
      .map((p: PlayerProfile & { pts?: number }) => ({ ...p, contribution: p.pts || 0 }))
      .sort((a: PlayerProfile & { contribution?: number }, b: PlayerProfile & { contribution?: number }) => (b.contribution || 0) - (a.contribution || 0));
  }, [atMet, dataContext.data, dataContext.season26Data, openData, mode, targetUpper, tMeta]);

  const setters = useMemo(() => {
    return settersWithImpact
      .filter((s: SetterProfile) => {
        const normalizedTarget = (team?.name || "").toUpperCase();
        if (!normalizedTarget) return [];
        const gymMatch =
          s.homeGym && s.homeGym.toUpperCase() === normalizedTarget;
        const teamsMatch =
          s.teams &&
          s.teams.some(
            (t: { name?: string } | string) => (typeof t === "string" ? t : (t?.name || "")).toUpperCase() === normalizedTarget,
          );
        return gymMatch || teamsMatch;
      })
      .sort((a: SetterProfile, b: SetterProfile) => (b.impact || 0) - (a.impact || 0));
  }, [settersWithImpact, team.name]);

  const playerStats = useMemo(
    () => ({
      points: players.reduce((sum: number, p: PlayerProfile & { contribution?: number }) => sum + (p.contribution || 0), 0),
      sends: players.reduce(
        (sum: number, p: PlayerProfile & { totalAllTimeRuns?: number }) => sum + (p.sends || p.totalAllTimeRuns || 0),
        0,
      ),
    }),
    [players],
  );

  const setterStats = useMemo(
    () => ({
      impact: setters.reduce((sum: number, s: SetterProfile) => sum + (s.impact || 0), 0),
      sets: setters.reduce((sum: number, s: SetterProfile) => sum + (s.sets || 0), 0),
    }),
    [setters],
  );

  const playerTuples = useMemo(() => {
    let currentRank = 1;
    return players.map((p: PlayerProfile & { contribution?: number }, i: number) => {
      const val = Math.round((p.contribution || 0) * 100);
      const prevVal =
        i > 0 ? Math.round((players[i - 1].contribution || 0) * 100) : val;
      if (i > 0 && val !== prevVal) {
        currentRank = i + 1;
      }
      return [
        p.pKey || normalizeName(p.name),
        p.contribution,
        undefined,
        currentRank,
      ];
    });
  }, [players]);

  const setterTuples = useMemo(() => {
    let currentRank = 1;
    return setters.map((s: SetterProfile, i: number) => {
      const val = s.impact || 0;
      const prevVal = i > 0 ? setters[i - 1].impact || 0 : val;
      if (i > 0 && val !== prevVal) {
        currentRank = i + 1;
      }
      return [
        s.pKey || normalizeName(s.name),
        s.impact,
        undefined,
        currentRank,
      ];
    });
  }, [setters]);

  const vaultItems = useMemo(() => {
    let golds = 0,
      silvers = 0,
      bronzes = 0,
      coins = 0;
    const uniqueMembers = new Map();

    players.forEach((p: PlayerProfile) => {
      const pKey = p.pKey || normalizeName(p.name);
      uniqueMembers.set(pKey, {
        ...uniqueMembers.get(pKey),
        ...p,
        isPlayer: true,
      });
    });

    setters.forEach((s: SetterProfile) => {
      const pKey = s.pKey || normalizeName(s.name);
      uniqueMembers.set(pKey, {
        ...uniqueMembers.get(pKey),
        ...s,
        isSetter: true,
      });
    });

    uniqueMembers.forEach((member, pKey) => {
      const sourceData = pRaw || {};
      const allRuns = sourceData["all-time"]?.[pKey] || [];

      golds += allRuns.filter((r: { rank?: number }) => r.rank === 1).length;
      silvers += allRuns.filter((r: { rank?: number }) => r.rank === 2).length;
      bronzes += allRuns.filter((r: { rank?: number }) => r.rank === 3).length;

      const allTimeStats = { ...(lbAT?.M || {}), ...(lbAT?.F || {}) };
      const vaultAtData = allTimeStats[pKey] || {};
      const meta = atMet?.[pKey] || member;

      coins += Number(meta.contributionScore || 0);
    });

    return {
      podium: { gold: golds, silver: silvers, bronze: bronzes },
      tokens: [
        {
          id: "t5",
          title: "COIN",
          count: coins.toFixed(2),
          icon: "🪙",
          date: "Total Earned",
        },
      ],
    };
  }, [players, setters, pRaw, lbAT, atMet]);

  return {
    tMeta,
    players,
    setters,
    playerStats,
    setterStats,
    playerTuples,
    setterTuples,
    vaultItems,
  };
};
