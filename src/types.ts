export interface PlayerProfile {
  [key: string]: any;
  pKey: string;
  name: string;
  gender: "M" | "F";
  rating: number;
  pts?: number;
  sets?: number;
  contributionScore?: number;
  avgTime?: number;
  certLevel?: string;
  shoe?: string;
  shoeSize?: string;
  challenges?: number;
  sends: number;
  firstSends?: number;
  latestRunDate?: Date;
  homeGym?: string;
  gymFlag?: string;
  townFlag?: string;
  teams?: { name: string; flag?: string; location?: string }[];
  teamLocation?: string;
  searchKey?: string;
  isDivider?: boolean;
  countryName?: string;
  region?: string;
  location?: string;
  igHandle?: string;
  currentRank?: number | string;
  isQualified?: boolean;
  shouldFade?: boolean;
  cities?: number;
  countries?: number;
}

export interface SkillData {
  [key: string]: any;
  name: string;
  videoUrl?: string;
  city?: string;
  stateProv?: string;
  country?: string;
  flag?: string;
  continent?: string;
  continentFlag?: string;
  difficulty?: string;
  points?: number;
  length?: string;
  elevation?: string;
  type?: string;
  setter?: string;
  notes?: string;
  demoVideo?: string;
  coverImage?: string;
  coordinates?: string;
  sponsorName?: string;
  sponsorLink?: string;
  searchKey?: string;
  leadSettersNormalized?: string[];
  leadSetters?: string | string[];
  assistantSettersNormalized?: string[];
  assistantsetters?: string | string[];
  isOpenSkill?: boolean;
  is2026Skill?: boolean;
  isAllTimeSkill?: boolean;
  dateSet?: string;
  mRecord?: number | null;
  fRecord?: number | null;
  totalAthletes?: number;
  totalRuns?: number;
  allTimeMRecord?: number | null;
  allTimeFRecord?: number | null;
  allTimeAthletesM?: [string, number, string?][];
  allTimeAthletesF?: [string, number, string?][];
  athletesMAll?: [string, number, string?][];
  athletesFAll?: [string, number, string?][];
  totalAllTimeAthletes?: number;
  totalAllTimeRuns?: number;
  parsedCoords?: [number, number] | null;
}

export interface SetterProfile {
  [key: string]: any;
  name: string;
  leads: number;
  assists: number;
  sets: number;
  contributionScore?: number;
  films: number;
  isAthlete: boolean;
  searchKey?: string;
}

export interface TeamProfile {
  category?: string;
  [key: string]: any;
  name: string;
  flag: string;
  location?: string;
  pts: number;
  players: PlayerProfile[];
  playersCount: number;
  bestPlayers: PlayerProfile[];
  runsCount: number;
  searchKey?: string;
}

export interface ASRDataContext {
  [key: string]: any;
  lbAT?: { M: Record<string, any>; F: Record<string, any> };
  lbOP?: { M: Record<string, any>; F: Record<string, any> };
  lbSeason26?: { M: Record<string, any>; F: Record<string, any> };
  season26Data?: any[];
  season26Perfs?: Record<string, any>;
  atMet?: Record<string, any>;
  cMet?: Record<string, any>;
  pRaw?: Record<string, Record<string, any[]>>;
  skillRunsHistory?: Record<string, any[]>;
  setterMet?: Record<string, any>;
  lbAT_Skills?: { M?: Record<string, any>; F?: Record<string, any> };
  lbOP_Skills?: { M?: Record<string, any>; F?: Record<string, any> };
  masterSkillList?: any[];
  skillRecords_M_AT?: Record<string, any>;
  skillRecords_F_AT?: Record<string, any>;
  skillRecords_M_OP?: Record<string, any>;
  skillRecords_F_OP?: Record<string, any>;
  skillRecords_M_2026?: Record<string, any>;
  skillRecords_F_2026?: Record<string, any>;
}
