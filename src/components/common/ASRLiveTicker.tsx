/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import {
  cn,
  formatFlagsWithSpace,
  getCombinedFlags,
} from "../../lib/asr-utils";
import { useDataStore } from "../../store/useDataStore";

interface ASRLiveTickerProps {
  onEntityClick: (type: string, data: any) => void;
  theme: "light" | "dark";
}

export const ASRLiveTicker = React.memo(
  ({ onEntityClick, theme }: ASRLiveTickerProps) => {
    const rawFeed = useDataStore((s) => s.recentFeed);

    if (!rawFeed || rawFeed.length === 0) {
      return (
        <div
          className={cn(
            "relative z-[40] w-full h-[calc(2.5rem+env(safe-area-inset-top))] sm:h-[calc(3rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b flex items-center justify-center select-none overflow-hidden transition-colors duration-500",
            theme === "dark"
              ? "bg-zinc-950/80 border-white/5 text-zinc-100 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
              : "bg-white/90 border-zinc-200/50 text-slate-800 shadow-[0_4px_30px_rgba(0,0,0,0.03)]",
          )}
        >
          <div
            className="opacity-30 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 2rem, black calc(100% - 2rem), transparent)",
            }}
          >
            SCANNING LIVE STATS...
          </div>
        </div>
      );
    }

    // Extend feed to ensure it's wider than any screen, solving the scroll max-out freeze issue
    let extendedFeed = [...rawFeed];
    while (extendedFeed.length > 0 && extendedFeed.length < 20) {
      extendedFeed = [...extendedFeed, ...rawFeed];
    }
    const duplicatedFeed = [...extendedFeed, ...extendedFeed];

    // Calculate a consistent scroll speed (~60 pixels per second)
    const estimatedWidthPerItem = 300;
    const scrollDistance = extendedFeed.length * estimatedWidthPerItem;
    const animationDurationSeconds = Math.max(20, scrollDistance / 60);

    return (
      <div
        className={cn(
          "relative z-[40] w-full overflow-hidden border-b h-[calc(2.5rem+env(safe-area-inset-top))] sm:h-[calc(3rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] flex items-center select-none transition-colors duration-500 backdrop-blur-md",
          theme === "dark"
            ? "bg-zinc-950/80 border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
            : "bg-white/90 border-zinc-200/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]",
        )}
      >
        <div
          className="flex items-center shrink-0 whitespace-nowrap gap-12 sm:gap-20 animate-marquee"
          style={{
            animationDuration: `${animationDurationSeconds}s`,
            maskImage:
              "linear-gradient(to right, transparent, black 1.5rem, black calc(100% - 1.5rem), transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 1.5rem, black calc(100% - 1.5rem), transparent)",
          }}
        >
          {duplicatedFeed.map((item: any, idx: number) => {
            const rank = item.rank || 0;
            const athleteFlag = getCombinedFlags(item.athlete).trim();
            const skillFlag = formatFlagsWithSpace(
              item.challenge?.flag || "",
            ).trim();
            const playerName = String(item.name || "")
              .trim()
              .toUpperCase();
            const skillNameRaw = String(
              item.skillName || item.challenge?.name || "UNKNOWN CHALLENGE",
            )
              .trim()
              .toUpperCase();
            const rawCity = String(
              item.challenge?.city || item.challenge?.location || "",
            )
              .trim()
              .toUpperCase();
            const cityName =
              rawCity === "UNKNOWN" || rawCity === "UNDEFINED" ? "" : rawCity;
            const skillName = cityName
              ? `${skillNameRaw}, ${cityName}`
              : skillNameRaw;
            const resultVal =
              item.result ||
              (typeof item.time === "number" ? item.time.toFixed(2) : "--");

            return (
              <div
                key={`${item.id}-${idx}`}
                className="flex items-center font-black tracking-[0.02em] text-[11px] sm:text-[12px] group transition-colors select-none italic"
              >
                <span
                  className={cn(
                    "shrink-0 tabular-nums transition-colors",
                    theme === "dark" ? "text-white/40" : "text-zinc-400",
                  )}
                >
                  {item.timeString || "00:00"}
                </span>
                <span className="whitespace-pre"> </span>

                <div className="flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEntityClick(
                        "player",
                        item.athlete || { name: item.name },
                      );
                    }}
                    className={cn(
                      "transition-all cursor-pointer flex items-center outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-[2px] active:scale-95",
                      theme === "dark"
                        ? "text-white hover:text-blue-500"
                        : "text-zinc-900 hover:text-blue-500",
                    )}
                  >
                    {athleteFlag && (
                      <span className="shrink-0 whitespace-pre">
                        {athleteFlag}{" "}
                      </span>
                    )}
                    <span className="shrink-0 font-bold">{playerName}</span>
                  </button>
                  <span className="whitespace-pre"> </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEntityClick(
                        "challenge",
                        item.challenge || { name: item.skillName },
                      );
                    }}
                    className={cn(
                      "transition-all cursor-pointer flex items-center outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-[2px] active:scale-95",
                      theme === "dark"
                        ? "text-white hover:text-blue-500"
                        : "text-zinc-900 hover:text-blue-500",
                    )}
                  >
                    {skillFlag && (
                      <span className="shrink-0 whitespace-pre">
                        {skillFlag}{" "}
                      </span>
                    )}
                    <span className="shrink-0 font-bold">{skillName}</span>
                  </button>
                  <span className="shrink-0 inline-block animate-[bounce_1s_ease-in-out_infinite] ml-1">✅</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
