import React, { useMemo, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import {
  Zap,
  Compass,
  Users,
  Ruler,
  Mountain,
  Dna,
  Calendar,
  MapPin,
  Play,
  ArrowDown,
  Check,
} from "lucide-react";
import {
  cn,
  formatLocation,
  THEME,
  getCombinedFlags,
  normalizeName,
  getSetterLevel,
} from "../../lib/asr-utils";
import { parseSafeDate } from "../../lib/asr-data";
import { useAppStore } from "../../store/useAppStore";
import { ProfileHeader, ASRPatronPill, SectionTitle, InspectorTabContainer } from "./InspectorComponents";
import { FallbackAvatar } from "../common/FallbackAvatar";
import { ASRPromotionBanner } from "../common/ASRPromotionBanner";
import { ASRRankList } from "../list/ASRRankList";
import { ASRStandardButton } from "../common/ASRStandardButton";
import { ASRBottomSheet } from "../common/ASRBottomSheet";
import { ASRStatCard } from "../common/ASRStatCard";
import { ASRWeeklyActivityChart } from "./ASRWeeklyActivityChart";

import { motion } from "motion/react";

import { ASRNeonToggle } from "../common/ASRNeonToggle";
import { ModalScrollContext } from "../common/ASRBaseModal";

import { SkillData, ASRDataContext } from "../../types";

interface SkillDetailsProps {
  challenge: SkillData;
  dataContext: ASRDataContext;
  onEntityClick: (type: string, data: Record<string, unknown>) => void;
  theme: "light" | "dark";
}

const SetterDisplay = ({
  text,
  dataContext,
  onSetterClick,
  theme,
  isLead,
}: {
  text: string;
  dataContext: ASRDataContext;
  onSetterClick?: (type: string, data: Record<string, unknown>) => void;
  theme: "light" | "dark";
  isLead?: boolean;
}) => {
  if (!text) return null;
  const rawNames = text.split(",").map((s: string) => s.trim());
  
  const names = [...rawNames].sort((a, b) => {
    const aKey = normalizeName(a);
    const bKey = normalizeName(b);
    
    const aImpact = dataContext?.setterMet?.[aKey]?.impact || 0;
    const bImpact = dataContext?.setterMet?.[bKey]?.impact || 0;
    
    const aSets = dataContext?.setterMet?.[aKey]?.sets || 0;
    const bSets = dataContext?.setterMet?.[bKey]?.sets || 0;
    
    const aLevel = Number(getSetterLevel(aImpact, aSets) || 0);
    const bLevel = Number(getSetterLevel(bImpact, bSets) || 0);
    
    if (aLevel !== bLevel) return bLevel - aLevel;
    return bImpact - aImpact;
  });

  return (
    <div className="flex flex-col gap-3 mt-1 relative w-full">
      {/* timeline line */}
      <div
        className={cn(
          "absolute left-[25px] top-4 bottom-4 w-[2px]",
          "bg-black/10 dark:bg-white/10",
        )} />
      {names.map((name: string, i: number) => {
        const pKey = normalizeName(name);
        const pImpact = dataContext?.setterMet?.[pKey]?.impact || 0;
        const pSets = dataContext?.setterMet?.[pKey]?.sets || 0;
        const certLevel = getSetterLevel(pImpact, pSets);
        const hasBadge = !!certLevel;

        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onSetterClick?.("setter", { name });
            }}
            className={cn(
              "group flex flex-col relative pl-[52px] pr-5 py-3.5 rounded-[1.25rem] transition-all text-left w-full outline-none hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "theme-focus theme-card border",
            )}
          >
            <div
              className={cn(
                "absolute left-[8px] top-1/2 -translate-y-1/2 w-[34px] h-[34px] rounded-full border-[3px] flex items-center justify-center transition-colors overflow-hidden",
                "bg-zinc-100 border-white group-hover:border-zinc-50 dark:bg-zinc-900 dark:border-zinc-900 dark:group-hover:border-zinc-800",
                "theme-text-base",
              )}
            >
              <FallbackAvatar name={name} sizeCls="w-full h-full text-sm" />
            </div>
            <div className="flex justify-between items-center w-full min-w-0 gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-black text-sm uppercase tracking-tight truncate",
                    "theme-text-base group-hover:text-blue-500",
                  )}
                >
                  {name}
                </span>
                {hasBadge && (
                  <span className="inline-flex items-center justify-center bg-red-600 text-white rounded-[4px] px-1.5 py-[1px] min-w-[20px] shadow-[0_0_8px_rgba(220,38,38,0.3)] leading-none border border-red-500/50 font-black text-[10px]">
                    {certLevel}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export const SkillDetails = React.memo(
  ({ challenge, dataContext, onEntityClick, theme }: SkillDetailsProps) => {
    const {
      cMet = {},
      atMet = {},
      pRaw = {},
      skillRunsHistory = {},
    } = dataContext || {};
    const setPlayingVideoUrl = useAppStore(s => s.setPlayingVideoUrl);
    const cName = (challenge?.name || "").toUpperCase();
    const meta: any = cMet[cName] || challenge || {};

    const scrollRef = React.useContext(ModalScrollContext);

    const scrollToTop = () => {
      if (scrollRef?.current) {
        if (scrollRef.current.scrollTop > 150) {
          scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    };

    const allSkillRuns = useMemo(() => {
      let runList: Record<string, unknown>[] = [];
      if (skillRunsHistory[cName]) {
        runList = skillRunsHistory[cName].map((r: any) => ({
          ...r,
          athlete: atMet[r.pKey]?.name || r.athlete || r.pKey,
          gender: atMet[r.pKey]?.gender || r.gender || "M",
          country:
            atMet[r.pKey]?.countryName || atMet[r.pKey]?.country || r.country,
          flag: atMet[r.pKey]?.region || atMet[r.pKey]?.flag || r.flag,
        }));
      } else {
        const allTimePlayers = pRaw["all-time"] || {};
        Object.entries(allTimePlayers).forEach(
          ([pKey, playerRuns]: [string, any]) => {
            if (Array.isArray(playerRuns)) {
              const filtered = playerRuns.filter(
                (r) => (r.challenge || r.label || "").toUpperCase() === cName,
              );
              filtered.forEach((r) => {
                runList.push({
                  ...r,
                  pKey,
                  athlete: atMet[pKey]?.name || pKey,
                  gender: atMet[pKey]?.gender || "M",
                  country: atMet[pKey]?.countryName || atMet[pKey]?.country,
                  flag: atMet[pKey]?.region || atMet[pKey]?.flag,
                });
              });
            }
          },
        );
      }
      
      const mInterims = (dataContext.skillRecords_M_AT?.[cName] || []).filter((r: any) => r.isInterim);
      mInterims.forEach((r: any) => {
        runList.push({ ...r, athlete: "INTERIM TOP TIME", date: "2026-03-01T00:00:00Z", gender: "M", num: r.time, isInterim: true });
      });
      const fInterims = (dataContext.skillRecords_F_AT?.[cName] || []).filter((r: any) => r.isInterim);
      fInterims.forEach((r: any) => {
        runList.push({ ...r, athlete: "INTERIM TOP TIME", date: "2026-03-01T00:00:00Z", gender: "F", num: r.time, isInterim: true });
      });

      return runList;
    }, [pRaw, cName, atMet, skillRunsHistory, dataContext.skillRecords_M_AT, dataContext.skillRecords_F_AT]);

    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const urlTab = searchParams.get("tab");
    const validTabs = ["stats", "men", "women"];
    
    const initialTabSafe = validTabs.includes(urlTab as string)
        ? (urlTab as "stats" | "men" | "women")
        : "stats";
    const [uiTab, setUiTab] = useState<string>(initialTabSafe);
    const [contentTab, setContentTab] = useState<string>(initialTabSafe);

    const urlMode = searchParams.get("mode");
    const eventTypeMode = searchParams.get("eventType");
    const validModes = ["open", "all-time", "2026"];
    
    let initialModeSafe: "all-time" | "2026" = "all-time";
    if (validModes.includes(urlMode as string)) {
      initialModeSafe = urlMode as "all-time" | "2026";
    } else if (validModes.includes(eventTypeMode as string)) {
      initialModeSafe = eventTypeMode as "all-time" | "2026";
    }
    const [uiMode, setUiMode] = useState<"all-time" | "2026">(initialModeSafe);
    const [contentMode, setContentMode] = useState<"all-time" | "2026">(initialModeSafe);

    const urlSort = searchParams.get("sort");
    const urlDir = searchParams.get("dir");
    const validSorts = ["date", "player"];
    const validDirs = ["desc", "asc"];

    const sortCategory = validSorts.includes(urlSort as string) ? (urlSort as "date" | "player") : "date";
    const sortDirection = validDirs.includes(urlDir as string) ? (urlDir as "desc" | "asc") : "asc";

    const setSortState = (cat: string, dir: string) => {
      setSearchParams(prev => {
        prev.set("sort", cat);
        prev.set("dir", dir);
        return prev;
      }, { replace: true, state: location.state, preventScrollReset: true });
    };

    const [isSortOpen, setIsSortOpen] = useState(false);

    const recordsM = contentMode === "all-time" 
      ? (dataContext.skillRecords_M_AT?.[cName] || [])
      : contentMode === "2026"
      ? (dataContext.skillRecords_M_2026?.[cName] || [])
      : (dataContext.skillRecords_M_OP?.[cName] || []);

    const recordsF = contentMode === "all-time" 
      ? (dataContext.skillRecords_F_AT?.[cName] || [])
      : contentMode === "2026"
      ? (dataContext.skillRecords_F_2026?.[cName] || [])
      : (dataContext.skillRecords_F_OP?.[cName] || []);

    const sortRecords = (records: any[]) => {
      const sorted = [...records];
      sorted.sort((a, b) => {
        if (a.isInterim && !b.isInterim) return -1;
        if (!a.isInterim && b.isInterim) return 1;

        const aDate = a.date ? (parseSafeDate(a.date)?.getTime() ?? Infinity) : Infinity;
        const bDate = b.date ? (parseSafeDate(b.date)?.getTime() ?? Infinity) : Infinity;
        const aName = String(atMet[a.pKey]?.name || a.pKey || a.athlete || "").toUpperCase();
        const bName = String(atMet[b.pKey]?.name || b.pKey || b.athlete || "").toUpperCase();

        if (sortCategory === "player") {
          const primary = aName.localeCompare(bName);
          if (primary !== 0) return sortDirection === "desc" ? -primary : primary;
          return aDate - bDate;
        } else {
          const primary = aDate - bDate;
          if (primary !== 0) return sortDirection === "desc" ? -primary : primary;
          return aName.localeCompare(bName);
        }
      });
      return sorted;
    };

    const sortedRecordsM = useMemo(() => sortRecords(recordsM), [recordsM, sortCategory, sortDirection, atMet]);
    const sortedRecordsF = useMemo(() => sortRecords(recordsF), [recordsF, sortCategory, sortDirection, atMet]);

    const atRecordsM = dataContext.skillRecords_M_AT?.[cName] || [];
    const atRecordsF = dataContext.skillRecords_F_AT?.[cName] || [];

    const stats = [
      {
        label: "Difficulty",
        value: meta.difficulty || "-",
        icon: <Compass className="w-3.5 h-3.5" />,
      },
      {
        label: "Points",
        value: meta.points ? String(meta.points) : "-",
        icon: <Zap className="w-3.5 h-3.5" />,
      },
      {
        label: "Players",
        value: String(
          atRecordsM.filter(r => !r.isInterim).length +
          atRecordsF.filter(r => !r.isInterim).length
        ),
        icon: <Users className="w-3.5 h-3.5" />,
      },
      {
        label: "Length",
        value: meta.length
          ? `${Math.round(parseFloat(meta.length) || 0)}m`
          : "-",
        icon: <Ruler className="w-3.5 h-3.5" />,
      },
      {
        label: "Elevation",
        value: meta.elevation
          ? `${(parseFloat(meta.elevation) || 0).toFixed(2)}m`
          : "-",
        icon: <Mountain className="w-3.5 h-3.5" />,
      },
      {
        label: "Type",
        value: meta.type || "Standard",
        icon: <Dna className="w-3.5 h-3.5" />,
      },
      {
        label: "Date",
        value: meta.dateSet || "-",
        icon: <Calendar className="w-3.5 h-3.5" />,
      },
    ];

    const mapsUrl = meta.coordinates
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meta.coordinates)}`
      : null;
    const firstRunVideoUrl = useMemo(() => {
      const runsWithVideo = allSkillRuns.filter((r: any) => r.videoUrl && r.date);
      if (runsWithVideo.length === 0) return null;
      runsWithVideo.sort((a: any, b: any) => {
        const dateA = parseSafeDate(a.date as string)?.getTime() ?? Infinity;
        const dateB = parseSafeDate(b.date as string)?.getTime() ?? Infinity;
        return dateA - dateB;
      });
      return runsWithVideo[0].videoUrl;
    }, [allSkillRuns]);

    const rulesUrl = firstRunVideoUrl || meta.demoVideo;

    return (
      <div
        className={cn(
          "flex flex-col relative pb-20 transition-colors",
          theme === "dark" ? "bg-[#030303]" : "bg-white",
        )}
      >
        <ProfileHeader
          theme={theme}
          avatar={<FallbackAvatar name={cName} sizeCls="text-3xl" />}
          title={
            <span className="flex items-center gap-2">
              <span className="shrink-0 leading-none">{getCombinedFlags(meta)}</span>
              <span className="truncate">{cName}</span>
            </span>
          }
          subtitle={
            <div className="flex items-center gap-1.5 opacity-60 font-black text-[11px] uppercase tracking-widest mt-1 w-full min-w-0">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{formatLocation(meta)}</span>
            </div>
          }

        />
        <div className="flex w-full gap-2 px-4 py-3 pt-4 border-b border-white/[0.05]">
          <ASRStandardButton
            href={mapsUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            variant="premium"
            color="blue"
            theme={theme}
            disabled={!mapsUrl}
            className="flex-1 py-2.5 px-0 justify-center rounded-xl text-[12px]"
            onClick={(e: React.MouseEvent) =>
              !mapsUrl && e.preventDefault()
            }
          >
            <MapPin size={16} strokeWidth={2.5} />
            <span>MAP</span>
          </ASRStandardButton>
          <ASRStandardButton
            href={rulesUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            variant="premium"
            color="red"
            theme={theme}
            disabled={!rulesUrl}
            className="flex-1 py-2.5 px-0 justify-center rounded-xl text-[12px]"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              if (rulesUrl) {
                setPlayingVideoUrl(rulesUrl);
              }
            }}
          >
            <Play size={16} strokeWidth={2.5} />
            <span>RULES</span>
          </ASRStandardButton>
        </div>

        <div className="w-full px-4 py-3 border-b border-white/[0.05]">
          <ASRPatronPill challenge={meta} theme={theme} isBanner={false} />
        </div>

        <div
          className={cn(
            "flex items-center justify-center border-b sticky top-0 z-40 backdrop-blur-3xl transition-colors py-2",
            theme === "dark"
              ? "border-white/5 bg-zinc-950/80 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
              : "border-black/5 bg-white/90 shadow-[0_4px_30px_rgba(0,0,0,0.03)]",
          )}
        >
          <div className="flex w-full max-w-2xl px-4">
            <ASRNeonToggle theme={theme}
              options={[
                { label: "MEN", value: "men" },
                { label: "WOMEN", value: "women" },
                { label: "BIO", value: "stats" },
              ]}
              activeOption={uiTab}
              onChange={(t) => {
                setUiTab(t);
                React.startTransition(() => {
                  setContentTab(t);
                });
                scrollToTop();
              }}
              layoutId="challenge-tabs"
              className="w-full" />
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col flex-1 transition-colors",
            theme === "dark" ? "bg-[#030303]" : "bg-white",
          )}
        >
          {contentTab === "men" && (
            <div className="animate-in fade-in duration-300 flex flex-col h-full overflow-visible">
              <div
                className={cn(
                  "flex justify-center border-b transition-colors overflow-visible sticky top-[46px] z-30 py-3",
                  theme === "dark"
                    ? "border-white/[0.05] bg-zinc-950/80 backdrop-blur-xl"
                    : "border-black/[0.05] bg-white/90 backdrop-blur-xl",
                )}
              >
                <ASRNeonToggle theme={theme}
                  options={[
                    { label: "ALL-TIME", value: "all-time" },
                    { label: "2026", value: "2026" },
                    
                  ]}
                  activeOption={uiMode}
                  onChange={(m) => {
                    const nextMode = m as "all-time" | "2026";
                    setUiMode(nextMode);
                    React.startTransition(() => {
                      setContentMode(nextMode);
                    });
                    scrollToTop();
                  }}
                  layoutId="challenge-mode-pill-m"
                  className="w-full max-w-[280px]" />
              </div>
              <div className="px-4 py-6 overflow-visible min-h-[500px]">
                {contentMode === "open" && !meta.isOpenSkill ? (
                  <div className="text-center text-zinc-500 py-10 px-4 text-sm max-w-sm mx-auto">
                    * Challenge not included in the 2026 ASR Open.
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <SectionTitle noPadding>VERIFIED SENDS</SectionTitle>
                      <div
                        className={cn(
                          "flex items-center rounded-full border text-[10px] font-black uppercase tracking-widest",
                          theme === "dark" ? "border-white/10 bg-zinc-900/50" : "border-black/10 bg-zinc-100/50"
                        )}
                      >
                        <button
                          onClick={() => setIsSortOpen(true)}
                          className="px-3 py-1.5 hover:opacity-70 transition-opacity uppercase"
                        >
                          {sortCategory}
                        </button>
                        <div className={cn("w-px h-3", theme === "dark" ? "bg-white/20" : "bg-black/20")} />
                        <button
                          onClick={() => setSortState(sortCategory, sortDirection === "desc" ? "asc" : "desc")}
                          className="px-2 py-1.5 hover:opacity-70 transition-opacity flex items-center justify-center"
                        >
                          <ArrowDown size={14} className={cn("transition-transform duration-200", sortDirection === "asc" ? "rotate-180" : "")} />
                        </button>
                      </div>
                    </div>
                    <ASRRankList
                      athletes={sortedRecordsM}
                      dataContext={dataContext}
                      onEntityClick={onEntityClick}
                      entityType="player"
                      showDateSubtitle={true}
                      padTo={3}
                    />
                  </div>
                )}
              </div>
              <div className="pt-4 px-4 pb-8">
                <ASRPromotionBanner
                  type="sponsor"
                  theme={theme}
                  challenge={challenge}
                />
              </div>
            </div>
          )}

          {contentTab === "women" && (
            <div className="animate-in fade-in duration-300 flex flex-col h-full overflow-visible">
              <div
                className={cn(
                  "flex justify-center border-b transition-colors overflow-visible sticky top-[46px] z-30 py-3",
                  theme === "dark"
                    ? "border-white/[0.05] bg-zinc-950/80 backdrop-blur-xl"
                    : "border-black/[0.05] bg-white/90 backdrop-blur-xl",
                )}
              >
                <ASRNeonToggle theme={theme}
                  options={[
                    { label: "ALL-TIME", value: "all-time" },
                    { label: "2026", value: "2026" },
                    
                  ]}
                  activeOption={uiMode}
                  onChange={(m) => {
                    const nextMode = m as "all-time" | "2026";
                    setUiMode(nextMode);
                    React.startTransition(() => {
                      setContentMode(nextMode);
                    });
                    scrollToTop();
                  }}
                  layoutId="challenge-mode-pill-f"
                  className="w-full max-w-[280px]" />
              </div>
              <div className="px-4 py-6 overflow-visible min-h-[500px]">
                {contentMode === "open" && !meta.isOpenSkill ? (
                  <div className="text-center text-zinc-500 py-10 px-4 text-sm max-w-sm mx-auto">
                    * Challenge not included in the 2026 ASR Open.
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <SectionTitle noPadding>VERIFIED SENDS</SectionTitle>
                      <div
                        className={cn(
                          "flex items-center rounded-full border text-[10px] font-black uppercase tracking-widest",
                          theme === "dark" ? "border-white/10 bg-zinc-900/50" : "border-black/10 bg-zinc-100/50"
                        )}
                      >
                        <button
                          onClick={() => setIsSortOpen(true)}
                          className="px-3 py-1.5 hover:opacity-70 transition-opacity uppercase"
                        >
                          {sortCategory}
                        </button>
                        <div className={cn("w-px h-3", theme === "dark" ? "bg-white/20" : "bg-black/20")} />
                        <button
                          onClick={() => setSortState(sortCategory, sortDirection === "desc" ? "asc" : "desc")}
                          className="px-2 py-1.5 hover:opacity-70 transition-opacity flex items-center justify-center"
                        >
                          <ArrowDown size={14} className={cn("transition-transform duration-200", sortDirection === "asc" ? "rotate-180" : "")} />
                        </button>
                      </div>
                    </div>
                    <ASRRankList
                      athletes={sortedRecordsF}
                      dataContext={dataContext}
                      onEntityClick={onEntityClick}
                      entityType="player"
                      showDateSubtitle={true}
                      padTo={3}
                    />
                  </div>
                )}
              </div>
              <div className="pt-4 px-4 pb-8">
                <ASRPromotionBanner
                  type="sponsor"
                  theme={theme}
                  challenge={challenge}
                />
              </div>
            </div>
          )}

          {contentTab === "stats" && (
            <InspectorTabContainer tight>
              <div className="flex flex-col gap-4">
                {meta.notes && (
                  <div className="flex flex-col gap-3 pb-2">
                    <SectionTitle>NOTES</SectionTitle>
                    <div className="text-zinc-300 text-[15px] leading-relaxed whitespace-pre-wrap px-1">
                      {meta.notes}
                    </div>
                  </div>
                )}
                
                <SectionTitle>STATS</SectionTitle>

                <div className="grid grid-cols-2 gap-2.5 overflow-visible">
                  {stats.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        delay: i * 0.05,
                        duration: 0.3
                      }}
                      className="flex"
                    >
                      <ASRStatCard label={s.label} value={s.value} icon={s.icon} />
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <SectionTitle>WEEKLY ACTIVITY</SectionTitle>
                <div className="px-2 pb-2">
                  <ASRWeeklyActivityChart sends={allSkillRuns} type="send" themeColor="pink" />
                </div>
              </div>

              {(meta.leadSetters || meta.assistantsetters || meta.setter) && (
                <div className="flex flex-col gap-4 text-left overflow-visible w-full">
                  <SectionTitle>SETTERS</SectionTitle>
                  <div
                    className={cn(
                      "flex flex-col gap-6 p-5 rounded-[2rem]",
                      THEME.BENTO_CARD(theme),
                    )}
                  >
                    {(meta.leadSetters || meta.setter) && (
                      <div className="flex flex-col gap-1">
                        <SectionTitle noPadding className="opacity-40">
                          LEADS
                        </SectionTitle>
                        <div
                          className={cn(
                            "text-[15px] font-black tabular-nums tracking-tighter",
                            "theme-text-base",
                          )}
                        >
                          <SetterDisplay
                            text={meta.leadSetters || meta.setter}
                            dataContext={dataContext}
                            onSetterClick={onEntityClick}
                            theme={theme}
                            isLead={true}
                          />
                        </div>
                      </div>
                    )}
                    {meta.assistantsetters && (
                      <div className="flex flex-col gap-1 mt-2">
                        <SectionTitle noPadding className="opacity-40">
                          ASSISTS
                        </SectionTitle>
                        <div
                          className={cn(
                            "text-[15px] font-black tabular-nums tracking-tighter",
                            "theme-text-base",
                          )}
                        >
                          <SetterDisplay
                            text={meta.assistantsetters}
                            dataContext={dataContext}
                            onSetterClick={onEntityClick}
                            theme={theme}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 pb-8">
                <ASRPromotionBanner
                  type="sponsor"
                  theme={theme}
                  challenge={challenge}
                />
              </div>
            </InspectorTabContainer>
          )}
        </div>

        {isSortOpen && (
          <ASRBottomSheet
            snapPoints={[0, 0.55]}
            activeSnap={isSortOpen ? 0.55 : 0}
            onSnapChange={(snap) => {
              if (snap === 0) setIsSortOpen(false);
            }}
          >
            <div className="flex flex-col px-6 py-4 pb-12 gap-1.5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 pl-1">
                SORT SENDS
              </h3>
              {[
                { id: "date", label: "DATE" },
                { id: "player", label: "PLAYER" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    const nextDir = "asc";
                    setSortState(opt.id, nextDir);
                    setIsSortOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between w-full p-4 rounded-xl transition-all outline-none focus-visible:ring-2",
                    sortCategory === opt.id
                      ? (theme === "dark" ? "bg-white/10" : "bg-black/5")
                      : "hover:bg-zinc-500/10"
                  )}
                >
                  <span className={cn(
                    "text-sm font-black uppercase tracking-widest",
                    sortCategory === opt.id
                      ? (theme === "dark" ? "text-white" : "text-black")
                      : "text-zinc-500"
                  )}>
                    {opt.label}
                  </span>
                  {sortCategory === opt.id && (
                    <Check size={18} className={theme === "dark" ? "text-white" : "text-black"} />
                  )}
                </button>
              ))}
            </div>
          </ASRBottomSheet>
        )}
      </div>
    );
  },
);
