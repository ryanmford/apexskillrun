/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useContext } from "react";
import { useDataStore } from "../../store/useDataStore";
import { useAppStore } from "../../store/useAppStore";
import {
  MapPin,
  User,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Activity,
  Play,
  Trophy,
  Users,
  Waypoints,
} from "lucide-react";
import { motion } from "motion/react";
import { useAppNavigation } from "../../hooks/useDerivedData";
import { CountUp } from "../common/CountUp";
import { ThemeContext } from "../../theme-context";
import { useNavigate } from "react-router-dom";
import {
  cn,
  fixCountryEntity,
  getCombinedFlags,
  isPlaceholderPlayer,
} from "../../lib/asr-utils";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { ASRWeeklyActivityChart } from "../inspector/ASRWeeklyActivityChart";

const LOCAL_HERO_VIDEOS = [
  "/jason-bergeron-UMC-1.mp4",
  "/olof-wood-tac-stride-plyo-stick.mp4",
];

const CDN_FALLBACK_MAP: Record<string, string> = {
  "/jason-bergeron-UMC-1.mp4":
    "https://raw.githubusercontent.com/ryanmford/apexskillrun-old/main/public/jason-bergeron-UMC-1.mp4",
  "/olof-wood-tac-stride-plyo-stick.mp4":
    "https://raw.githubusercontent.com/ryanmford/apexskillrun-old/main/public/olof-wood-tac-stride-plyo-stick.mp4",
};

export const HomeView = React.memo(() => {
  const navigate = useNavigate();
  const theme = useContext(ThemeContext) as "light" | "dark";
  const masterSkillList = useDataStore((s) => s.masterSkillList);
  const playerList_M_AT = useDataStore((s) => s.playerList_M_AT);
  const playerList_F_AT = useDataStore((s) => s.playerList_F_AT);
  const playerList_M_OP = useDataStore((s) => s.playerList_M_OP);
  const playerList_F_OP = useDataStore((s) => s.playerList_F_OP);
  const kpiStats = useDataStore((s) => s.kpiStats);
  const kpiTrends = useDataStore((s) => s.kpiTrends);
  const recentFeed = useDataStore((s) => s.recentFeed);
  const isLoading = useDataStore((s) => s.isLoading);
  const setShowOnboarding = useAppStore((s) => s.setShowOnboarding);
  const setPlayingVideoUrl = useAppStore((s) => s.setPlayingVideoUrl);
  const homeVisibleRuns = useAppStore((s) => s.homeVisibleRuns);
  const setHomeVisibleRuns = useAppStore((s) => s.setHomeVisibleRuns);
  const homeVisibleSets = useAppStore((s) => s.homeVisibleSets);
  const setHomeVisibleSets = useAppStore((s) => s.setHomeVisibleSets);
  const setTeamCategory = useAppStore((s) => s.setTeamCategory);
  const { navigateToEntity } = useAppNavigation();

  const skillList_AT = useDataStore((s) => s.skillList_AT);
  const teamList_gyms_AT = useDataStore((s) => s.teamList_gyms_AT);
  const teamList_teams_AT = useDataStore((s) => s.teamList_teams_AT);
  const atPerfs = useDataStore((s) => s.atPerfs);
  const atMet = useDataStore((s) => s.atMet);
  const dnMap = useDataStore((s) => s.dnMap);
  const skillRunsHistory = useDataStore((s) => s.skillRunsHistory);

  const allRunsWithDates = useMemo(() => {
    if (!skillRunsHistory) return [];
    return Object.values(skillRunsHistory).flatMap((sends: any) =>
      sends.filter((r: any) => r.date).map((r: any) => ({ date: r.date })),
    );
  }, [skillRunsHistory]);

  const allSetsWithDates = useMemo(() => {
    if (!masterSkillList) return [];
    return masterSkillList
      .filter((c: any) => c.dateSet)
      .map((c: any) => ({ date: c.dateSet }));
  }, [masterSkillList]);

  // Home Hero Background video rotation & self-healing fallback
  const [failedVideos, setFailedVideos] = React.useState<string[]>([]);
  const [activeVideoIndex, setActiveVideoIndex] = React.useState(() => {
    return Math.floor(Math.random() * LOCAL_HERO_VIDEOS.length);
  });

  const availableVideos = useMemo(() => {
    const working = LOCAL_HERO_VIDEOS.filter((v) => !failedVideos.includes(v));
    return working.length > 0 ? working : LOCAL_HERO_VIDEOS;
  }, [failedVideos]);

  const currentVideoSrc = useMemo(() => {
    const preferred = LOCAL_HERO_VIDEOS[activeVideoIndex] || LOCAL_HERO_VIDEOS[0];
    if (failedVideos.includes(preferred)) {
      // If local failed, check if CDN URL has also failed
      const cdnFallback = CDN_FALLBACK_MAP[preferred];
      if (cdnFallback && !failedVideos.includes(cdnFallback)) {
        return cdnFallback;
      }
      return availableVideos[0];
    }
    return preferred;
  }, [activeVideoIndex, failedVideos, availableVideos]);

  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Validate local videos: if local returns HTML (SPA 404 fallback) or 0-length, fall back to CDN
  React.useEffect(() => {
    let active = true;
    const checkVideos = async () => {
      const failedList: string[] = [];
      await Promise.all(
        LOCAL_HERO_VIDEOS.map(async (video) => {
          try {
            const res = await fetch(video, { method: "HEAD" });
            const contentType = res.headers.get("content-type") || "";
            const contentLength = res.headers.get("content-length");
            // If SPA router intercepted and returned HTML, or response is empty / not ok
            if (!res.ok || contentType.includes("text/html") || contentLength === "0") {
              failedList.push(video);
            }
          } catch {
            failedList.push(video);
          }
        }),
      );
      if (active && failedList.length > 0) {
        setFailedVideos((prev) => Array.from(new Set([...prev, ...failedList])));
      }
    };
    checkVideos();
    return () => {
      active = false;
    };
  }, []);

  // Ensure high-reliability mobile autoplay and clean transitions
  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Safe catch for autoplay restrictions (e.g., mobile battery saver)
        });
      }
    }
  }, [currentVideoSrc]);

  const handleVideoError = React.useCallback(() => {
    setFailedVideos((prev) => {
      if (!prev.includes(currentVideoSrc)) {
        // If local failed, try the CDN fallback for this video
        const cdnUrl = CDN_FALLBACK_MAP[currentVideoSrc];
        if (cdnUrl && !prev.includes(cdnUrl)) {
          return [...prev, currentVideoSrc];
        }
        return [...prev, currentVideoSrc];
      }
      return prev;
    });
  }, [currentVideoSrc]);

  const recentSets = useMemo(() => {
    if (!masterSkillList || !masterSkillList.length) return [];

    return masterSkillList
      .reduce((acc: any[], c: any) => {
        if (c.dateSet) {
          const timestamp = new Date(c.dateSet).getTime();
          if (!isNaN(timestamp)) {
            acc.push({ ...c, timestamp });
          }
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, 100);
  }, [masterSkillList]);

  const { topPlayer, topSkill, dailyRecord } = useMemo(() => {
    const timeZone = "America/Denver";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const now = new Date();
    const seedStr = formatter.format(now);

    const sRandom = (str: string, max: number) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
      }
      const x = Math.sin(hash) * 10000;
      return Math.floor((x - Math.floor(x)) * max);
    };

    const combinedP = [
      ...(playerList_M_AT || []),
      ...(playerList_F_AT || []),
      ...(playerList_M_OP || []),
      ...(playerList_F_OP || []),
    ].filter(
      (p: any) =>
        p && !p.isDivider && (p.isQualified || p.currentRank !== "UR"),
    );

    // De-duplicate players by pKey just in case
    const uniquePlayersMap = new Map();
    combinedP.forEach((p: any) => {
      if (p && p.pKey && !uniquePlayersMap.has(p.pKey)) {
        uniquePlayersMap.set(p.pKey, p);
      }
    });
    const uniquePlayers = Array.from(uniquePlayersMap.values());

    let pOfDay: Record<string, unknown> | null = null;
    if (uniquePlayers.length > 0) {
      let chosenPlayer;
      if (seedStr === "5/26/2026") {
        const forcedPlayer = uniquePlayers.find((p: any) => p.name?.toLowerCase().includes("matt jang"));
        chosenPlayer = forcedPlayer || uniquePlayers[sRandom(seedStr + "feature_player", uniquePlayers.length)];
      } else {
        chosenPlayer = uniquePlayers[sRandom(seedStr + "feature_player", uniquePlayers.length)] as any;
      }
      pOfDay = { ...chosenPlayer };

      // Attempt to find AT rank if available, else OR rank
      if (pOfDay) {
        if (pOfDay.gender === "F") {
          const atIdx =
            playerList_F_AT?.findIndex((p: any) => p.name === pOfDay?.name) ??
            -1;
          pOfDay._gRank =
            atIdx >= 0
              ? atIdx + 1
              : (playerList_F_OP?.findIndex(
                  (p: any) => p.name === pOfDay?.name,
                ) ?? 0) + 1;
        } else {
          const atIdx =
            playerList_M_AT?.findIndex((p: any) => p.name === pOfDay?.name) ??
            -1;
          pOfDay._gRank =
            atIdx >= 0
              ? atIdx + 1
              : (playerList_M_OP?.findIndex(
                  (p: any) => p.name === pOfDay?.name,
                ) ?? 0) + 1;
        }
      }
    }

    let cOfDay: Record<string, unknown> | null = null;
    const sortedSkills = [...(skillList_AT || [])].sort(
      (a: any, b: any) =>
        (b.totalAllTimeRuns || b.totalRuns || 0) -
        (a.totalAllTimeRuns || a.totalRuns || 0),
    );

    // "we should only pick from challenges that have at least 1 male send and 1 female send, and both must be real human players (not interim/placeholder)"
    const validSkillsForDay = sortedSkills.filter((c: any) => {
      const atM = c.allTimeAthletesM || [];
      const atF = c.allTimeAthletesF || [];
      const hasRealM = atM.some((send: any) => {
        if (!send || !send[0]) return false;
        const pKey = send[0];
        const name = (dnMap && dnMap[pKey]) || pKey;
        return !isPlaceholderPlayer(name);
      });
      const hasRealF = atF.some((send: any) => {
        if (!send || !send[0]) return false;
        const pKey = send[0];
        const name = (dnMap && dnMap[pKey]) || pKey;
        return !isPlaceholderPlayer(name);
      });
      return hasRealM && hasRealF;
    });

    if (validSkillsForDay.length > 0) {
      if (seedStr === "5/26/2026") {
        const forcedSkill = sortedSkills.find((c: any) => c.name?.toLowerCase().includes("funda") && c.name?.toLowerCase().includes("mexico"));
        cOfDay = forcedSkill || validSkillsForDay[sRandom(seedStr + "feature_skill", validSkillsForDay.length)];
      } else {
        const idx = sRandom(
          seedStr + "feature_skill",
          validSkillsForDay.length,
        );
        cOfDay = validSkillsForDay[idx];
      }
    }

    let rOfDay: Record<string, unknown> | null = null;
    // "only pick from sends that are personal records and by an all-time-ranked and/or open-ranked player"
    // allTimeAthletesM and allTimeAthletesF contain all personal records on the challenge
    const allValidRuns: any[] = [];

    sortedSkills.forEach((c: any) => {
      const atM = c.allTimeAthletesM || [];
      const atF = c.allTimeAthletesF || [];

      atM.forEach((send: any) => {
        if (send && send[2]) {
          // Must have video URL
          const pKey = send[0];
          // Must be AT or OP ranked
          if (uniquePlayersMap.has(pKey)) {
            allValidRuns.push({ send, challenge: c, gender: "M" });
          }
        }
      });
      atF.forEach((send: any) => {
        if (send && send[2]) {
          // Must have video URL
          const pKey = send[0];
          // Must be AT or OP ranked
          if (uniquePlayersMap.has(pKey)) {
            allValidRuns.push({ send, challenge: c, gender: "F" });
          }
        }
      });
    });

    if (allValidRuns.length > 0) {
      let selected;
      if (seedStr === "5/26/2026") {
        const forcedRun = allValidRuns.find((item: any) => {
          const playerName = uniquePlayersMap.get(item.send[0])?.name || item.send[0];
          return Boolean(
            item.challenge?.name?.toLowerCase().includes("confluence") &&
            playerName.toLowerCase().includes("joey")
          );
        });
        selected = forcedRun || allValidRuns[sRandom(seedStr + "feature_record", allValidRuns.length)];
      } else {
        selected = allValidRuns[sRandom(seedStr + "feature_record", allValidRuns.length)];
      }
      const bestRun = selected.send;
      const targetSkill = selected.challenge;

      const pObj = uniquePlayersMap.get(bestRun[0]);
      const pFlagStr = pObj ? getCombinedFlags(pObj) : "";
      const pFlagFmt = pFlagStr ? `${pFlagStr.trim()} ` : "";
      const athleteName = pObj ? pObj.name : bestRun[0];

      const cFlagStr = getCombinedFlags(targetSkill);
      const cFlagFmt = cFlagStr ? `${cFlagStr.trim()} ` : "";

      // Calculate Points
      const cr =
        selected.gender === "F"
          ? targetSkill.fRecord || targetSkill.mRecord
          : targetSkill.mRecord;
      const runTime = bestRun[1];
      let pts = 0;
      if (cr && runTime > 0) {
        pts = (cr / runTime) * 100;
      }

      rOfDay = {
        athleteName: `${pFlagFmt}${athleteName}`,
        time: bestRun[1].toFixed(2),
        pts: pts.toFixed(2),
        videoUrl: bestRun[2],
        skillName: `${cFlagFmt}${targetSkill.name}`,
        challenge: targetSkill,
      };
    }

    return { topPlayer: pOfDay, topSkill: cOfDay, dailyRecord: rOfDay };
  }, [
    playerList_M_AT,
    playerList_F_AT,
    playerList_M_OP,
    playerList_F_OP,
    skillList_AT,
    dnMap,
  ]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const {
    kpi,
    totalGyms,
    totalTeams,
    playerCountries,
    teamCountries,
    totalCoins,
    runsTrendData,
    countriesTrendData,
    skillsTrendData,
  } = useMemo(() => {
    const kpiData = (kpiStats as Record<string, unknown>) || {};

    const tGyms = Math.max(teamList_gyms_AT?.length || 0, 1);
    const tTeams = Math.max(teamList_teams_AT?.length || 0, 1);

    const pTrendData = kpiTrends?.players || [];
    const cTrendData = kpiTrends?.challenges || [];
    const rTrendData = kpiTrends?.sends || [];
    const countryTrendData = kpiTrends?.countries || [];

    const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;

    const pFlags = new Set<string>();
    [...(playerList_M_AT || []), ...(playerList_F_AT || [])].forEach(
      (p: any) => {
        [p.gymFlag, p.townFlag, p.region].forEach((f) => {
          if (f) {
            const matches = String(f).match(flagRegex);
            if (matches) matches.forEach((m) => pFlags.add(m));
          }
        });
        if (p.teams && Array.isArray(p.teams)) {
          p.teams.forEach((t: any) => {
            if (t.flag) {
              const matches = String(t.flag).match(flagRegex);
              if (matches) matches.forEach((m) => pFlags.add(m));
            }
          });
        }
      },
    );

    const tFlags = new Set<string>();
    [...(teamList_teams_AT || []), ...(teamList_gyms_AT || [])].forEach(
      (t: any) => {
        if (t.flag) {
          const matches = String(t.flag).match(flagRegex);
          if (matches) matches.forEach((m) => tFlags.add(m));
        }
      },
    );

    let tCoins = 0;
    if (atMet) {
      Object.values(atMet).forEach((p: any) => {
        tCoins += p.contributionScore || 0;
      });
    }

    return {
      kpi: kpiData,
      totalGyms: tGyms,
      totalTeams: tTeams,
      playerCountries: Math.max(pFlags.size, 1),
      teamCountries: Math.max(tFlags.size, 1),
      totalCoins: tCoins,
      runsTrendData: rTrendData,
      countriesTrendData: countryTrendData,
      playersTrendData: pTrendData,
      skillsTrendData: cTrendData,
    };
  }, [
    kpiStats,
    teamList_gyms_AT,
    teamList_teams_AT,
    masterSkillList,
    kpiTrends,
    playerList_M_AT,
    playerList_F_AT,
    atPerfs,
    atMet,
  ]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 pt-0 sm:pt-1 pb-24 gap-2 sm:gap-4"
    >
      {/* Hero Header CTA */}
      <motion.div
        variants={itemVariants}
        className={cn(
          "relative h-[105dvh] sm:h-[105dvh] w-[100vw] ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] flex flex-col justify-start overflow-hidden transition-all duration-500 group border-b z-10",
          theme === "dark"
            ? "bg-[#0A0A0A] border-white/5"
            : "bg-black border-white/10",
        )}
      >
        {/* Full Background Video */}
        <div className="absolute inset-0 z-0 bg-black">
          {availableVideos.length > 0 && !failedVideos.includes(currentVideoSrc) ? (
            <video
              ref={videoRef}
              src={currentVideoSrc}
              autoPlay
              playsInline
              muted
              onEnded={() => {
                setActiveVideoIndex((prev) => (prev + 1) % availableVideos.length);
              }}
              onError={handleVideoError}
              className="w-full h-full object-cover opacity-85 transition-opacity duration-700"
            />
          ) : (
            <div 
              className="w-full h-full object-cover opacity-60 bg-center bg-cover"
              style={{ backgroundImage: "url('/apexskillschallenge.png')" }} 
            />
          )}
          {/* subtle vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>
          {/* strong dark gradient overlay at top edge to guarantee contrast for search bar/header */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/40 pointer-events-none"></div>
        </div>

        {/* Get Started positioned securely out of the way of center-screen browser overlays and the bottom navigation dock */}
        <div
          className="absolute left-0 right-0 w-full max-w-5xl mx-auto px-4 pointer-events-none z-10 flex flex-col items-center bottom-[240px] md:bottom-[280px]"
          style={{
            marginBottom: "env(safe-area-inset-bottom, 0px)",
            gap: "24px",
          }}
        >
          <div className="flex w-auto mx-auto relative z-30 pointer-events-auto">
            <button
              className="group/btn relative px-8 py-4 sm:py-5 overflow-hidden rounded-full font-medium text-sm sm:text-base tracking-[0.2em] text-white transition-all duration-500 active:scale-[0.98] shadow-2xl bg-black/40 backdrop-blur-md border border-white/20"
              onClick={() => setShowOnboarding(true)}
              onTouchStart={() => {}}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500 z-10"></div>
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-full z-[15]"></div>
              <span className="relative z-20 flex items-center justify-center gap-2 uppercase font-black tracking-widest text-[#FFF]">
                Get Started
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:translate-x-1.5 transition-transform duration-500 opacity-90" />
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Of The Day Section */}
      {(topPlayer || topSkill || dailyRecord) && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-3 mt-4 sm:mt-8 mb-4 sm:mb-8 w-full max-w-4xl mx-auto"
        >
          <div className="flex flex-col gap-4 px-2">
            {[
              dailyRecord && {
                type: "video",
                data: {
                  name: dailyRecord.skillName,
                  fallbackType: "challenge",
                  videoUrl: dailyRecord.videoUrl,
                },
                displayName: dailyRecord.athleteName,
                label: "Send of the Day",
                icon: <Activity className="w-4 h-4" />,
                color: "text-pink-500",
                bg: "bg-pink-500/10",
                hoverBg: "group-hover:bg-pink-500",
                hoverText:
                  "group-hover:text-pink-500 dark:group-hover:text-pink-400",
                metrics: [
                  { label: "Challenge", value: dailyRecord.skillName },
                  { label: "POINTS", value: dailyRecord.pts },
                ],
              },
              topPlayer && {
                type: "player",
                data: topPlayer,
                displayName: getCombinedFlags(topPlayer)
                  ? `${getCombinedFlags(topPlayer).trim()} ${topPlayer.name}`
                  : topPlayer.name,
                label: "Player of the Day",
                icon: <User className="w-4 h-4" />,
                color: "text-blue-500",
                bg: "bg-blue-500/10",
                hoverBg: "group-hover:bg-blue-500",
                hoverText:
                  "group-hover:text-blue-500 dark:group-hover:text-blue-400",
                metrics: [
                  { label: "Rank", value: topPlayer._gRank },
                  {
                    label: "SENDS",
                    value: Number(topPlayer.sends || 0).toFixed(0),
                  },
                  {
                    label: "PTS",
                    value: Number(topPlayer.pts || 0).toFixed(2),
                  },
                ],
              },
              topSkill && {
                type: "challenge",
                data: topSkill,
                displayName: getCombinedFlags(topSkill)
                  ? `${getCombinedFlags(topSkill).trim()} ${topSkill.name}`
                  : topSkill.name,
                label: "Challenge of the Day",
                icon: <MapPin className="w-4 h-4" />,
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
                hoverBg: "group-hover:bg-emerald-500",
                hoverText:
                  "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
                metrics: [
                  {
                    label: "Sends",
                    value:
                      topSkill.totalAllTimeRuns || topSkill.totalRuns || 0,
                  },
                ],
              },
            ]
              .filter(Boolean)
              .map((feat: any, idx: number) => {
                const hasVideo = feat.type === "video" && !!feat.data.videoUrl;
                const isVideoBg = false; // Intentionally disabled per user request
                return (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    style={{ containerType: "inline-size" }}
                    onClick={() => {
                      if (hasVideo) {
                        setPlayingVideoUrl(feat.data.videoUrl);
                      } else {
                        navigateToEntity(
                          feat.data.fallbackType || feat.type,
                          feat.data,
                        );
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (hasVideo) {
                          setPlayingVideoUrl(feat.data.videoUrl);
                        } else {
                          navigateToEntity(
                            feat.data.fallbackType || feat.type,
                            feat.data,
                          );
                        }
                      }
                    }}
                    className={cn(
                      "relative text-left w-full flex flex-col items-start justify-between rounded-[2rem] p-6 sm:p-8 cursor-pointer group overflow-hidden transition-all hover:-translate-y-1 active:-translate-y-1 active:scale-[0.98] focus:outline-none appearance-none border border-transparent",
                      "min-h-[160px] bg-black/5 dark:bg-white/5",
                    )}
                  >
                    {/* Header (Icon + Type + Title) */}
                    <div className="w-full relative z-30 flex flex-col gap-2">
                      <div
                        className={cn(
                          "text-[10px] sm:text-xs md:text-[11px] font-bold tracking-widest uppercase flex items-center gap-1.5",
                          feat.color,
                        )}
                      >
                        {feat.icon} {feat.label}
                      </div>
                      <div
                        style={{
                          fontSize: `clamp(1rem, ${80 / (Math.max(10, feat.displayName?.length || 10) * 0.6)}cqi, 3rem)`,
                        }}
                        className={cn(
                          "font-black transition-colors uppercase leading-[1.1] text-wrap break-words w-full pr-12 pb-1",
                          "text-zinc-900 dark:text-white",
                          feat.hoverText,
                        )}
                      >
                        {feat.displayName}
                      </div>
                    </div>

                    {/* Footer (Metrics + Chevron) */}
                    <div
                      className={cn(
                        "w-full relative z-30 flex items-end justify-between mt-6 sm:mt-8",
                      )}
                    >
                      <div className="flex items-center flex-wrap gap-4 sm:gap-6 shrink-0">
                        {feat.metrics.map(
                          (
                            m: { label: string; value: React.ReactNode },
                            i: number,
                          ) => {
                            const valStr =
                              typeof m.value === "string" ||
                              typeof m.value === "number"
                                ? String(m.value)
                                : "";
                            const len = valStr.length || 5;
                            return (
                              <div
                                key={i}
                                className="flex flex-col min-w-0 flex-shrink"
                              >
                                <span
                                  className={cn(
                                    "text-[9px] sm:text-[10px] font-bold uppercase tracking-widest break-words w-full",
                                    isVideoBg
                                      ? "text-white/60"
                                      : "text-zinc-500",
                                  )}
                                >
                                  {m.label}
                                </span>
                                <span
                                  className={cn(
                                    "font-black flex flex-wrap items-center mt-0.5 leading-none break-words w-full max-w-[120px] sm:max-w-[180px]",
                                    isVideoBg
                                      ? "text-white"
                                      : "text-zinc-900 dark:text-white",
                                    len > 15
                                      ? "text-xs sm:text-sm md:text-base leading-tight"
                                      : len > 10
                                        ? "text-sm sm:text-base md:text-lg leading-tight"
                                        : "text-base sm:text-lg md:text-xl",
                                  )}
                                >
                                  {m.value}
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>

                      <div
                        className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex flex-shrink-0 items-center justify-center transition-all transform group-hover:scale-110 shadow-lg shadow-black/5 shrink-0 self-end ml-4",
                          isVideoBg
                            ? "bg-white/10 text-white backdrop-blur-md group-hover:bg-pink-500 border border-white/20"
                            : cn(
                                feat.bg,
                                feat.color,
                                feat.hoverBg,
                                "group-hover:text-white",
                              ),
                        )}
                      >
                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </motion.div>
      )}

      {/* Unified Stats & Navigation Cards */}
      {isLoading ? (
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-12 gap-4 w-full max-w-4xl mx-auto px-2"
        >
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="col-span-12 sm:col-span-6 bg-black/5 dark:bg-white/5 rounded-3xl p-6 h-[260px] flex flex-col items-center justify-center gap-4 animate-pulse"
            >
              <div className="w-8 h-8 bg-black/10 dark:bg-white/10 rounded-full" />
              <div className="w-20 h-10 bg-black/10 dark:bg-white/10 rounded-lg" />
              <div className="w-16 h-4 bg-black/10 dark:bg-white/10 rounded-full" />
              <div className="w-full h-12 bg-black/10 dark:bg-white/10 rounded-xl mt-4" />
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-12 gap-4 w-full max-w-4xl mx-auto px-2"
        >
          {/* Card 1: PLAYERS & SENDS */}
          <div
            className="col-span-12 sm:col-span-6 relative overflow-hidden bg-black/5 dark:bg-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-md flex flex-col items-start text-left cursor-pointer transition-all duration-300 group hover:bg-black/10 dark:hover:bg-white/10 hover:-translate-y-1 active:scale-[0.98] active:bg-black/10 dark:active:bg-white/10 min-h-[220px]"
            onClick={() => navigate("/players?eventType=all-time&mode=players")}
          >
            {/* Sparkline bg */}
            <div className="absolute inset-x-0 bottom-0 top-1/4 opacity-20 group-hover:opacity-40 pointer-events-none transition-opacity duration-500 flex items-end mask-image-bottom">
              {runsTrendData && runsTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" debounce={150}>
                  <LineChart data={runsTrendData}>
                    <YAxis domain={["dataMin", "dataMax"]} hide />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full border-t border-dashed border-blue-500/20" />
              )}
            </div>

            <div className="absolute top-0 right-0 p-6 pointer-events-none z-30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 origin-top-right">
              <User className="w-12 h-12 text-blue-500/20 dark:text-blue-500/30 group-hover:text-blue-500/40 transition-colors" />
            </div>

            <div className="flex flex-col items-start gap-1 z-10 w-full relative pt-2">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">
                Players
              </h2>
              <p className="text-sm font-medium text-zinc-500">
                View leaderboards
              </p>
            </div>

            <div className="mt-auto pt-8 w-full flex items-center justify-between z-10 text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
              <div className="flex flex-col items-start gap-1 sm:gap-2 font-mono font-medium">
                <span className="flex items-baseline gap-1">
                  <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                    <CountUp end={kpi.players || 0} />
                  </strong>{" "}
                  PLAYERS
                </span>
                <span className="flex items-baseline gap-1">
                  <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                    <CountUp end={kpi.sends || 0} />
                  </strong>{" "}
                  SENDS
                </span>
                <span className="flex items-baseline gap-1">
                  <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                    <CountUp end={playerCountries || 0} />
                  </strong>{" "}
                  COUNTRIES
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </div>
          </div>

          {/* Card 2: CHALLENGES */}
          <div
            className="col-span-12 sm:col-span-6 relative overflow-hidden bg-black/5 dark:bg-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-md flex flex-col items-start text-left cursor-pointer transition-all duration-300 group hover:bg-black/10 dark:hover:bg-white/10 hover:-translate-y-1 active:scale-[0.98] active:bg-black/10 dark:active:bg-white/10 min-h-[220px]"
            onClick={() => navigate("/challenges")}
          >
            {/* Sparkline bg */}
            <div className="absolute inset-x-0 bottom-0 top-1/4 opacity-20 group-hover:opacity-40 pointer-events-none transition-opacity duration-500 flex items-end mask-image-bottom">
              {skillsTrendData && skillsTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" debounce={150}>
                  <LineChart data={skillsTrendData}>
                    <YAxis domain={["dataMin", "dataMax"]} hide />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full border-t border-dashed border-emerald-500/20" />
              )}
            </div>

            <div className="absolute top-0 right-0 p-6 pointer-events-none z-30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 origin-top-right">
              <MapPin className="w-12 h-12 text-emerald-500/20 dark:text-emerald-500/30 group-hover:text-emerald-500/40 transition-colors" />
            </div>

            <div className="flex flex-col items-start gap-1 z-10 w-full relative pt-2">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">
                Challenges
              </h2>
              <p className="text-sm font-medium text-zinc-500">
                Explore challenges
              </p>
            </div>

            <div className="mt-auto pt-8 w-full flex items-center justify-between z-10 text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
              <div className="flex flex-col items-start gap-1 sm:gap-2 font-mono font-medium">
                <span className="flex items-baseline gap-1">
                  <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                    <CountUp end={kpi.challenges || 0} />
                  </strong>{" "}
                  CHALLENGES
                </span>
                <span className="flex items-baseline gap-1">
                  <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                    <CountUp end={kpi.cities || 0} />
                  </strong>{" "}
                  CITIES
                </span>
                <span className="flex items-baseline gap-1">
                  <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                    <CountUp end={kpi.countries || 0} />
                  </strong>{" "}
                  COUNTRIES
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </div>
          </div>

          {/* Card 3: GYMS & TEAMS */}
          <div
            className="col-span-12 sm:col-span-6 relative overflow-hidden bg-black/5 dark:bg-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-md flex flex-col items-start text-left cursor-pointer transition-all duration-300 group hover:bg-black/10 dark:hover:bg-white/10 hover:-translate-y-1 active:scale-[0.98] active:bg-black/10 dark:active:bg-white/10 min-h-[220px]"
            onClick={() => {
              setTeamCategory("gyms");
              navigate("/gyms?eventType=all-time&mode=gyms");
            }}
          >
            {/* Sparkline bg */}
            <div className="absolute inset-x-0 bottom-0 top-1/4 opacity-20 group-hover:opacity-40 pointer-events-none transition-opacity duration-500 flex items-end mask-image-bottom">
              {countriesTrendData && countriesTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" debounce={150}>
                  <LineChart data={countriesTrendData}>
                    <YAxis domain={["dataMin", "dataMax"]} hide />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full border-t border-dashed border-indigo-500/20" />
              )}
            </div>

            <div className="absolute top-0 right-0 p-6 pointer-events-none z-30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 origin-top-right">
              <Users className="w-12 h-12 text-indigo-500/20 dark:text-indigo-500/30 group-hover:text-indigo-500/40 transition-colors" />
            </div>

            <div className="flex flex-col items-start gap-1 z-10 w-full relative pt-2">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">
                Teams
              </h2>
              <p className="text-sm font-medium text-zinc-500">
                Find gyms & teams
              </p>
            </div>

            <div className="mt-auto pt-8 w-full flex items-center justify-between z-10 text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
              <div className="flex flex-col items-start gap-1 sm:gap-2 font-mono font-medium">
                <span className="flex items-baseline gap-1">
                  <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                    <CountUp end={totalGyms || 0} />
                  </strong>{" "}
                  GYMS
                </span>
                <span className="flex items-baseline gap-1">
                  <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                    <CountUp end={totalTeams || 0} />
                  </strong>{" "}
                  TEAMS
                </span>
                <span className="flex items-baseline gap-1">
                  <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                    <CountUp end={teamCountries || 0} />
                  </strong>{" "}
                  COUNTRIES
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </div>
          </div>

          {/* Card 4: HALL OF FAME */}
          <div
            className="col-span-12 sm:col-span-6 relative overflow-hidden bg-black/5 dark:bg-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-md flex flex-col items-start text-left cursor-pointer transition-all duration-300 group hover:bg-black/10 dark:hover:bg-white/10 hover:-translate-y-1 active:scale-[0.98] active:bg-black/10 dark:active:bg-white/10 min-h-[220px]"
            onClick={() => navigate("/hof")}
          >
            <div className="absolute inset-x-0 bottom-0 top-1/4 opacity-20 group-hover:opacity-40 pointer-events-none transition-opacity duration-500 flex items-end mask-image-bottom">
              <div className="w-full h-full border-t border-dashed border-amber-500/20" />
            </div>

            <div className="absolute top-0 right-0 p-6 pointer-events-none z-30 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12 origin-top-right">
              <Trophy className="w-12 h-12 text-amber-500/20 dark:text-amber-500/30 group-hover:text-amber-500/40 transition-colors" />
            </div>

            <div className="flex flex-col items-start gap-1 z-10 w-full relative pt-2">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">
                HOF
              </h2>
              <p className="text-sm font-medium text-zinc-500">
                See ASR legends
              </p>
            </div>

            <div className="mt-auto pt-8 w-full flex items-center justify-between z-10 text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
              <div className="flex flex-col items-start gap-1 sm:gap-2 font-mono font-medium">
                <span className="flex items-baseline gap-1">
                  <strong className="text-zinc-900 dark:text-white tabular-nums text-sm sm:text-base">
                    <CountUp end={totalCoins || 0} />
                  </strong>{" "}
                  COINS
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-amber-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Unified Sets Section */}
      <motion.div
        variants={itemVariants}
        className="mt-8 sm:mt-12 mb-8 sm:mb-12 w-full max-w-4xl mx-auto px-2"
      >
        <div className="flex flex-col bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[2rem] p-4 sm:p-8 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center gap-3 mb-6 px-2 sm:px-0">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white leading-none">
                Recent Sets
              </h3>
            </div>
          </div>

          <div className="w-full pb-8 mb-6 border-b border-black/5 dark:border-white/5 px-2 sm:px-0">
            <ASRWeeklyActivityChart
              sends={allSetsWithDates}
              type="set"
              themeColor="emerald"
              isLoading={isLoading}
            />
          </div>

          {/* Recent Sets Timeline */}
          {(isLoading || (recentSets && recentSets.length > 0)) && (
            <div className="flex flex-col gap-3 w-full">
              <div className="relative pl-4 sm:pl-6 sm:pr-2">
                {/* Timeline Axis */}
                <div className="absolute top-4 bottom-4 left-[27.5px] sm:left-[39.5px] w-px bg-gradient-to-b from-emerald-500/50 via-emerald-500/20 to-transparent" />

                <div className="flex flex-col gap-4 relative z-10">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="relative flex items-start gap-4 sm:gap-6 mt-2"
                        >
                          <div className="relative mt-1.5 flex-shrink-0 z-20">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/5 dark:bg-white/5 border-2 border-black/10 dark:border-white/10 animate-pulse" />
                          </div>
                          <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-2xl p-4 sm:p-5 h-[100px] animate-pulse" />
                        </div>
                      ))
                    : (() => {
                        let currentMonth = "";
                        return recentSets
                          .slice(0, homeVisibleSets)
                          .map((item: any, idx: number) => {
                            const dateObj = new Date(item.timestamp);
                            const dayStr = dateObj.getDate().toString();
                            const monthStr = dateObj.toLocaleString("default", {
                              month: "short",
                            });
                            const isNewMonth =
                              monthStr && monthStr !== currentMonth;
                            if (isNewMonth) {
                              currentMonth = monthStr;
                            }
                            const skillFlag = fixCountryEntity(
                              item.country || "",
                              item.flag || item.region || "",
                            ).flag;

                            return (
                              <React.Fragment key={`set-${item.name}-${idx}`}>
                                {isNewMonth && (
                                  <div className="relative flex items-center justify-start gap-4 sm:gap-6 mt-1 mb-1">
                                    <div className="relative z-20 flex-shrink-0 flex justify-center w-6 sm:w-8">
                                      <div className="bg-white text-zinc-900 border-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-sm border z-30">
                                        {monthStr}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <div className="relative flex items-start gap-4 sm:gap-6 group">
                                  {/* Timeline Node */}
                                  <div className="relative mt-1.5 flex-shrink-0 z-20">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.05)] dark:shadow-[0_0_10px_rgba(255,255,255,0.05)] group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300">
                                      <span className="text-[10px] sm:text-xs font-black text-zinc-900 dark:text-white">
                                        {dayStr}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Content Card */}
                                  <div
                                    className="group/card flex-1 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl p-4 sm:p-5 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] active:bg-black/5 dark:active:bg-white/5 transition-all duration-300 cursor-pointer flex flex-row items-center justify-between min-w-0"
                                    onClick={() =>
                                      navigateToEntity("challenge", {
                                        name: item.name,
                                        ...item,
                                      })
                                    }
                                    onTouchStart={() => {}}
                                  >
                                    <div className="flex flex-col items-start text-left gap-1 sm:gap-1.5 flex-1 min-w-0 pr-4">
                                      <div className="flex items-center gap-2 max-w-full w-full">
                                        <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white uppercase transition-colors flex items-center gap-1.5 min-w-0 max-w-full shrink group-hover/card:text-emerald-500 group-has-[.setter-target:hover]/card:!text-zinc-900 dark:group-has-[.setter-target:hover]/card:!text-white group-has-[.location-target:hover]/card:!text-zinc-900 dark:group-has-[.location-target:hover]/card:!text-white">
                                          {skillFlag && (
                                            <span className="text-[12px] opacity-90 shrink-0">
                                              {skillFlag}
                                            </span>
                                          )}
                                          <span className="truncate">
                                            {item.name}
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex flex-col items-start gap-1 text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1 max-w-full w-full min-w-0 pr-2">
                                        <div
                                          className="location-target flex items-center gap-1.5 max-w-full min-w-0 hover:text-emerald-500 transition-colors cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const locArr = [item.city, item.stateProv, item.country].filter(v => v && v.toUpperCase() !== "UNKNOWN").join(", ");
                                            if (locArr) {
                                              navigateToEntity("region", { name: locArr });
                                            }
                                          }}
                                        >
                                          <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                          <span className="truncate uppercase tracking-wider text-[10px] sm:text-[11px]">
                                            {[
                                              item.city,
                                              item.stateProv,
                                              item.country,
                                            ]
                                              .filter(
                                                (v) =>
                                                  v &&
                                                  v.toUpperCase() !== "UNKNOWN",
                                              )
                                              .join(", ")}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 max-w-full min-w-0">
                                          <Waypoints className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                          <div className="truncate max-w-full text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-900 dark:text-white">
                                            {(
                                              (Array.isArray(item.leadSetters)
                                                ? item.leadSetters
                                                : (
                                                    item.leadSetters ||
                                                    item.setter ||
                                                    "Local Community"
                                                  ).split(",")) as string[]
                                            ).map(
                                              (
                                                s: string,
                                                idxSetter: number,
                                              ) => {
                                                const trimmed = s.trim();
                                                if (
                                                  trimmed.toUpperCase() ===
                                                  "LOCAL COMMUNITY"
                                                ) {
                                                  return (
                                                    <span
                                                      key={idxSetter}
                                                      className="uppercase tracking-wider text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400"
                                                    >
                                                      LOCAL COMMUNITY
                                                    </span>
                                                  );
                                                }
                                                return (
                                                  <React.Fragment
                                                    key={idxSetter}
                                                  >
                                                    {idxSetter > 0 && (
                                                      <span className="text-zinc-500 dark:text-zinc-400 mr-1">
                                                        ,
                                                      </span>
                                                    )}
                                                    <span
                                                      className="setter-target hover:text-emerald-500 transition-colors cursor-pointer uppercase tracking-wider text-[10px] sm:text-[11px]"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigateToEntity(
                                                          "setter",
                                                          { name: trimmed },
                                                        );
                                                      }}
                                                    >
                                                      {trimmed.toUpperCase()}
                                                    </span>
                                                  </React.Fragment>
                                                );
                                              },
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex flex-col justify-center items-end shrink-0 pl-2">
                                      <div className="flex items-center justify-center w-[36px] sm:w-[48px] shrink-0">
                                        {(item.videoUrl || item.demoVideo) && (
                                          <button
                                            type="button"
                                            className="p-2 sm:p-3 transition-all active:scale-90 text-zinc-500 group-hover/card:text-emerald-500 hover:!text-emerald-500 flex items-center justify-center cursor-pointer"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setPlayingVideoUrl(
                                                item.videoUrl || item.demoVideo,
                                              );
                                            }}
                                          >
                                            <Play
                                              className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px]"
                                              strokeWidth={3}
                                            />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          });
                      })()}
                </div>

                {!isLoading &&
                  recentSets &&
                  recentSets.length > homeVisibleSets && (
                    <div className="flex justify-center mt-8">
                      <button
                        className="group flex flex-col items-center gap-1 px-8 py-3 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 active:scale-[0.98] text-[10px] font-black tracking-widest uppercase text-zinc-400 hover:text-emerald-500 active:text-emerald-500 transition-all duration-300 rounded-2xl"
                        onClick={() =>
                          setHomeVisibleSets(
                            Math.min(
                              homeVisibleSets + 10,
                              100,
                              recentSets.length,
                            ),
                          )
                        }
                        onTouchStart={() => {}}
                      >
                        <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                        Load More
                      </button>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Unified Sends Section */}
      <motion.div
        variants={itemVariants}
        className="mt-8 sm:mt-12 mb-8 sm:mb-12 w-full max-w-4xl mx-auto px-2"
      >
        <div className="flex flex-col bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[2rem] p-4 sm:p-8 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center gap-3 mb-6 px-2 sm:px-0">
            <div className="p-2 bg-pink-500/10 rounded-xl">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white leading-none">
                Recent Sends
              </h3>
            </div>
          </div>

          <div className="w-full pb-8 mb-6 border-b border-black/5 dark:border-white/5 px-2 sm:px-0">
            <ASRWeeklyActivityChart
              sends={allRunsWithDates}
              type="send"
              themeColor="pink"
              isLoading={isLoading}
            />
          </div>

          {/* Recent Activity Timeline */}
          {(isLoading || (recentFeed && recentFeed.length > 0)) && (
            <div className="flex flex-col gap-3 w-full">
              <div className="relative pl-4 sm:pl-6 sm:pr-2">
                {/* Timeline Axis */}
                <div className="absolute top-4 bottom-4 left-[27.5px] sm:left-[39.5px] w-px bg-gradient-to-b from-pink-500/50 via-pink-500/20 to-transparent" />

                <div className="flex flex-col gap-4 relative z-10">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="relative flex items-start gap-4 sm:gap-6 mt-2"
                        >
                          <div className="relative mt-1.5 flex-shrink-0 z-20">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/5 dark:bg-white/5 border-2 border-black/10 dark:border-white/10 animate-pulse" />
                          </div>
                          <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-2xl p-4 sm:p-5 h-[100px] animate-pulse" />
                        </div>
                      ))
                    : (() => {
                        let currentMonth = "";
                        return recentFeed
                          .slice(0, homeVisibleRuns)
                          .map(
                            (
                              item: any,
                              idx: number,
                            ) => {
                              const rank = item.rank || 0;
                              const playerName = String(item.name || "").trim();
                              const skillName = String(
                                item.skillName ||
                                  item.challenge?.name ||
                                  "UNKNOWN CHALLENGE",
                              ).trim();
                              const resultVal =
                                item.result ||
                                (typeof item.time === "number"
                                  ? item.time.toFixed(2)
                                  : "--");

                              const athleteFlag = getCombinedFlags(
                                item.athlete,
                              ).trim();

                              const dateObj =
                                item.timeString && item.timeString !== "LATEST"
                                  ? new Date(item.timeString)
                                  : null;
                              const dayStr =
                                dateObj && !isNaN(dateObj.getTime())
                                  ? dateObj.getDate().toString()
                                  : "";
                              const monthStr =
                                dateObj && !isNaN(dateObj.getTime())
                                  ? dateObj.toLocaleString("default", {
                                      month: "short",
                                    })
                                  : "";

                              const isNewMonth =
                                monthStr && monthStr !== currentMonth;
                              if (isNewMonth) {
                                currentMonth = monthStr;
                              }

                              return (
                                <React.Fragment key={`${item.id}-${idx}`}>
                                  {isNewMonth && (
                                    <div className="relative flex items-center justify-start gap-4 sm:gap-6 mt-1 mb-1">
                                      <div className="relative z-20 flex-shrink-0 flex justify-center w-6 sm:w-8">
                                        <div className="bg-white text-zinc-900 border-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-sm border z-30">
                                          {monthStr}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="relative flex items-start gap-4 sm:gap-6 group">
                                    {/* Timeline Node */}
                                    <div className="relative mt-1.5 flex-shrink-0 z-20">
                                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.05)] dark:shadow-[0_0_10px_rgba(244,63,94,0.05)] group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(244,63,94,0.1)] dark:group-hover:shadow-[0_0_15px_rgba(244,63,94,0.1)] transition-all duration-300">
                                        {dayStr ? (
                                          <span className="text-[10px] sm:text-xs font-black text-zinc-900 dark:text-white">
                                            {dayStr}
                                          </span>
                                        ) : (
                                          <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-pink-500/50 dark:text-pink-500/50" />
                                        )}
                                      </div>
                                    </div>

                                    {/* Content Card */}
                                    <div
                                      className="group/card flex-1 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl p-4 sm:p-5 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] active:bg-black/5 dark:active:bg-white/5 transition-all duration-300 cursor-pointer flex flex-row items-center justify-between min-w-0"
                                      onClick={() =>
                                        navigateToEntity(
                                          "player",
                                          item.athlete || { name: item.name },
                                        )
                                      }
                                      onTouchStart={() => {}}
                                    >
                                      <div className="flex flex-col items-start text-left gap-1 sm:gap-1.5 flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2 max-w-full w-full">
                                          <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white uppercase transition-colors flex items-center gap-1.5 min-w-0 max-w-full shrink group-hover/card:text-pink-500 group-has-[.challenge-target:hover]/card:!text-zinc-900 dark:group-has-[.challenge-target:hover]/card:!text-white">
                                            {athleteFlag && (
                                              <span className="text-[12px] opacity-90 shrink-0">
                                                {athleteFlag}
                                              </span>
                                            )}
                                            <span className="truncate">
                                              {playerName}
                                            </span>
                                          </span>
                                        </div>

                                        <div className="flex flex-col items-start gap-1 text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1 max-w-full w-full min-w-0 pr-2">
                                          <div className="flex items-center max-w-full min-w-0 -mx-1 px-1 rounded-md">
                                            <div className="challenge-target flex items-baseline min-w-0 max-w-full">
                                              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 mr-1.5 self-center" />
                                              <span 
                                                className="truncate uppercase tracking-wider text-[10px] sm:text-[11px] hover:!text-pink-500 transition-colors cursor-pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigateToEntity(
                                                    "challenge",
                                                    item.challenge || {
                                                      name: item.skillName,
                                                    },
                                                  );
                                                }}
                                              >
                                                {skillName}
                                              </span>
                                              {item.challenge?.city && (
                                                <span 
                                                  className="truncate uppercase tracking-wider text-[10px] sm:text-[11px] text-zinc-500 hover:!text-pink-500 transition-colors cursor-pointer"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigateToEntity("region", { name: item.challenge.city });
                                                  }}
                                                >
                                                  {`, ${item.challenge.city}`}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-col justify-center items-end shrink-0 pl-2">
                                        <div className="flex items-center justify-center w-[36px] sm:w-[48px] shrink-0">
                                          {(item.videoUrl ||
                                            item.demoVideo) && (
                                            <button
                                              type="button"
                                              className="p-2 sm:p-3 transition-all active:scale-90 text-zinc-500 group-hover/card:text-pink-500 hover:!text-pink-500 flex items-center justify-center cursor-pointer"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setPlayingVideoUrl(
                                                  item.videoUrl ||
                                                    item.demoVideo,
                                                );
                                              }}
                                            >
                                              <Play
                                                className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px]"
                                                strokeWidth={3}
                                              />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </React.Fragment>
                              );
                            },
                          );
                      })()}
                </div>

                {!isLoading &&
                  recentFeed &&
                  recentFeed.length > homeVisibleRuns && (
                    <div className="flex justify-center mt-8">
                      <button
                        className="group flex flex-col items-center gap-1 px-8 py-3 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 active:scale-[0.98] text-[10px] font-black tracking-widest uppercase text-zinc-400 hover:text-pink-500 active:text-pink-500 transition-all duration-300 rounded-2xl"
                        onClick={() =>
                          setHomeVisibleRuns(
                            Math.min(
                              homeVisibleRuns + 10,
                              100,
                              recentFeed.length,
                            ),
                          )
                        }
                        onTouchStart={() => {}}
                      >
                        <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                        Load More
                      </button>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});
