/* eslint-disable @typescript-eslint/no-explicit-any */
 
import React, { useMemo, startTransition, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { ASRDataTable } from "../ASRComponents";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { ASRBottomSheet } from "../common/ASRBottomSheet";
import { SkillData } from "../../types";
import { useDataStore } from "../../store/useDataStore";
import { useAppNavigation, useSkillList, useURLState } from "../../hooks/useDerivedData";
import { useDebounce } from "../../hooks/useDataHooks";
import { useAppStore } from "../../store/useAppStore";
import {
  cn,
  SKILL_RATING_TIERS,
  SkillRatingTierId,
  getSkillRating,
  getSkillTierConfig,
  parseRatingRangesList,
  toggleRatingTierParam,
  parseSearchQueryWithRating,
  createSlug,
} from "../../lib/asr-utils";
import { normalizeForSearch } from "../../lib/utils";
import { ChevronLeft, ChevronRight, X, Compass, Navigation } from "lucide-react";
import { ASRSearchInput } from "../common/ASRSearchInput";

const ASRMap = React.lazy(() => import("../ASRMap").then((m) => ({ default: m.ASRMap })));

type MapSortMode = "sends_desc" | "sends_asc" | "easiest" | "hardest" | "nearest";

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const computeDistanceKm = (a: [number, number], b: [number, number]): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

export const MapSkillsView = React.memo(({ theme }: { theme: "light" | "dark" }) => {
  const isLoading = useDataStore(s => s.isLoading);
  const { navigateToEntity } = useAppNavigation();
  const { isAllTimeContext, eventType } = useURLState();
  const skillList = useSkillList();
  const isMobile = useIsMobileViewport();

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const searchKey = `q_SKILLS`;
  const search = searchParams.get("q") || searchParams.get(searchKey) || "";
  const ratingParam = searchParams.get("rating") || "all";
  const rawSort = searchParams.get("sort");

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const listRefDesktop = useRef<any>(null);
  const listRefMobile = useRef<any>(null);
  const scrollContainerRefDesktop = React.useRef<HTMLDivElement>(null);
  const scrollContainerRefMobile = React.useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [visibleBounds, setVisibleBounds] = React.useState<MapBounds | null>(null);
  const [snap, setSnap] = React.useState<number>(0.2);
  const containerRef = useRef<HTMLDivElement>(null);
  const setActiveSkillId = useAppStore(s => s.setActiveSkillId);
  const userLocation = useAppStore(s => s.userLocation);
  const skillSortMode = useAppStore(s => s.skillSortMode);
  const setSkillSortMode = useAppStore(s => s.setSkillSortMode);

  const sortMode: MapSortMode =
    (rawSort === "nearest" || (!rawSort && skillSortMode === "nearest")) && userLocation
      ? "nearest"
      : rawSort === "easiest" ||
        rawSort === "hardest" ||
        rawSort === "sends_asc" ||
        rawSort === "sends_desc"
        ? rawSort
        : "sends_desc";

  const prevSkillSortModeRef = useRef(skillSortMode);
  React.useEffect(() => {
    if (skillSortMode !== prevSkillSortModeRef.current) {
      prevSkillSortModeRef.current = skillSortMode;
      if (skillSortMode === "nearest" && rawSort !== "nearest") {
        startTransition(() => {
          setSearchParams(prev => {
            prev.set("sort", "nearest");
            return prev;
          }, { replace: true, state: location.state });
        });
      } else if (skillSortMode === "runs" && rawSort === "nearest") {
        startTransition(() => {
          setSearchParams(prev => {
            prev.delete("sort");
            return prev;
          }, { replace: true, state: location.state });
        });
      }
    }
  }, [skillSortMode, rawSort, setSearchParams, location.state]);

  const handleBoundsChange = React.useCallback((next: MapBounds) => {
    setVisibleBounds(prev => {
      if (
        prev &&
        Math.abs(prev.north - next.north) < 1e-6 &&
        Math.abs(prev.south - next.south) < 1e-6 &&
        Math.abs(prev.east - next.east) < 1e-6 &&
        Math.abs(prev.west - next.west) < 1e-6
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const validSkillList = useMemo(
    () => (skillList ? skillList.filter((c: any) => c && !c.isDivider) : []),
    [skillList]
  );

  const skillsWithDistance = useMemo(() => {
    if (!userLocation) return validSkillList;
    return validSkillList.map((item: any) => {
      if (item?.isDivider || !item?.parsedCoords) return item;
      const distKm = computeDistanceKm(userLocation, item.parsedCoords);
      return {
        ...item,
        distanceKm: distKm,
        subtitle: `${distKm.toFixed(2)} KM AWAY`,
      };
    });
  }, [validSkillList, userLocation]);

  const runKey = isAllTimeContext ? "totalAllTimeRuns" : (eventType === "2026" ? "season26Runs" : eventType === "open" ? "openRuns" : "totalAllTimeRuns");

  const setSearch = (val: string) => {
    startTransition(() => {
      setSearchParams(prev => {
        if (val) {
          prev.set(searchKey, val);
          prev.delete("q");
        } else {
          prev.delete(searchKey);
          prev.delete("q");
        }
        return prev;
      }, { replace: true, state: location.state });
    });
  };

  const setRatingFilter = React.useCallback((clickedTier: SkillRatingTierId) => {
    startTransition(() => {
      setSearchParams(prev => {
        const current = prev.get("rating") || "all";
        const nextVal = toggleRatingTierParam(current, clickedTier);
        if (nextVal === "all") {
          prev.delete("rating");
        } else {
          prev.set("rating", nextVal);
        }
        return prev;
      }, { replace: true, state: location.state });
    });
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSnap(prevSnap => (prevSnap < 0.5 ? 0.5 : prevSnap));
    }
  }, [setSearchParams, location.state]);

  const setSortMode = React.useCallback((nextSort: MapSortMode) => {
    if (nextSort === "nearest") {
      setSkillSortMode("nearest");
    } else {
      setSkillSortMode("runs");
    }
    startTransition(() => {
      setSearchParams(prev => {
        if (nextSort === "sends_desc") {
          prev.delete("sort");
        } else {
          prev.set("sort", nextSort);
        }
        return prev;
      }, { replace: true, state: location.state });
    });
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSnap(prevSnap => (prevSnap < 0.5 ? 0.5 : prevSnap));
    }
    if (scrollContainerRefDesktop.current) {
      scrollContainerRefDesktop.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (scrollContainerRefMobile.current) {
      scrollContainerRefMobile.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [setSearchParams, location.state, setSkillSortMode]);

  const handleLvlHeaderClick = React.useCallback(() => {
    // Cycle LVL sort: easiest (1 -> 100) <-> hardest (100 -> 1)
    setSortMode(sortMode === "easiest" ? "hardest" : "easiest");
  }, [sortMode, setSortMode]);

  const handleSendsHeaderClick = React.useCallback(() => {
    // Cycle SENDS sort: most sends (desc) <-> fewest sends (asc)
    setSortMode(sortMode === "sends_desc" ? "sends_asc" : "sends_desc");
  }, [sortMode, setSortMode]);

  const clearAllFilters = React.useCallback(() => {
    setActiveSkillId(null);
    startTransition(() => {
      setSearchParams(prev => {
        prev.delete(searchKey);
        prev.delete("q");
        prev.delete("rating");
        return prev;
      }, { replace: true, state: location.state });
    });
  }, [setActiveSkillId, setSearchParams, location.state, searchKey]);

  const columns = React.useMemo(() => {
    const isLvlSort = sortMode === "easiest" || sortMode === "hardest";
    const isSendsSort = sortMode === "sends_desc" || sortMode === "sends_asc";

    return [
      {
        label: (
          <span className="inline-flex items-center gap-0.5">
            <span>LVL</span>
            {isLvlSort && (
              <span className="text-[9px] leading-none">
                {sortMode === "easiest" ? "↑" : "↓"}
              </span>
            )}
          </span>
        ),
        key: "points",
        width: "w-12 sm:w-14",
        isActiveSort: isLvlSort,
        onHeaderClick: handleLvlHeaderClick,
        getValue: (c: SkillData) => {
          const rating = Math.round(getSkillRating(c));
          return rating <= 0 ? "--" : rating;
        },
        getValueClassName: (c: SkillData) => {
          const rating = Math.round(getSkillRating(c));
          if (rating <= 0) {
            return "opacity-30 !text-xs font-mono";
          }
          const tier = getSkillTierConfig(rating);
          return cn(
            "font-mono font-black !text-[14px] sm:!text-[15px] tabular-nums tracking-tight",
            theme === "dark" ? tier.textDarkCls : tier.textLightCls
          );
        },
      },
      {
        label: (
          <span className="inline-flex items-center gap-0.5">
            <span>SENDS</span>
            {isSendsSort && (
              <span className="text-[9px] leading-none">
                {sortMode === "sends_desc" ? "↓" : "↑"}
              </span>
            )}
          </span>
        ),
        key: runKey,
        width: "w-14 sm:w-16",
        isActiveSort: isSendsSort,
        onHeaderClick: handleSendsHeaderClick,
      },
    ];
  }, [runKey, theme, sortMode, handleLvlHeaderClick, handleSendsHeaderClick]);

  const refreshTrigger = useDataStore(s => s.refreshTrigger);
  const prevRefreshTrigger = useRef(refreshTrigger);

  React.useEffect(() => {
    if (refreshTrigger > prevRefreshTrigger.current) {
      prevRefreshTrigger.current = refreshTrigger;
      // Reset view to default when nav dock button is clicked while active
      setSkillSortMode("runs");
      startTransition(() => {
        setSearchParams(prev => {
          prev.delete(searchKey);
          prev.delete("q");
          prev.delete("rating");
          prev.delete("sort");
          return prev;
        }, { replace: true, state: location.state });
      });
      setActiveSkillId(null);
      setSnap(0.2);
      if (mapRef.current?.resetView) {
        mapRef.current.resetView();
      }
      if (scrollContainerRefDesktop.current) {
        scrollContainerRefDesktop.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (scrollContainerRefMobile.current) {
        scrollContainerRefMobile.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [refreshTrigger, setActiveSkillId, setSnap, setSearchParams, location.state, searchKey, setSkillSortMode]);

  const debouncedSearch = useDebounce(search, 300);

  // Parse power-syntax rating operators from search input (e.g. "<30", "10-40", ">75")
  const { textQuery, ratingRange: searchRatingRange } = useMemo(
    () => parseSearchQueryWithRating(String(debouncedSearch || "")),
    [debouncedSearch]
  );

  const urlRatingRanges = useMemo(
    () => parseRatingRangesList(ratingParam),
    [ratingParam]
  );

  const activeRatingRanges = useMemo(
    () => (searchRatingRange ? [searchRatingRange] : urlRatingRanges),
    [searchRatingRange, urlRatingRanges]
  );

  // Step 1: Filter by text query (name, city, state, country)
  const textFilteredData = useMemo(() => {
    const term = normalizeForSearch(textQuery);
    if (!term) return skillsWithDistance;
    const searchTerms = term.split(/[\s,]+/).filter(Boolean);
    return skillsWithDistance.filter((item: any) => {
      const key = item?.searchKey || "";
      return searchTerms.every((t: string) => key.includes(t));
    });
  }, [textQuery, skillsWithDistance]);

  // Helper to check if a challenge is inside current map viewport bounds
  const isWithinBounds = React.useCallback((item: any, bounds: any) => {
    if (!bounds) return true;
    if (!item?.parsedCoords) return true;
    const [lat, lng] = item.parsedCoords;
    const latOk = lat >= bounds.south && lat <= bounds.north;
    let lngOk: boolean;
    if (bounds.west <= bounds.east) {
      lngOk = lng >= bounds.west && lng <= bounds.east;
    } else {
      lngOk = lng >= bounds.west || lng <= bounds.east;
    }
    return latOk && lngOk;
  }, []);

  // Compute live viewport counts per tier so empty tiers automatically dim
  const viewportTierCounts = useMemo(() => {
    const counts: Record<SkillRatingTierId, number> = {
      "1-20": 0,
      "21-40": 0,
      "41-60": 0,
      "61-80": 0,
      "81-100": 0,
    };
    textFilteredData.forEach((item: any) => {
      if (!item || item.isDivider) return;
      if (!isWithinBounds(item, visibleBounds)) return;
      const r = Math.round(getSkillRating(item));
      if (r >= 1 && r <= 20) counts["1-20"]++;
      else if (r >= 21 && r <= 40) counts["21-40"]++;
      else if (r >= 41 && r <= 60) counts["41-60"]++;
      else if (r >= 61 && r <= 80) counts["61-80"]++;
      else if (r >= 81) counts["81-100"]++;
    });
    return counts;
  }, [textFilteredData, visibleBounds, isWithinBounds]);

  // Step 2: Filter by active rating range(s) (used for map pins & list)
  const searchedData = useMemo(() => {
    if (activeRatingRanges.length === 0) return textFilteredData;
    return textFilteredData.filter((item: any) => {
      if (!item || item.isDivider) return false;
      const r = Math.round(getSkillRating(item));
      if (r <= 0) return false;
      return activeRatingRanges.some(range => r >= range.min && r <= range.max);
    });
  }, [textFilteredData, activeRatingRanges]);

  const nearestOverallSkill = useMemo(() => {
    if (!userLocation) return null;
    const source = searchedData.filter((c: any) => c && !c.isDivider && c.parsedCoords && typeof c.distanceKm === "number");
    const pool = source.length > 0
      ? source
      : skillsWithDistance.filter((c: any) => c && !c.isDivider && c.parsedCoords && typeof c.distanceKm === "number");
    if (pool.length === 0) return null;
    let best = pool[0];
    for (let i = 1; i < pool.length; i++) {
      if (pool[i].distanceKm < best.distanceKm) {
        best = pool[i];
      }
    }
    return best;
  }, [userLocation, searchedData, skillsWithDistance]);

  const lastAutoOpenedQueryRef = useRef("");

  React.useEffect(() => {
    if (textQuery && textQuery !== lastAutoOpenedQueryRef.current) {
      const activeSkills = searchedData.filter((c: any) => c && !c.isDivider);
      if (activeSkills.length === 1) {
        lastAutoOpenedQueryRef.current = textQuery;
        setSnap(0.5);
        setActiveSkillId(activeSkills[0].name || null);
      } else if (lastAutoOpenedQueryRef.current) {
        lastAutoOpenedQueryRef.current = "";
        setActiveSkillId(null);
      }
    } else if (!textQuery && lastAutoOpenedQueryRef.current) {
      lastAutoOpenedQueryRef.current = "";
      setActiveSkillId(null);
    }
  }, [textQuery, searchedData, setActiveSkillId, setSnap]);

  React.useEffect(() => {
    return () => {
      setActiveSkillId(null);
    };
  }, [setActiveSkillId]);

  // Step 3: Filter to visible map bounds, apply active sort mode, and re-index currentRank (1, 2, 3...)
  const visibleData = useMemo(() => {
    const inBounds = !visibleBounds
      ? searchedData
      : searchedData.filter((item: any) => {
          if (!item || item.isDivider) return false;
          return isWithinBounds(item, visibleBounds);
        });

    const sorted = [...inBounds];
    if (userLocation && sortMode === "nearest") {
      sorted.sort((a: any, b: any) => {
        const da = typeof a.distanceKm === "number" ? a.distanceKm : Infinity;
        const db = typeof b.distanceKm === "number" ? b.distanceKm : Infinity;
        return da - db;
      });
    } else if (sortMode === "sends_asc") {
      sorted.sort((a: any, b: any) => {
        const sendsA = Number(a[runKey] || 0);
        const sendsB = Number(b[runKey] || 0);
        if (sendsA !== sendsB) return sendsA - sendsB;
        const rA = Math.round(getSkillRating(a));
        const rB = Math.round(getSkillRating(b));
        return rA - rB;
      });
    } else if (sortMode === "easiest" || sortMode === "hardest") {
      sorted.sort((a: any, b: any) => {
        const rA = Math.round(getSkillRating(a));
        const rB = Math.round(getSkillRating(b));
        // Keep unrated (0) challenges at the bottom when sorting by easiest or hardest
        if (rA <= 0 && rB > 0) return 1;
        if (rB <= 0 && rA > 0) return -1;
        if (rA !== rB) {
          return sortMode === "easiest" ? rA - rB : rB - rA;
        }
        // Tiebreaker: most sends first
        const sendsA = Number(a[runKey] || 0);
        const sendsB = Number(b[runKey] || 0);
        return sendsB - sendsA;
      });
    }

    return sorted.map((item: any, idx: number) => {
      const nextRank = idx + 1;
      return item.currentRank === nextRank ? item : { ...item, currentRank: nextRank };
    });
  }, [searchedData, visibleBounds, isWithinBounds, sortMode, runKey, userLocation]);

  const handleJumpToNearest = React.useCallback(() => {
    if (!nearestOverallSkill) return;
    if (debouncedSearch || activeRatingRanges.length > 0) {
      clearAllFilters();
    }
    setActiveSkillId(nearestOverallSkill.name || null);
    setSnap(0.5);
    if (nearestOverallSkill.parsedCoords && mapRef.current?.frameSkillAndUser) {
      mapRef.current.frameSkillAndUser(nearestOverallSkill.parsedCoords);
    }
  }, [nearestOverallSkill, debouncedSearch, activeRatingRanges.length, clearAllFilters, setActiveSkillId]);

  const hasVideosInView = useMemo(
    () => visibleData.some((c: any) => !!(c?.videoUrl || c?.demoVideo)),
    [visibleData]
  );

  const handleItemClick = React.useCallback((c: SkillData) => {
    navigateToEntity("challenge", c);
  }, [navigateToEntity]);

  const handlePinClick = React.useCallback((c: SkillData) => {
     if (c.name && createSlug(c.name)) {
       setActiveSkillId(c.name);
     }
     navigateToEntity("challenge", c);
  }, [navigateToEntity, setActiveSkillId]);

  const handleMapBackgroundClick = React.useCallback(() => {
     setSnap(0.2);
     setActiveSkillId(null);
  }, [setActiveSkillId]);

  const renderListContent = (currentSnap: number, scrollRef: React.RefObject<HTMLDivElement>, dRef: React.RefObject<any>) => {
    const skillCount = validSkillList.length;
    const visibleRealSkillsCount = visibleData.length;
    const isDark = theme === "dark";
    const hasActiveFilter = activeRatingRanges.length > 0 || !!debouncedSearch;

    const headerMiddleLabel = (
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate">
          {userLocation && sortMode === "nearest" ? "CHALLENGE • DISTANCE" : "CHALLENGE"}
        </span>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearAllFilters}
            className={cn(
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border transition-all active:scale-95 shrink-0",
              isDark
                ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                : "bg-black/10 border-black/20 text-zinc-950 hover:bg-black/20"
            )}
          >
            <X size={9} strokeWidth={3} />
            <span>RESET</span>
          </button>
        )}
      </div>
    );

    return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-4 pb-1 pt-2 shrink-0 pointer-events-auto flex flex-col gap-2">
        <ASRSearchInput
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          theme={theme}
          placeholder={`search ${skillCount} challenges...`}
          enableFocusShortcut="slash"
        />

        {/* Slim Single-Line Difficulty Tier Pills (Multi-Select Capable) */}
        <div className="grid grid-cols-5 gap-1.5 w-full">
          {SKILL_RATING_TIERS.map((tier) => {
            const isActive = activeRatingRanges.some(
              r => r.min <= tier.min && r.max >= tier.max
            );
            const count = viewportTierCounts[tier.id];

            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setRatingFilter(tier.id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-full border transition-all active:scale-95 outline-none select-none",
                  isActive
                    ? isDark
                      ? tier.activePillDarkCls
                      : tier.activePillLightCls
                    : isDark
                      ? "bg-zinc-900/60 border-white/10 text-zinc-300 hover:bg-white/10 hover:border-white/20"
                      : "bg-zinc-100/80 border-black/10 text-zinc-700 hover:bg-black/5 hover:border-black/20",
                  count === 0 && !isActive && "opacity-30"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    isActive && !isDark ? "bg-white" : tier.dotCls
                  )}
                />
                <span className="text-[10px] sm:text-[11px] font-mono font-black tracking-tighter uppercase leading-none">
                  {tier.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Viewport Count & Proximity Sort Controls */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-50 tabular-nums">
            {visibleRealSkillsCount} IN VIEW
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (!userLocation) {
                  mapRef.current?.locateUser?.();
                } else {
                  setSortMode(sortMode === "nearest" ? "sends_desc" : "nearest");
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 outline-none",
                userLocation && sortMode === "nearest"
                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                  : isDark
                    ? "bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white"
                    : "bg-white/90 border-black/10 text-zinc-600 hover:text-black"
              )}
            >
              <Navigation size={10} strokeWidth={2.5} className={cn(userLocation && sortMode === "nearest" ? "fill-current" : "")} />
              <span>{userLocation && sortMode === "nearest" ? "SORT: NEAREST" : "NEAREST"}</span>
            </button>
            {userLocation && sortMode === "nearest" && (
              <button
                type="button"
                onClick={() => setSortMode("sends_desc")}
                className={cn(
                  "px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 outline-none",
                  isDark
                    ? "bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white"
                    : "bg-white/90 border-black/10 text-zinc-600 hover:text-black"
                )}
              >
                SENDS
              </button>
            )}
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onPointerDown={(e) => {
          if (currentSnap >= 0.5) {
            e.stopPropagation();
          }
        }}
        onScroll={(e) => {
          if (window.innerWidth < 768) {
            const target = e.target as HTMLDivElement;
            window.dispatchEvent(new CustomEvent("asr-scroll", { detail: { scrollTop: target.scrollTop } }));
          }
        }}
        className="flex-1 px-0 pb-4 pt-0 overflow-y-auto overscroll-none"
        style={{ touchAction: currentSnap >= 0.5 ? 'pan-y' : 'none' }}
      >
        {!isLoading && visibleRealSkillsCount === 0 && nearestOverallSkill ? (
          <div className="px-4">
            <div
              className={cn(
                "flex flex-col items-center justify-center p-6 mt-2 text-center rounded-[2rem] border animate-in fade-in duration-300",
                isDark
                  ? "bg-zinc-900/50 border-zinc-800"
                  : "bg-white/80 border-slate-200 shadow-sm"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                  isDark
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                    : "bg-blue-50 text-blue-600 border border-blue-200"
                )}
              >
                <Compass size={22} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">
                NO CHALLENGES IN IMMEDIATE VIEWPORT
              </span>
              <h4
                className={cn(
                  "text-sm sm:text-base font-black uppercase tracking-tight mb-1",
                  isDark ? "text-white" : "text-zinc-900"
                )}
              >
                {nearestOverallSkill.flag ? `${nearestOverallSkill.flag} ` : ""}
                {nearestOverallSkill.name}
              </h4>
              <p
                className={cn(
                  "text-xs font-mono font-bold uppercase tracking-widest tabular-nums mb-4",
                  isDark ? "text-zinc-400" : "text-zinc-500"
                )}
              >
                {nearestOverallSkill.distanceKm.toFixed(2)} KM FROM YOUR LOCATION
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={handleJumpToNearest}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_4px_14px_rgba(37,99,235,0.4)] cursor-pointer"
                >
                  FRAME NEAREST CHALLENGE
                </button>
                <button
                  type="button"
                  onClick={() => handleItemClick(nearestOverallSkill)}
                  className={cn(
                    "w-full sm:w-auto py-2.5 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer shrink-0",
                    isDark
                      ? "bg-zinc-900 border-white/10 text-zinc-200 hover:bg-zinc-800"
                      : "bg-white border-black/10 text-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  INSPECT
                </button>
              </div>
            </div>
          </div>
        ) : visibleData.length === 0 && searchedData.length > 0 && !isLoading ? (
          <div className="px-4">
            <div
              className={cn(
                "flex flex-col items-center justify-center text-center p-6 mt-4 rounded-2xl border gap-3",
                isDark ? "bg-zinc-900/40 border-white/10" : "bg-white/60 border-black/10"
              )}
            >
              <Compass className={cn("w-7 h-7 opacity-50", isDark ? "text-white" : "text-zinc-900")} />
              <div className="flex flex-col gap-1">
                <span className={cn("text-xs font-black uppercase tracking-widest", isDark ? "text-white" : "text-zinc-900")}>
                  NO MATCHING CHALLENGES IN THIS MAP AREA
                </span>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  {searchedData.length} MATCHING CHALLENGES EXIST GLOBALLY
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => mapRef.current?.fitToChallenges?.()}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                    isDark ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-900 text-white hover:bg-zinc-800"
                  )}
                >
                  ZOOM TO {searchedData.length} MATCHES
                </button>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95",
                      isDark ? "border-white/20 text-white hover:bg-white/10" : "border-black/20 text-zinc-900 hover:bg-black/5"
                    )}
                  >
                    SHOW ALL TIERS
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <ErrorBoundary fallbackMessage="Failed to render the data list.">
            <ASRDataTable
              ref={dRef}
              scrollElementRef={scrollRef}
              data={visibleData}
              isLoading={isLoading}
              viewType="card"
              isCompact={true}
              onItemClick={handleItemClick}
              middleLabel={headerMiddleLabel}
              columns={columns}
              showVideoColumn={hasVideosInView}
              enableHoverSync={true}
            />
          </ErrorBoundary>
        )}
      </div>
    </div>
    );
  };

  return (
    <div ref={containerRef} className="relative flex-1 w-full overflow-hidden bg-slate-100 dark:bg-zinc-900">
      {/* Map Layer */}
      <div className="absolute inset-0 z-0">
        <React.Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center text-sm font-bold tracking-widest text-zinc-500 animate-pulse">
              LOADING ASR MAP...
            </div>
          }
        >
          <ASRMap
            ref={mapRef}
            challenges={searchedData}
            totalSkills={validSkillList.length}
            searchQuery={String(debouncedSearch || "").trim()}
            theme={theme}
            onSkillClick={handleItemClick}
            onPinClick={handlePinClick}
            onMapClick={handleMapBackgroundClick}
            onBoundsChange={handleBoundsChange}
            isSidebarOpen={isSidebarOpen}
            className="w-full h-full rounded-none border-none"
          />
        </React.Suspense>
      </div>

      {!isMobile ? (
        <>
          {/* Desktop Panel (Collapsible Glass Sidebar) */}
          <div
            className={cn(
              "hidden md:flex flex-col absolute top-4 bottom-4 left-4 z-10 shadow-2xl rounded-3xl overflow-hidden border transition-all duration-500 ease-in-out",
              isSidebarOpen ? "w-[400px] lg:w-[450px]" : "w-[0px] opacity-0 -translate-x-full pointer-events-none",
              theme === "dark"
                ? "bg-zinc-950/70 border-white/10 backdrop-blur-xl"
                : "bg-white/70 border-black/10 backdrop-blur-xl"
            )}
          >
            <div className="flex-1 overflow-hidden h-full rounded-3xl">
              {renderListContent(1, scrollContainerRefDesktop, listRefDesktop)}
            </div>
          </div>

          {/* Desktop Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "hidden md:flex absolute top-6 z-20 items-center justify-center w-8 h-12 rounded-r-xl border border-l-0 shadow-lg transition-all duration-500 ease-in-out backdrop-blur-xl hover:bg-opacity-100",
              isSidebarOpen ? "left-[416px] lg:left-[466px]" : "left-0",
              theme === "dark"
                ? "bg-zinc-900/80 border-white/10 text-white hover:bg-zinc-800"
                : "bg-white/80 border-black/10 text-zinc-900 hover:bg-zinc-100"
            )}
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </>
      ) : (
        /* Mobile Bottom Sheet */
        <div className="md:hidden pointer-events-none absolute inset-0 z-50">
          <ASRBottomSheet
            snapPoints={[0.2, 0.5, 0.85]}
            activeSnap={snap as number}
            onSnapChange={setSnap}
          >
            <div className="flex-1 overflow-hidden h-full pt-2">
              {renderListContent(snap as number, scrollContainerRefMobile, listRefMobile)}
            </div>
          </ASRBottomSheet>
        </div>
      )}
    </div>
  );
});
