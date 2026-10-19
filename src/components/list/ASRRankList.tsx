import React, { useContext } from "react";
import { Activity, Calendar } from "lucide-react";
import { motion } from "motion/react";
import {
  cn,
  isPlaceholderPlayer,
  cleanNumeric,
  getCombinedFlags,
  formatYYYYMMDD,
} from "../../lib/asr-utils";
import { parseSafeDate } from "../../lib/asr-data";
import { ThemeContext } from "../../theme-context";
import { ModalScrollContext } from "../common/ASRBaseModal";
import { ASRSectionHeading } from "../common/ASRSectionHeading";
import { ASRListItem } from "../ASRListItems";

import { ASRDataContext } from "../../types";

interface ASRRankListProps {
  title?: string;
  athletes: unknown[];
  valueLabel?: string;
  dataContext?: ASRDataContext;
  onPlayerClick?: (meta: Record<string, unknown>) => void;
  onEntityClick: (
    type: string,
    data: Record<string, unknown> | string | { name?: string; pKey?: string },
  ) => void;
  limit?: number | null;
  className?: string;
  hideSubtitle?: boolean;
  showDateSubtitle?: boolean;
  entityType?: "player" | "setter" | "challenge" | "team" | "region";
  padTo?: number;
  isCompact?: boolean;
  scrollElementRef?: React.RefObject<HTMLElement | null>;
}

export const ASRRankList = ({
  title,
  athletes,
  valueLabel = "PTS",
  dataContext = {},
  onPlayerClick,
  onEntityClick,
  limit = 0,
  className,
  hideSubtitle,
  showDateSubtitle,
  entityType,
  padTo = 0,
  isCompact = true,
  scrollElementRef,
}: ASRRankListProps) => {
  const theme = useContext(ThemeContext);
  const modalScrollRef = useContext(ModalScrollContext);
  const { atMet = {}, cMet = {} } = dataContext;

  const { finalAthletes, listRenderKey } = React.useMemo(() => {
    const displayAthletes = [...athletes];
    if (padTo > 0 && displayAthletes.length < padTo) {
      const padCount = padTo - displayAthletes.length;
      for (let i = 0; i < padCount; i++) {
        displayAthletes.push({
          pKey: "UNCLAIMED RANK",
          isUnclaimed: true,
        } as unknown);
      }
    }

    const _finalAthletes = limit
      ? displayAthletes.slice(0, limit)
      : displayAthletes;

    let _listRenderKey = "empty";
    if (displayAthletes && displayAthletes.length > 0) {
      const firstItem = displayAthletes[0] as
        Record<string, unknown> | unknown[];
      const topKey = Array.isArray(firstItem)
        ? firstItem[0]
        : (firstItem as Record<string, unknown>).pKey ||
          (firstItem as Record<string, unknown>).label ||
          "unknown";
      _listRenderKey = `${topKey}`;
    }

    return { finalAthletes: _finalAthletes, listRenderKey: _listRenderKey };
  }, [athletes, limit, padTo]);

  const [visibleCount, setVisibleCount] = React.useState(20);
  const loaderRef = React.useRef<HTMLDivElement>(null);
  const isBusyRef = React.useRef(false);

  React.useEffect(() => {
    setVisibleCount(20);
    isBusyRef.current = false;
  }, [finalAthletes]);

  const loadMore = React.useCallback(() => {
    if (isBusyRef.current) return;
    setVisibleCount((prev) => {
      if (prev >= finalAthletes.length) return prev;
      isBusyRef.current = true;
      requestAnimationFrame(() => {
        setTimeout(() => {
          isBusyRef.current = false;
        }, 50);
      });
      return Math.min(prev + 20, finalAthletes.length);
    });
  }, [finalAthletes.length]);

  React.useEffect(() => {
    if (visibleCount >= finalAthletes.length) return;

    // Dynamically resolve the scroll container from refs or DOM hierarchy
    const getScrollContainer = (): HTMLElement | Window => {
      if (scrollElementRef?.current) return scrollElementRef.current;
      if (modalScrollRef?.current) return modalScrollRef.current;
      let el: HTMLElement | null = loaderRef.current;
      while (
        el &&
        el.parentElement &&
        el !== document.body &&
        el !== document.documentElement
      ) {
        el = el.parentElement;
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if (
          overflowY === "auto" ||
          overflowY === "scroll" ||
          overflowY === "overlay"
        ) {
          return el;
        }
      }
      return window;
    };

    const container = getScrollContainer();
    const isElement = container instanceof HTMLElement;

    const checkVisibility = () => {
      if (!loaderRef.current || isBusyRef.current) return;
      const loaderRect = loaderRef.current.getBoundingClientRect();

      const isNear = isElement
        ? (() => {
            const containerRect = (container as HTMLElement).getBoundingClientRect();
            return (
              loaderRect.top <= containerRect.bottom + 350 &&
              loaderRect.bottom >= containerRect.top - 100
            );
          })()
        : loaderRect.top <= window.innerHeight + 350 &&
          loaderRect.bottom >= -100;

      if (isNear) {
        loadMore();
      }
    };

    // 1. Setup IntersectionObserver
    let observer: IntersectionObserver | null = null;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            loadMore();
          }
        },
        {
          root: isElement ? (container as HTMLElement) : null,
          rootMargin: "350px 0px 350px 0px",
          threshold: 0,
        },
      );
      if (loaderRef.current) {
        observer.observe(loaderRef.current);
      }
    } catch {
      // Fallback to scroll/timer if IntersectionObserver fails
    }

    // 2. Setup scroll & touch event listeners for immediate responsiveness during rapid scrolling
    let rafId: number | null = null;
    const onScrollOrTouch = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        checkVisibility();
      });
    };

    container.addEventListener("scroll", onScrollOrTouch, { passive: true });
    if (isElement) {
      window.addEventListener("scroll", onScrollOrTouch, { passive: true });
    }
    window.addEventListener("resize", onScrollOrTouch, { passive: true });
    container.addEventListener("touchmove", onScrollOrTouch, { passive: true });
    container.addEventListener("touchend", onScrollOrTouch, { passive: true });

    // 3. Initial check right after mount / visibleCount increment
    checkVisibility();

    // 4. Stalled-recovery interval: guarantees that even if inertia flicking coalesced events,
    // visible records are never stuck for more than 400ms
    const recoveryInterval = setInterval(() => {
      checkVisibility();
    }, 400);

    return () => {
      if (observer) observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearInterval(recoveryInterval);
      container.removeEventListener("scroll", onScrollOrTouch);
      if (isElement) {
        window.removeEventListener("scroll", onScrollOrTouch);
      }
      window.removeEventListener("resize", onScrollOrTouch);
      container.removeEventListener("touchmove", onScrollOrTouch);
      container.removeEventListener("touchend", onScrollOrTouch);
    };
  }, [
    finalAthletes.length,
    visibleCount,
    loadMore,
    modalScrollRef,
    scrollElementRef,
  ]);

  return (
    <div className={cn("space-y-6 text-left overflow-visible", className)}>
      {title && (
        <ASRSectionHeading title={title} theme={theme as "dark" | "light"} />
      )}
      <motion.div
        key={listRenderKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 overflow-visible"
      >
        {finalAthletes && finalAthletes.length > 0 ? (
          <div className="flex flex-col">
            {finalAthletes.slice(0, visibleCount).map((item, i) => {
              const isArray = Array.isArray(item);
              const pKey = isArray
                ? item[0]
                : item.pKey || item.label || item.id || "";
              const points = isArray ? undefined : (item.pts ?? item.points);
              const time = isArray
                ? item[1]
                : (item.time ?? item.value ?? item.num);
              const explicitVideoUrl = isArray ? item[2] : item.videoUrl;

              const meta =
                atMet[pKey] ||
                cMet[String(pKey).toUpperCase()] ||
                (isArray ? { name: pKey } : item);
              if (
                isPlaceholderPlayer(meta.name) &&
                pKey !== "UNCLAIMED RANK" &&
                !(item as any).isInterim
              )
                return null;

              const stats = [];
              const isUnclaimedItem = item.isUnclaimed;

              if (isUnclaimedItem) {
                stats.push({ value: "---", label: "PTS" });
              } else if (
                !isArray &&
                points !== undefined &&
                time !== undefined
              ) {
                stats.push({
                  value: Math.round(cleanNumeric(points) || 0).toLocaleString(),
                  label: "PTS",
                });
              } else {
                const value = isArray
                  ? item[1]
                  : (item.pts ??
                    item.points ??
                    item.value ??
                    item.impact ??
                    item.sends ??
                    item.num);
                const isWholeNumber = [
                  "IMPACT",
                  "SETS",
                  "RANK",
                  "SENDS",
                  "PTS",
                  "POINTS",
                ].includes(String(valueLabel || "").toUpperCase());
                stats.push({
                  value:
                    typeof value === "number"
                      ? isWholeNumber
                        ? Math.round(value).toLocaleString()
                        : value.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                      : value || "--",
                  label: valueLabel,
                });
              }

              const skillMeta =
                cMet[String(pKey).toUpperCase()] || item.rawSkill || {};

              const titleStr = isUnclaimedItem
                ? "--"
                : (item as any).isInterim
                  ? "INTERIM TOP TIME"
                  : String(
                      isArray
                        ? meta.name || pKey
                        : item.label ||
                            item.name ||
                            meta.name ||
                            pKey ||
                            "UNKNOWN",
                    ).toUpperCase();

              return (
                <div
                  key={`${pKey}-${i}`}
                  data-index={i}
                  className={
                    (item as any).isInterim
                      ? "opacity-60 grayscale pointer-events-none"
                      : ""
                  }
                >
                  <div className="pb-3">
                    <ASRListItem
                      variant="card"
                      isCompact={isCompact}
                      rank={
                        isArray
                          ? i + 1
                          : item.rank ||
                            item.currentRank ||
                            (isUnclaimedItem ? i + 1 : "UR")
                      }
                      title={titleStr}
                      isUnclaimed={isUnclaimedItem || (item as any).isInterim}
                      shouldFade={isUnclaimedItem || item.shouldFade}
                      subtitle={
                        isUnclaimedItem ? (
                          "--"
                        ) : hideSubtitle ? null : showDateSubtitle ? (
                          (item as any).date ? (
                            <span className="flex items-center gap-1">
                              <Calendar size={10} className="opacity-70" />{" "}
                              {formatYYYYMMDD(parseSafeDate((item as any).date) || new Date((item as any).date))}
                            </span>
                          ) : null
                        ) : (
                          (() => {
                            const locText = isArray
                              ? meta.location || meta.countryName || null
                              : (item as any).city ||
                                (item as any).location ||
                                meta.location ||
                                meta.city;
                            if (!locText || locText === "UNKNOWN") return null;
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEntityClick("region", {
                                    name: String(locText),
                                  });
                                }}
                                className="hover:underline active:opacity-50 transition-all text-left truncate"
                              >
                                {locText}
                              </button>
                            );
                          })()
                        )
                      }
                      flag={getCombinedFlags(item, meta)}
                      stats={stats}
                      videoUrl={
                        explicitVideoUrl || item.videoUrl || item.demoVideo
                      }
                      mapUrl={
                        item.mapUrl ||
                        item.coordinates ||
                        meta.coordinates ||
                        meta.mapUrl ||
                        skillMeta.coordinates ||
                        skillMeta.mapUrl
                      }
                      onClick={() => {
                        if (entityType) onEntityClick(entityType, meta);
                        else if (!isArray && item.label)
                          onEntityClick("challenge", { name: item.label });
                        else if (
                          !isArray &&
                          item.name &&
                          valueLabel === "IMPACT"
                        )
                          onEntityClick("challenge", { name: item.name });
                        else if (onPlayerClick) onPlayerClick(meta);
                        else onEntityClick("player", meta);
                      }}
                      showVideoIcon={true}
                    />
                  </div>
                </div>
              );
            })}
            {visibleCount < finalAthletes.length && (
              <div
                ref={loaderRef}
                onClick={loadMore}
                className="h-20 w-full flex flex-col items-center justify-center cursor-pointer select-none py-4 group active:scale-95 transition-transform"
                role="button"
                tabIndex={0}
                aria-label="Load more records"
                title="Tap to load more records"
              >
                <div className="w-8 h-8 rounded-full border-2 border-zinc-600/30 border-t-zinc-400 dark:border-zinc-700/40 dark:border-t-zinc-200 animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "p-8 sm:p-12 w-full max-w-sm mx-auto mt-4 rounded-[2rem] border border-dashed flex flex-col items-center justify-center text-center gap-4 transition-colors",
              "theme-panel",
            )}
          >
            <div
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center mb-1",
                "bg-black/5 dark:bg-white/5",
              )}
            >
              <Activity size={24} className={"theme-text-faint"} />
            </div>
            <h2
              className={cn(
                "text-sm sm:text-base font-black uppercase tracking-widest",
                "theme-text-base",
              )}
            >
              NO ENTRIES FOUND
            </h2>
          </div>
        )}
      </motion.div>
    </div>
  );
};
