import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ASRNeonToggle } from "../common/ASRNeonToggle";
import { AnimatedListView } from "../common/AnimatedListView";
import { PlayerProfile, TeamProfile } from "../../types";
import { useDataStore } from "../../store/useDataStore";
import { useAppStore } from "../../store/useAppStore";
import { useAppNavigation, usePlayerList, useTeamList, useURLState } from "../../hooks/useDerivedData";

export const RankingsView = React.memo(({ theme }: { theme: "light" | "dark" }) => {
  const isLoading = useDataStore(s => s.isLoading);
  const gen = useAppStore(s => s.gen);
  const setGen = useAppStore(s => s.setGen);
  const setTeamCategory = useAppStore(s => s.setTeamCategory);
  const { navigateToEntity } = useAppNavigation();
  const { eventType, searchParams, setSearchParams } = useURLState();
  const location = useLocation();

  const queryMode = searchParams.get("mode");
  const pathMode = location.pathname.includes("/teams") ? "teams" : (location.pathname.includes("/gyms") ? "gyms" : (location.pathname.includes("/players") ? "players" : null));
  const initialMode: "players" | "gyms" | "teams" =
    pathMode || (queryMode === "teams" ? "teams" : queryMode === "gyms" ? "gyms" : "players");

  const [uiMode, setUiMode] = useState<"players" | "gyms" | "teams">(initialMode);
  const [contentMode, setContentMode] = useState<"players" | "gyms" | "teams">(initialMode);
  const [uiGen, setUiGen] = useState<"M" | "F">(gen);

  useEffect(() => {
    setUiGen(gen);
  }, [gen]);

  useEffect(() => {
    if (queryMode === "teams" || queryMode === "gyms" || queryMode === "players") {
      setUiMode(queryMode);
      setContentMode(queryMode);
    } else if (pathMode) {
      setUiMode(pathMode);
      setContentMode(pathMode);
    }
  }, [queryMode, pathMode]);

  useEffect(() => {
    if (contentMode === "gyms") setTeamCategory("gyms");
    if (contentMode === "teams") setTeamCategory("teams");
  }, [contentMode, setTeamCategory]);

  const playerList = usePlayerList();
  const teamList = useTeamList();

  const handlePlayerClick = React.useCallback((p: PlayerProfile) => {
    navigateToEntity("player", p);
  }, [navigateToEntity]);

  const handleTeamClick = React.useCallback((t: TeamProfile) => {
    const entityType = t.category === "gyms" || contentMode === "gyms" ? "gym" : "team";
    navigateToEntity(entityType, t);
  }, [navigateToEntity, contentMode]);

  const playerColumns = React.useMemo(() => [
    {
      label: "RATING",
      key: "rating",
      getValue: (p: PlayerProfile) => (p.rating || 0).toFixed(2),
      getSubValue: (p: PlayerProfile) => `${(p.pts || 0).toFixed(2)} PTS`,
    },
  ], []);

  const teamColumns = React.useMemo(() => [
    {
      label: "POINTS",
      key: "pts",
      getValue: (t: TeamProfile) => (t.pts || 0).toFixed(2),
    },
  ], []);

  const handleGenChange = React.useCallback((g: string) => {
    const nextGen = g as "M" | "F";
    setUiGen(nextGen);
    React.startTransition(() => {
      setGen(nextGen);
    });
    if (window.scrollY > 150) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [setGen]);

  const handleModeChange = React.useCallback((newMode: string) => {
    const nextMode = newMode as "players" | "gyms" | "teams";
    setUiMode(nextMode);
    React.startTransition(() => {
      setContentMode(nextMode);
      setSearchParams(
        (prev) => {
          prev.set("mode", nextMode);
          return prev;
        },
        { replace: true, preventScrollReset: true }
      );
    });
    if (window.scrollY > 150) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [setSearchParams]);

  const listData = React.useMemo(() => {
    if (contentMode === "teams" || contentMode === "gyms") return teamList;
    if (eventType === "open") {
      return playerList.map((p) => {
        // We know 'currentRank' might be typed slightly generically in PlayerProfile,
        // but it comes through via usePlayerList
        const rank = (p as any).currentRank;
        if (typeof rank === "number" && rank >= 1 && rank <= 6) {
          if (rank <= 3) {
            return { ...p, displayName: `${p.name} * *` };
          } else {
            return { ...p, displayName: `${p.name} *` };
          }
        }
        return p;
      });
    }
    return playerList;
  }, [contentMode, eventType, playerList, teamList]);

  const listColumns = contentMode === "players" ? playerColumns : teamColumns;
  const itemClick = contentMode === "players" ? handlePlayerClick : handleTeamClick;
  const searchPlaceholder = contentMode === "players" ? "search players..." : (contentMode === "gyms" ? "search gyms..." : "search teams...");
  const middleLabel = contentMode === "players" ? "PLAYER" : (contentMode === "gyms" ? "GYM" : "TEAM");

  const searchSubtext = (contentMode === "players") ? (
    <div className="flex flex-col gap-1 mt-2 mb-1 w-full">
      {eventType === "open" ? (
        <>
          <p className="text-[10px] sm:text-[11px] font-bold text-zinc-500/80 dark:text-zinc-500/80 tracking-widest uppercase">
            * * QUALIFIED FOR USPK NATIONALS & PKE WORLDS
          </p>
          <p className="text-[10px] sm:text-[11px] font-bold text-zinc-500/80 dark:text-zinc-500/80 tracking-widest uppercase">
            * QUALIFIED FOR PKE WORLDS
          </p>
        </>
      ) : (eventType === "2026" || eventType === "all-time") ? (
        <p className="text-[10px] sm:text-[11px] font-bold text-zinc-500/80 dark:text-zinc-500/80 tracking-widest uppercase">
          * SEND 3+ CHALLENGES TO GET RANKED
        </p>
      ) : null}
    </div>
  ) : undefined;

  return (
    <AnimatedListView
      title="RANKINGS"
      hideTitle={true}
      theme={theme}
      data={listData}
      searchPlaceholder={searchPlaceholder}
      searchSubtext={searchSubtext}
      isLoading={isLoading}
      onItemClick={itemClick}
      middleLabel={middleLabel}
      columns={listColumns}
      categoryName={contentMode === "players" ? "Players" : "Teams"}
      topControls={
        <ASRNeonToggle
          options={[
            { label: "PLAYERS", value: "players" },
            { label: "GYMS", value: "gyms" },
            { label: "TEAMS", value: "teams" },
          ]}
          activeOption={uiMode}
          onChange={handleModeChange}
          layoutId="primary-mode-pill"
          theme={theme}
          className="w-[280px] mb-3"
        />
      }
      headerControls={
        uiMode === "players" ? (
          <ASRNeonToggle
            options={[
              { label: "M", value: "M" },
              { label: "W", value: "F" },
            ]}
            activeOption={uiGen}
            onChange={handleGenChange}
            layoutId="gen-pill"
            theme={theme}
            className="w-[100px] shrink-0"
          />
        ) : undefined
      }
    />
  );
});
