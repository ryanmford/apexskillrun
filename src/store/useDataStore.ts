import { create } from 'zustand';
import type { PlayerProfile, SkillData, SetterProfile, TeamProfile } from '../types';

interface ASRDataState {
  data: PlayerProfile[];
  openData: PlayerProfile[];
  season26Data: PlayerProfile[];
  atPerfs: Record<string, any>;
  opPerfs: Record<string, any>;
  season26Perfs: Record<string, any>;
  lbAT: { M: Record<string, any>; F: Record<string, any> };
  lbOpen: { M: Record<string, any>; F: Record<string, any> };
  lbSeason26: { M: Record<string, any>; F: Record<string, any> };
  atMet: Record<string, any>;
  dnMap: Record<string, string>;
  cMet: Record<string, any>;
  settersData: SetterProfile[];
  atRawBest: Record<string, any>;
  opRawBest: Record<string, any>;
  season26RawBest: Record<string, any>;
  recentFeed: any[];
  skillRunsHistory: Record<string, any[]>;
  
  // Computed Data
  masterSkillList: SkillData[];
  kpiStats: Record<string, any> | null;
  kpiTrends: Record<string, { value: number }[]> | null;
  settersWithImpact: SetterProfile[];
  setterMet: Record<string, any>;
  teamsAggregated: TeamProfile[];
  playerLB_AT: { M: PlayerProfile[]; F: PlayerProfile[] };
  playerLB_OP: { M: PlayerProfile[]; F: PlayerProfile[] };
  playerLB_2026: { M: PlayerProfile[]; F: PlayerProfile[] };

  // Pre-computed lists
  skillRecords_M_AT: Record<string, any>;
  skillRecords_F_AT: Record<string, any>;
  skillRecords_M_OP: Record<string, any>;
  skillRecords_F_OP: Record<string, any>;
  skillRecords_M_2026: Record<string, any>;
  skillRecords_F_2026: Record<string, any>;
  playerList_M_AT: PlayerProfile[];
  playerList_F_AT: PlayerProfile[];
  playerList_M_OP: PlayerProfile[];
  playerList_F_OP: PlayerProfile[];
  playerList_M_2026: PlayerProfile[];
  playerList_F_2026: PlayerProfile[];
  skillList_AT: SkillData[];
  skillList_OP: SkillData[];
  skillList_2026: SkillData[];
  settersList: SetterProfile[];
  teamList_gyms_AT: TeamProfile[];
  teamList_teams_AT: TeamProfile[];
  teamList_gyms_OP: TeamProfile[];
  teamList_teams_OP: TeamProfile[];
  teamList_gyms_2026: TeamProfile[];
  teamList_teams_2026: TeamProfile[];

  isLoading: boolean;
  isSyncing: boolean;
  hasError: boolean;
  hasPartialError: boolean;
  lastUpdated: number | null;
  refreshTrigger: number;
  triggerRefresh: () => void;
  
  setData: (payload: Partial<ASRDataState>) => void;
  setFetchStatus: (status: { isLoading?: boolean; isSyncing?: boolean; hasError?: boolean; hasPartialError?: boolean }) => void;
}

export const useDataStore = create<ASRDataState>((set) => {
  // Check if initial data was provided synchronously via SSR
  let initialData = {};
  let initialIsLoading = true;

  if (typeof window !== "undefined" && "window" in globalThis && (window as unknown as { __INITIAL_DATA__?: Record<string, any> }).__INITIAL_DATA__) {
    initialData = (window as unknown as { __INITIAL_DATA__?: Record<string, any> }).__INITIAL_DATA__;
    initialIsLoading = false;
  }

  return {
    data: [],
    openData: [],
    season26Data: [],
    atPerfs: {},
    opPerfs: {},
    season26Perfs: {},
    lbAT: { M: {}, F: {} },
    lbOpen: { M: {}, F: {} },
    lbSeason26: { M: {}, F: {} },
    atMet: {},
    dnMap: {},
    cMet: {},
    settersData: [],
    atRawBest: {},
    opRawBest: {},
    season26RawBest: {},
    recentFeed: [],
    skillRunsHistory: {},

    masterSkillList: [],
    kpiStats: null,
    kpiTrends: null,
    settersWithImpact: [],
    setterMet: {},
    teamsAggregated: [],
    playerLB_AT: { M: [], F: [] },
    playerLB_OP: { M: [], F: [] },
    playerLB_2026: { M: [], F: [] },

    skillRecords_M_AT: {},
    skillRecords_F_AT: {},
    skillRecords_M_OP: {},
    skillRecords_F_OP: {},
    skillRecords_M_2026: {},
    skillRecords_F_2026: {},

    playerList_M_AT: [],
    playerList_F_AT: [],
    playerList_M_OP: [],
    playerList_F_OP: [],
    playerList_M_2026: [],
    playerList_F_2026: [],
    skillList_AT: [],
    skillList_OP: [],
    skillList_2026: [],
    settersList: [],
    teamList_gyms_AT: [],
    teamList_teams_AT: [],
    teamList_gyms_OP: [],
    teamList_teams_OP: [],
    teamList_gyms_2026: [],
    teamList_teams_2026: [],

    ...initialData,

    isLoading: initialIsLoading,
    isSyncing: false,
    hasError: false,
    hasPartialError: false,
    lastUpdated: null,
    refreshTrigger: 0,

    triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
    setData: (payload) => set((state) => ({ ...state, ...payload })),
    setFetchStatus: (status) => set((state) => ({ ...state, ...status })),
  };
});
