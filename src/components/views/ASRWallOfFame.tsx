/* eslint-disable @typescript-eslint/no-explicit-any */
 
import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDataStore } from "../../store/useDataStore";
import { useSettersDerived } from "../../hooks/useDerivedData";
import { calculateWofStats } from "../../lib/asr-data";
import {
  cn,
  getCombinedFlags,
  THEME,
} from "../../lib/asr-utils";
import { ASRSectionHeading } from "../common/ASRSectionHeading";
import { ASRRankBadge } from "../ASRListItems";
import { ASRPromotionBanner } from "../common/ASRPromotionBanner";

interface ASRWallOfFameProps {
  onEntityClick: (type: string, data: any, options?: any) => void;
  theme: "light" | "dark";
}

export const ASRWallOfFame = React.memo(
  ({ onEntityClick, theme }: ASRWallOfFameProps) => {
    const data = useDataStore((s) => s.data);
    const atPerfs = useDataStore((s) => s.atPerfs);
    const lbAT = useDataStore((s) => s.lbAT);
    const atMet = useDataStore((s) => s.atMet);
    const cMet = useDataStore((s) => s.cMet);
    const { settersWithImpact } = useSettersDerived();
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const toggleExpand = (key: string) => {
      setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const stats = useMemo(() => {
      if (!data || data.length === 0) return null;
      return calculateWofStats(
        data,
        atPerfs,
        lbAT,
        atMet,
        settersWithImpact,
        cMet,
      );
    }, [data, lbAT, atMet, atPerfs, settersWithImpact, cMet]);

    const hasError = useDataStore((s) => s.hasError);

    if (!stats) {
      if (hasError) {
        return (
          <div className="flex flex-col items-center justify-center p-6 sm:p-10 text-center animate-in fade-in duration-700 min-h-[50vh]">
            <div className={cn("p-8 sm:p-12 w-full max-w-sm rounded-[2rem] border border-dashed flex flex-col items-center justify-center text-center gap-4 transition-colors", "theme-panel")}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1 bg-red-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="m2 2 20 20"/><path d="M17.5 17.5 22 22"/><path d="M22 22 17.5 17.5"/><path d="m2 22 4.5-4.5"/><path d="M6.5 17.5 2 22"/><path d="M10 17h4v4h-4z"/><path d="M12 2v4"/><path d="M12 10v4"/><path d="M2 12h4"/><path d="M10 12h4"/><path d="M18 12h4"/></svg>
              </div>
              <h3 className={cn("text-lg sm:text-xl font-black uppercase tracking-widest", theme === "dark" ? "text-red-400" : "text-red-600")}>NETWORK ERROR</h3>
              <p className={cn("text-[10px] font-bold uppercase tracking-widest opacity-50 px-2 line-clamp-2", theme === "dark" ? "text-red-400" : "text-red-600")}>WE COULDN'T CONNECT TO THE ASSETS SERVER.</p>
            </div>
          </div>
        );
      }
      return null;
    }

    const sections = [
      { l: "TOP RATED", k: "rating" },
      { l: "MOST POINTS", k: "pts" },
      { l: "MOST SENDS", k: "sends" },
      { l: "MOST FIRST SENDS", k: "firstSends" },
      { l: "MOST CITIES SENT IN", k: "cities" },
      { l: "MOST COUNTRIES SENT IN", k: "countries" },
      { l: "MOST 🪙", k: "contributionScore" },
      { l: "MOST IMPACT", k: "impact" },
      { l: "MOST SETS", k: "sets" },
    ];

    return (
      <div className="flex flex-col gap-12 pb-32 animate-in fade-in duration-700 w-full max-w-6xl mx-auto">
        <div className="px-4 sm:px-6 mt-0 mb-[-1.5rem] w-full">
          <p className="text-[10px] sm:text-[11px] font-bold text-zinc-500/80 dark:text-zinc-500/80 tracking-widest uppercase">
            * SEND 3+ CHALLENGES TO JOIN THE HOF
          </p>
        </div>
        {/* Leaderboard Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6">
          {sections.map((sec) => {
            const fullList = (stats.topStats as Record<string, any[]>)[sec.k] || [];
            const isExpanded = !!expandedSections[sec.k];
            const visibleList = isExpanded ? fullList.slice(0, 20) : fullList.slice(0, 5);

            return (
              <div key={sec.k} className="flex flex-col gap-5">
                <ASRSectionHeading title={sec.l} theme={theme} />
                <div
                  className={cn(
                    "rounded-[2.5rem] overflow-hidden transition-all duration-300 shadow-xl",
                    THEME.BENTO_CARD(theme),
                  )}
                >
                  <div className="flex flex-col divide-y divide-zinc-800/10">
                    {visibleList.map((a: any, i: number) => {
                      const isSetterBoard = ["impact", "sets"].includes(sec.k);
                      let displayVal: any;
                      if (sec.k === "rating")
                        displayVal = (a.rating || 0).toFixed(2);
                      else if (sec.k === "pts")
                        displayVal = (a.pts || 0).toFixed(2);
                      else if (sec.k === "contributionScore")
                        displayVal = (a.contributionScore || 0).toFixed(2);
                      else if (sec.k === "impact") displayVal = a.impact || 0;
                      else if (sec.k === "sets") displayVal = a.sets || 0;
                      else displayVal = a[sec.k] || 0;

                      const isTop3 = i < 3;
                      const flags = getCombinedFlags(a);
                      const hoverClass =
                        theme === "dark"
                          ? "hover:bg-blue-500/10"
                          : "hover:bg-blue-500/5";

                      return (
                        <button
                          key={a.id || a.pKey || i}
                          onClick={() =>
                            onEntityClick(
                              isSetterBoard ? "setter" : "player",
                              a,
                              { initialMode: "all-time" },
                            )
                          }
                          className={cn(
                            "flex items-center justify-between py-4 sm:py-5 px-4 sm:px-6 transition-colors duration-150 group relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
                            hoverClass,
                            i === 0 && (theme === "dark" ? "bg-white/[0.02]" : "bg-black/[0.02]")
                          )}
                        >
                          <div className="flex items-center gap-4 min-w-0 z-10 relative">
                            <ASRRankBadge rank={i + 1} />
                            <div className="flex flex-col text-left">
                              <span
                                className={cn(
                                  "text-[14px] sm:text-[18px] lg:text-[22px] font-black uppercase truncate pr-2 leading-tight transition-colors",
                                  theme === "dark"
                                    ? "text-zinc-100"
                                    : "text-zinc-900",
                                  i === 0 ? "text-zinc-900 dark:text-white group-hover:text-blue-500" : "group-hover:text-blue-500"
                                )}
                              >
                                {flags} {a.name}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 shrink-0 text-right z-10 relative">
                            <span
                              className={cn(
                                "text-[16px] sm:text-[24px] lg:text-[28px] font-mono font-black tracking-tighter whitespace-nowrap transition-all tabular-nums text-right group-hover:text-blue-500",
                                theme === "dark" ? "text-white" : "text-zinc-900",
                                isTop3 ? "scale-110" : "opacity-100",
                              )}
                            >
                              {displayVal}
                            </span>
                          </div>
                          {isTop3 && i === 0 && (
                            <>
                              <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-500/10 rotate-45 translate-x-16 -translate-y-16 pointer-events-none blur-xl" />
                              <div className="absolute inset-0 bg-gradient-to-r from-zinc-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                            </>
                          )}
                        </button>
                      );
                    })}
                    {fullList.length > 5 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(sec.k)}
                        className={cn(
                          "w-full py-3.5 px-6 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset cursor-pointer",
                          theme === "dark"
                            ? "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                            : "text-zinc-500 hover:text-zinc-900 hover:bg-black/[0.03]",
                        )}
                      >
                        <span>{isExpanded ? "SHOW LESS" : `SHOW TOP ${Math.min(20, fullList.length)}`}</span>
                        <ChevronDown
                          size={14}
                          className={cn(
                            "transition-transform duration-200",
                            isExpanded ? "rotate-180" : "",
                          )}
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 sm:px-6 mt-8">
          <ASRPromotionBanner
            type={
              ["skool", "setter"][
                Math.floor(Math.random() * 2)
              ] as any
            }
            theme={theme}
          />
        </div>
      </div>
    );
  },
);

export const ASRHOF = ASRWallOfFame;
