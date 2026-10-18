import React, { useMemo, useState } from "react";
import { cn, formatLocation, normalizeName, fixCountryEntity, getCombinedFlags } from "../../lib/asr-utils";
import { ASRStatCard } from "../common/ASRStatCard";
import { FallbackAvatar } from "../common/FallbackAvatar";
import { ProfileHeader, InspectorTabContainer } from "./InspectorComponents";
import { ASRRankList } from "../list/ASRRankList";

import { ASRNeonToggle } from "../common/ASRNeonToggle";
import { ModalScrollContext } from "../common/ASRBaseModal";
import { ASREmptyState } from "../common/ASREmptyState";
import { useDataStore } from "../../store/useDataStore";

import { ASRDataContext } from "../../types";

interface RegionDetailsProps {
  region: { name: string; flag?: string };
  dataContext: ASRDataContext;
  onEntityClick: (type: string, data: Record<string, unknown> | string | { name?: string; pKey?: string }) => void;
  theme: "light" | "dark";
}

export const RegionDetails = React.memo(
  ({ region, dataContext, onEntityClick, theme }: RegionDetailsProps) => {
    const { atMet = {} } = dataContext || {};

    const playerList_M_AT = useDataStore((s) => s.playerList_M_AT);
    const playerList_F_AT = useDataStore((s) => s.playerList_F_AT);

    const allTimeRankedPKeys = useMemo(() => {
      const pKeys = new Set<string>();
      [...(playerList_M_AT || []), ...(playerList_F_AT || [])].forEach((p: any) => {
        if (p.currentRank !== "UR" && !p.isDivider) {
          pKeys.add(p.pKey || normalizeName(p.name));
        }
      });
      return pKeys;
    }, [playerList_M_AT, playerList_F_AT]);

    const [activeTab, setActiveTab] = useState("players");

    const scrollRef = React.useContext(ModalScrollContext);

    const scrollToTop = () => {
      if (scrollRef?.current) {
        if (scrollRef.current.scrollTop > 150) {
          scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    };

    const regionNameUpper = region.name.toUpperCase().replace(/[\uD83C][\uDDE6-\uDDFF]|\p{Extended_Pictographic}/gu, '').trim();
    const targetTokens = regionNameUpper.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

    const parts = regionNameUpper.split(",");
    const potentialCountry = parts[parts.length - 1]?.trim() || "";
    const computedFlagInfo = fixCountryEntity(potentialCountry, region.flag || "");
    const finalFlag = (computedFlagInfo.flag && computedFlagInfo.flag !== "🏳️") 
      ? computedFlagInfo.flag 
      : getCombinedFlags(region.name);

    const isTokenMatch = (objTokens: string[]): boolean => {
      if (!objTokens || objTokens.length === 0) return false;
      
      if (objTokens.length >= targetTokens.length) {
        // Object provides as much or more detail as region. 
        // All region requirements must be satisfied by object.
        return targetTokens.every(t => objTokens.includes(t));
      } else {
        // Object provides less detail than region (e.g. missing state).
        // It must be referring to the same specific place (tokens[0] === targetTokens[0])
        // And have no conflicts (all tokens are in targetTokens).
        return objTokens[0] === targetTokens[0] && objTokens.every(t => targetTokens.includes(t));
      }
    };

    const matchRegion = (obj: any): boolean => {
      const locStr = formatLocation(obj);
      if (!locStr || locStr === "UNKNOWN") return false;

      const regionFlags = getCombinedFlags(region.flag, finalFlag).split(" ").filter(Boolean);
      if (regionFlags.length > 0) {
        const playerFlags = getCombinedFlags(obj.flag, obj.country, obj.location, obj.region, obj.state, locStr).split(" ").filter(Boolean);
        
        for (const flag of regionFlags) {
          if (flag !== "🏳️" && playerFlags.includes(flag)) {
            return true;
          }
        }
      }

      const strippedLocStr = locStr.replace(/[\uD83C][\uDDE6-\uDDFF]|\p{Extended_Pictographic}/gu, '').trim();

      const objTokens = strippedLocStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

      if (isTokenMatch(objTokens)) {
         return true;
      }
      
      const rawValues = [
        obj.city, obj.country, obj.state, obj.stateProv, obj.location, obj.region, obj.teamLocation, obj.homeGym
      ].filter(Boolean).map(v => String(v).toUpperCase().replace(/[\uD83C][\uDDE6-\uDDFF]|\p{Extended_Pictographic}/gu, '').trim());
      
      if (Array.isArray(obj.teams)) {
          obj.teams.forEach((t: any) => {
              if (t.location) rawValues.push(String(t.location).toUpperCase().replace(/[\uD83C][\uDDE6-\uDDFF]|\p{Extended_Pictographic}/gu, '').trim());
          });
      }
      
      for (const rv of rawValues) {
          const rvTokens = rv.split(',').map(s => s.trim()).filter(Boolean);
          if (isTokenMatch(rvTokens)) {
              return true;
          }
      }

      return false;
    };

    const regionalSkills = useMemo(() => {
      const allSkills = (dataContext.masterSkillList || []) as any[];
      return allSkills
        .filter(matchRegion)
        .map(c => ({
          ...c,
          sends: c.totalAllTimeRuns || c.totalRuns || 0,
          pKey: normalizeName(c.name)
        }))
        .sort((a, b) => (b.sends) - (a.sends));
    }, [dataContext.masterSkillList, region]);

    const regionalPlayers = useMemo(() => {
      const regionStats: Record<string, { sends: number; pts: number }> = {};

      regionalSkills.forEach((c) => {
        const mRecord = c.allTimeMRecord || c.mRecord;
        const fRecord = c.allTimeFRecord || c.fRecord;

        const mMAll = c.allTimeAthletesM || c.athletesMAll;
        if (Array.isArray(mMAll) && mRecord) {
          mMAll.forEach((a: any) => {
            if (a && a[0]) {
              const pKey = normalizeName(a[0]);
              if (!regionStats[pKey]) regionStats[pKey] = { sends: 0, pts: 0 };
              regionStats[pKey].sends += 1;
              regionStats[pKey].pts += c.points || 0;
            }
          });
        }

        const fFAll = c.allTimeAthletesF || c.athletesFAll;
        if (Array.isArray(fFAll) && fRecord) {
          fFAll.forEach((a: any) => {
            if (a && a[0]) {
              const pKey = normalizeName(a[0]);
              if (!regionStats[pKey]) regionStats[pKey] = { sends: 0, pts: 0 };
              regionStats[pKey].sends += 1;
              regionStats[pKey].pts += c.points || 0;
            }
          });
        }
      });

      return Object.values(atMet)
        .filter((p: any) => {
          const pKey = p.pKey || normalizeName(p.name);
          if (!allTimeRankedPKeys.has(pKey)) return false;
          const isFromRegion = matchRegion(p);
          const competedHere = !!regionStats[pKey];
          return isFromRegion || competedHere;
        })
        .map((p: any) => {
          const pKey = p.pKey || normalizeName(p.name);
          const stats = regionStats[pKey] || { sends: 0, pts: 0 };
          return {
            ...p,
            sends: stats.sends,
          };
        })
        .sort((a: any, b: any) => (b.pts || 0) - (a.pts || 0));
    }, [atMet, region, regionalSkills, allTimeRankedPKeys]);

    return (
      <div
        className={cn(
          "flex flex-col relative pb-32 transition-colors",
          theme === "dark" ? "bg-[#0a0a0c]" : "bg-white",
        )}
      >
        <ProfileHeader
          theme={theme}
          avatar={<FallbackAvatar name={region.name} sizeCls="text-3xl" />}
          title={
            <span className="flex items-center gap-2">
              <span className="shrink-0 leading-none">{finalFlag}</span>
              <span className="truncate">{region.name}</span>
            </span>
          }
        />

        <div
          className={cn(
            "flex items-center justify-center border-y sticky top-0 z-40 backdrop-blur-3xl transition-colors py-2",
            theme === "dark"
              ? "border-white/5 bg-zinc-950/80 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
              : "border-black/5 bg-white/90 shadow-[0_4px_30px_rgba(0,0,0,0.03)]",
          )}
        >
          <div className="flex w-full max-w-2xl px-4">
            <ASRNeonToggle
              options={[
                { label: "PLAYERS", value: "players" },
                { label: "CHALLENGES", value: "challenges" },
              ]}
              activeOption={activeTab}
              onChange={(t) => {
                setActiveTab(t);
                scrollToTop();
              }}
              layoutId="region-tabs"
              theme={theme}
              className="w-full"
            />
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col flex-1 transition-colors",
            theme === "dark" ? "bg-[#050505]" : "bg-[#FAFAFA]",
          )}
        >
          {activeTab === "players" && (
            <InspectorTabContainer>
              <div className="grid grid-cols-2 gap-4">
                <ASRStatCard label="PLAYERS" value={regionalPlayers.length} />
                <ASRStatCard 
                  label="SENDS" 
                  value={regionalPlayers.reduce((sum, p: any) => sum + (p.sends || 0), 0)} 
                />
              </div>

              {regionalPlayers.length > 0 ? (
                <div className="mt-4">
                  <ASRRankList
                    athletes={regionalPlayers.map((p: any) => [
                      p.pKey || normalizeName(p.name),
                      p.pts || 0,
                    ])}
                    valueLabel="PTS"
                    dataContext={dataContext}
                    onEntityClick={onEntityClick}
                    entityType="player"
                    hideSubtitle={true}
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <ASREmptyState 
                    theme={theme}
                    title="NO REGIONAL PLAYERS"
                    message="THERE ARE NO ALL-TIME RANKED PLAYERS REGISTERED IN THIS LOCATION YET."
                  />
                </div>
              )}
            </InspectorTabContainer>
          )}

          {activeTab === "challenges" && (
            <InspectorTabContainer>
              <div className="grid grid-cols-2 gap-4">
                <ASRStatCard label="CHALLENGES" value={regionalSkills.length} />
                <ASRStatCard 
                  label="SENDS" 
                  value={regionalSkills.reduce((sum, c: any) => sum + (c.sends || 0), 0)} 
                />
              </div>

              <div className="flex flex-col gap-4 mt-4 mb-8">
                {regionalSkills.length > 0 ? (
                  <ASRRankList
                    athletes={regionalSkills}
                    valueLabel="SENDS"
                    onEntityClick={onEntityClick}
                    dataContext={dataContext}
                    hideSubtitle={true}
                    entityType="challenge"
                  />
                ) : (
                  <ASREmptyState 
                    theme={theme}
                    title="NO REGIONAL CHALLENGES"
                    message="THERE ARE NO OFFICIAL CHALLENGES REGISTERED IN THIS LOCATION YET."
                  />
                )}
              </div>
            </InspectorTabContainer>
          )}
        </div>
      </div>
    );
  },
);
