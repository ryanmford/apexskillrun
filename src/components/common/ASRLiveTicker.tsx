/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useRef } from "react";
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

const MIN_LOOP_ITEMS = 20;
const SCROLL_SPEED_PX_PER_SEC = 60;

interface TickerEntry {
  key: string;
  item: any;
  timeString: string;
  athleteFlag: string;
  playerName: string;
  skillFlag: string;
  skillName: string;
}

export const ASRLiveTicker = React.memo(
  ({ onEntityClick, theme }: ASRLiveTickerProps) => {
    const rawFeed = useDataStore((s) => s.recentFeed);
    const viewportRef = useRef<HTMLDivElement>(null);
    const firstSetRef = useRef<HTMLDivElement>(null);
    const posRef = useRef(0);
    const lastIntScrollRef = useRef(-1);
    const loopWidthRef = useRef(0);
    const isHoveredRef = useRef(false);

    const entries = useMemo<TickerEntry[]>(() => {
      if (!rawFeed || rawFeed.length === 0) return [];

      // Extend feed to ensure it's wider than any screen for seamless looping
      let extendedFeed = [...rawFeed];
      while (extendedFeed.length > 0 && extendedFeed.length < MIN_LOOP_ITEMS) {
        extendedFeed = [...extendedFeed, ...rawFeed];
      }

      return extendedFeed.map((item: any, idx: number) => {
        const athleteFlag = getCombinedFlags(item.athlete).trim();
        const skillFlag = formatFlagsWithSpace(
          item.challenge?.flag || "",
        ).trim();
        const playerName = String(item.name || "")
          .trim()
          .toUpperCase();
        const skillName = String(
          item.skillName || item.challenge?.name || "UNKNOWN CHALLENGE",
        )
          .trim()
          .toUpperCase();

        return {
          key: `${item.id}-${idx}`,
          item,
          timeString: item.timeString || "00:00",
          athleteFlag,
          playerName,
          skillFlag,
          skillName,
        };
      });
    }, [rawFeed]);

    useEffect(() => {
      if (entries.length === 0) return;
      const viewport = viewportRef.current;
      const firstSet = firstSetRef.current;
      if (!viewport || !firstSet) return;

      const measureLoopWidth = () => {
        const width = firstSet.offsetWidth;
        if (width > 0) {
          loopWidthRef.current = width;
          if (posRef.current >= width) {
            posRef.current = posRef.current % width;
          }
        }
      };

      measureLoopWidth();

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(measureLoopWidth);
        resizeObserver.observe(firstSet);
      }

      let cancelled = false;
      if (typeof document !== "undefined" && document.fonts?.ready) {
        document.fonts.ready.then(() => {
          if (!cancelled) measureLoopWidth();
        });
      }

      const reducedMotionQuery =
        typeof window !== "undefined" && window.matchMedia
          ? window.matchMedia("(prefers-reduced-motion: reduce)")
          : null;
      let prefersReducedMotion = Boolean(reducedMotionQuery?.matches);
      const handleMotionChange = (e: MediaQueryListEvent) => {
        prefersReducedMotion = e.matches;
      };
      reducedMotionQuery?.addEventListener?.("change", handleMotionChange);

      let rafId = 0;
      let lastTimestamp = performance.now();

      const tick = (now: number) => {
        const dt = Math.min(Math.max((now - lastTimestamp) / 1000, 0), 0.05);
        lastTimestamp = now;

        const isVisible =
          typeof document === "undefined" ||
          document.visibilityState === "visible";

        if (
          isVisible &&
          !prefersReducedMotion &&
          !isHoveredRef.current &&
          loopWidthRef.current > 0
        ) {
          posRef.current += SCROLL_SPEED_PX_PER_SEC * dt;
          if (posRef.current >= loopWidthRef.current) {
            posRef.current -= loopWidthRef.current;
          }

          const nextScroll = Math.floor(posRef.current);
          if (nextScroll !== lastIntScrollRef.current) {
            lastIntScrollRef.current = nextScroll;
            viewport.scrollLeft = nextScroll;
          }
        }

        rafId = window.requestAnimationFrame(tick);
      };

      rafId = window.requestAnimationFrame(tick);

      return () => {
        cancelled = true;
        window.cancelAnimationFrame(rafId);
        resizeObserver?.disconnect();
        reducedMotionQuery?.removeEventListener?.("change", handleMotionChange);
      };
    }, [entries]);

    if (entries.length === 0) {
      return (
        <div
          className={cn(
            "relative z-[40] w-full h-[calc(2.5rem+var(--safe-top))] sm:h-[calc(3rem+var(--safe-top))] pt-[var(--safe-top)] flex items-center justify-center select-none transition-colors duration-500",
            theme === "dark" ? "text-zinc-100" : "text-slate-800",
          )}
        >
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-x-0 top-0 -bottom-px pointer-events-none backdrop-blur-md border-b transition-colors duration-500",
              theme === "dark"
                ? "bg-zinc-950/80 border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
                : "bg-white/90 border-zinc-200/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]",
            )}
          />
          <div className="relative z-10 opacity-30 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse ticker-edge-mask px-6">
            SCANNING LIVE STATS...
          </div>
        </div>
      );
    }

    const renderEntry = (
      entry: TickerEntry,
      copyPrefix: string,
      isDuplicate = false,
    ) => (
      <div
        key={`${copyPrefix}-${entry.key}`}
        className="flex items-center font-black tracking-[0.02em] text-[11px] sm:text-[12px] group transition-colors select-none italic"
      >
        <span
          className={cn(
            "shrink-0 tabular-nums transition-colors",
            theme === "dark" ? "text-white/40" : "text-zinc-400",
          )}
        >
          {entry.timeString}
        </span>
        <span className="whitespace-pre"> </span>

        <div className="flex items-center">
          <button
            type="button"
            tabIndex={isDuplicate ? -1 : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onEntityClick(
                "player",
                entry.item.athlete || { name: entry.item.name },
              );
            }}
            className={cn(
              "transition-all cursor-pointer flex items-center outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-[2px] active:scale-95",
              theme === "dark"
                ? "text-white hover:text-blue-500"
                : "text-zinc-900 hover:text-blue-500",
            )}
          >
            {entry.athleteFlag && (
              <span className="shrink-0 whitespace-pre">
                {entry.athleteFlag}{" "}
              </span>
            )}
            <span className="shrink-0 font-bold">{entry.playerName}</span>
          </button>
          <span className="whitespace-pre"> </span>
          <button
            type="button"
            tabIndex={isDuplicate ? -1 : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onEntityClick(
                "challenge",
                entry.item.challenge || { name: entry.item.skillName },
              );
            }}
            className={cn(
              "transition-all cursor-pointer flex items-center outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-[2px] active:scale-95",
              theme === "dark"
                ? "text-white hover:text-blue-500"
                : "text-zinc-900 hover:text-blue-500",
            )}
          >
            {entry.skillFlag && (
              <span className="shrink-0 whitespace-pre">
                {entry.skillFlag}{" "}
              </span>
            )}
            <span className="shrink-0 font-bold">{entry.skillName}</span>
          </button>
          <span className="shrink-0 inline-block animate-[bounce_1s_ease-in-out_infinite] ml-1">
            ✅
          </span>
        </div>
      </div>
    );

    return (
      <div
        className="relative z-[40] w-full h-[calc(2.5rem+var(--safe-top))] sm:h-[calc(3rem+var(--safe-top))] pt-[var(--safe-top)] flex items-center select-none transition-colors duration-500"
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") {
            isHoveredRef.current = true;
          }
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") {
            isHoveredRef.current = false;
          }
        }}
      >
        {/* Isolated frosted backdrop extending 1px below to seal any subpixel seam above ASRHeader */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 top-0 -bottom-px pointer-events-none backdrop-blur-md border-b transition-colors duration-500",
            theme === "dark"
              ? "bg-zinc-950/80 border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
              : "bg-white/90 border-zinc-200/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]",
          )}
        />
        {/* Viewport-sized edge fade mask (never applied to the wide scrolling track) */}
        <div className="relative z-10 w-full h-full overflow-hidden ticker-edge-mask flex items-center">
          <div
            ref={viewportRef}
            className="w-full overflow-x-hidden overflow-y-hidden no-scrollbar flex items-center touch-pan-y"
          >
            <div className="flex items-center w-max whitespace-nowrap">
              <div
                ref={firstSetRef}
                className="flex items-center shrink-0 gap-12 sm:gap-20 pr-12 sm:pr-20"
              >
                {entries.map((entry) => renderEntry(entry, "a", false))}
              </div>
              <div
                aria-hidden="true"
                className="flex items-center shrink-0 gap-12 sm:gap-20 pr-12 sm:pr-20"
              >
                {entries.map((entry) => renderEntry(entry, "b", true))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
