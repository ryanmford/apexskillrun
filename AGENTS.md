# APEX SKILL RUN — AI Assistant Guidelines

This file (`AGENTS.md`) is the permanent architectural, mathematical, and editorial constitution for **APEX SKILL RUN**. Read and enforce these rules on every turn.

## 1. Core Directive
* **Guide, Don't Override:** Use these rules to govern new features, bug fixes, and copywriting. Do not refactor working architecture or UI patterns unless explicitly instructed.
* **The "Low-Lift" Engineering Doctrine:** Never over-engineer. Favor flat precomputed arrays, deterministic seeds, static config constants, Google Sheets CSV caching, and direct external links over complex backend infrastructure. Do not fix what isn't broken.

## 2. Canonical Terminology (UI Copy vs. Code Identifiers)
The codebase migrated its user-facing vocabulary from "Skills/Runs" to **"Challenges/Sends"**, while retaining legacy TypeScript identifiers internally. Never leak legacy internal terms into the UI.

| Concept | Mandatory User-Facing UI Copy | Internal Code Identifiers (Keep As-Is) |
| :--- | :--- | :--- |
| **The Course / Obstacle** | **CHALLENGE** / **CHALLENGES** | `SkillData`, `masterSkillList`, `cMet`, `SkillDetails.tsx` |
| **A Verified Completion** | **SEND** / **SENDS** / **1ST SENDS** | `sends`, `skillRunsHistory`, `allRuns`, `totalAllTimeRuns` |
| **A Competitor** | **PLAYER** / **PLAYERS** (`MEN` / `WOMEN`) | `PlayerProfile`, `athleteMetadata`, `atMet`, `pKey` |
| **Course Creator** | **SETTER** (`SETS`, `LEADS`, `ASSISTS`) | `SetterProfile`, `setterMet`, `settersWithImpact` |
| **Challenge Difficulty** | **LEVEL** (`LVL 1` – `LVL 100`) | `points`, `skillPoints`, `difficulty`, `SKILL_RATING_TIERS` |
| **Active Divisions** | **ALL-TIME**, **2026**, **OPEN** | `all-time` (`AT`), `2026` (`season26`), `open` (`OP`) |

## 3. Brand Voice & Editorial Philosophy
* **Brand Name:** Always spell as **APEX SKILL RUN**, Apex Skill Run, or **ASR**.
* **Tone & Perspective:** Direct. Declarative. Minimalist. Treat the user as smart. Use "you" heavily. Avoid "I" or "we". Speak to the user, not about yourself.
* **Structure & Punctuation:** Write in short sentences and paragraphs (1–3 sentences max). Use line breaks instead of commas. Land punchlines on strong, short nouns.
* **Rhetorical Patterns:** Use clear contrasts (theory vs. practice, default vs. design) and parallel structures. State uncomfortable truths directly.
* **Banned Language:** NO jargon, NO clichés, and NO cheesy marketing language.
* **Philosophical Pillars (For Copy & Onboarding):**
  * **DeSport & DeSci:** Open-source, permissionless skill parkour league. Everybody owns the map. Anyone can start anytime.
  * **Pass or Fail:** You versus the challenge. Complete it cleanly on video or it doesn't count.
  * **Surface Literacy (Textures & Interfaces):** Challenge complexity is governed by friction changes (Textures) and tactile manipulations (Interfaces), not just sheer distance.
  * **Digital Landmarks & Ghost Setting:** ASR operates outdoors in public spaces using permanent, exact urban geometry—never physical tape or paint. Operate invisibly with "Professional Boredom" rather than rebellious skater/punk tropes.
  * **The Mission:** Grow the grassroots network to 100 countries, 1,000 challenges, and 10,000 players. Always pull live counts from `kpiStats` in `useDataStore`.

## 4. Game Logic, Scoring & Leaderboard Math
All ranking and stat math lives in `src/lib/asr-data.ts`, `src/lib/asr-data-compute.ts`, and `src/lib/asr-utils.ts`. Never invent alternative formulas in UI components.

* **Challenge Level & 5-Tier Rating Scale (`1–100`):**
  * `1–20`: **ENTRY** (Emerald `#10b981`)
  * `21–40`: **CORE** (Sky `#0ea5e9`)
  * `41–60`: **SOLID** (Amber `#f59e0b`)
  * `61–80`: **HARD** (Rose `#f43f5e`)
  * `81–100`: **APEX** (Purple `#a855f7`)
  * `0 / Unset`: **UNRATED** (Zinc `#a1a1aa`)
* **Qualification Gate (`isQualifiedAthlete`):** A player must send **3+ unique Challenges** (`challenges >= 3`) in a division to earn a numerical rank. Players with `< 3` unique challenges receive `"UR"` (Unranked) and appear below the `"SEND 3+ CHALLENGES TO GET RANKED"` divider.
* **Player Points (`pts`):** Sum of `skillPoints` (`1–100`) across all unique Challenges sent by the player in that division.
* **Player Rating (`rating`):** Mean `skillPoints` of the player's **Top 10 highest-rated unique Challenges** sent in that division (`top10TotalPts / top10Perfs.length`).
* **Player Leaderboard Tiebreaker Hierarchy (`sortAthletesWithTiebreakers`):**
  1. Higher `rating` (Top-10 average, `1e-6` epsilon)
  2. Higher total `pts`
  3. Higher total `sends`
  4. Earlier `latestRunDate` (chronological priority)
* **Challenge Send Ordering (`computeRecords` & `SkillDetails.tsx`):**
  * Verified sends on a Challenge are ordered by Date (`dateA - dateB`), with undated legacy sends placed below dated sends, and alphabetical name tiebreaker.
  * **First Send Protection (`buildFirstSendsMap`):** If a Challenge contains undated legacy sends, a later dated send must never claim `"1st Send"` credit.
* **Setter Impact & Certification Levels (`getSetterLevel`):**
  * **Impact:** Total verified community sends across all Challenges where the setter is credited as Lead or Assist.
  * **Level 1 Badge:** `impact >= 10` AND `sets >= 3`
  * **Level 2 Badge:** `impact >= 100` AND `sets >= 10`
  * **Level 3 Badge:** `impact >= 1000` AND `sets >= 100`
* **Contribution Coins (`🪙 contributionScore`):**
  * Real-time formula: `(sends * 0.1) + (leads * 0.2) + (assists * 0.1)`.
* **Decimal Precision Rules:**
  * Format continuous and composite metrics (`rating`, `pts`, `contributionScore`, `length` in meters, `elevation` in meters, and user distance in `KM`) to **EXACTLY 2 decimal places** (`.toFixed(2)`). (The stat simulator tool is the sole exception and may use 3 decimal places).
  * Format discrete counts (`sends`, `1st sends`, `challenges`, `sets`, `leads`, `assists`, `impact`, `films`, and Challenge `LVL 1–100`) as **integers**.

## 5. Ecosystem Flywheels, Attribution & Verification
* **Verification & Video Proof:** Self-officiated and community-audited via the **Apex Skool** community (`CONFIG.SKOOL_LINK`). High-quality raw video proof (4K, 24–60fps preferred) is mandatory; obstructed angles or poor quality are rejected.
* **Demo Video Fallback:** A Challenge's `DEMO` button prioritizes the earliest dated verified send video (`firstRunVideoUrl`) and falls back to `meta.demoVideo`.
* **Micro-Narratives & Attribution:** Always credit Players, Lead Setters, Assistant Setters, Filmers (`films`), Home Gyms (`gyms`), and Teams (`teams`). Exclude `"UNAFFILIATED"` and placeholder/interim entries (`isPlaceholderPlayer`) from official rankings and counts.
* **Challenge Sponsors (`ASRPatronPill` & `ASRPromotionBanner`):** Render sponsor attribution (`sponsorName`, `sponsorLink`) and direct external bounty/tip links on Challenge and Setter views to minimize friction and bypass platform fees.
* **Footwear Attribution & Filtering:**
  * Player bios display footwear (`vitals.shoe`) linked directly to Strike MVMNT or Amazon affiliate search (`tag=apexskillrun-20`).
  * Footwear brands must always be excluded from Team leaderboards via `isFootwearTeam()` in `src/lib/asr-data.ts`.
* **Deterministic "Of The Day" Curation (`HomeView.tsx`):** Send of the Day, Player of the Day, and Challenge of the Day are deterministically seeded by the `America/Denver` calendar date. Challenges of the Day must have at least 1 real Men's send and 1 real Women's send.

## 6. Metadata & Challenge Conventions
* **Standardized Geography:** Use strict geographic naming hierarchy (`fixCountryEntity`, `getContinentData`, `formatLocation`). Group stats and filtering logically by Continent, Country, and City.
* **Challenge Profile Schema (`SET_LIST_MAPPING`):** Every Challenge profile captures `name` (uppercase normalized), `points` (`LVL 1–100`), `length` (`m`), `elevation` (`+/- m`), `type`, `dateSet`, `city`, `stateProv`, `country`, `flag`, `coordinates` (`lat, lng`), `demoVideo`, `leadSetters`, `assistantsetters`, `sponsorName`, `sponsorLink`, `notes`, and division flags (`isAllTimeSkill`, `is2026Skill`, `isOpenSkill`).

## 7. Design, Dual-Theme & Mobile Ergonomics
* **Mobile-First Ergonomics:** Navigation is anchored to thumb-reachable bottom controls (`ASRNavDock`, `ASRBottomSheet`, `ASRBaseModal`). Desktop is a widescreen expansion of mobile.
* **iOS Safari Zoom Prevention:** Never use font sizes smaller than `16px` (`text-base` / `text-[16px]`) on `<input>`, `<textarea>`, or `<select>` elements.
* **Dual-Theme Discipline (`"light" | "dark"`):**
  * The app supports both Dark (`#030303` / `#050505`, white text, `border-white/5`) and Light (`#FFFFFF` / `#FAFAFA`, `text-zinc-900`, `border-black/5`) themes via `ThemeContext` and `THEME` in `src/lib/asr-utils.ts`.
  * Always support both themes when styling components; never hardcode dark-only backgrounds or text colors outside of full-bleed video overlays.
* **Typography & Motion:** Use `font-display font-black uppercase` for headings/labels and `font-mono tabular-nums` for all numbers, ranks, and metrics. Animations (`AnimatedListView`, `CountUp`) must be fast, punchy, and precise.
* **States & Loading:** Never flash blank screens or raw unstyled text. Default to `Skeletons` during fetch cycles and `ASREmptyState` for empty/filtered-out results.
* **UI Complexity Control:** Keep atomic components (`ASRStandardButton`, `ASRNeonToggle`, `ASRStatCard`, list rows) lean. Avoid excessive nested layers or heavy `backdrop-blur` inside virtualized/repeated list rows (`ASRRankList`, `ASRDataTable`) to prevent mobile GPU lag.

## 8. Technical Architecture & Data Pipeline
* **Component Taxonomy:**
  * `/src/components/common`: Atomic UI, modals, headers, nav dock, skeletons.
  * `/src/components/inspector`: Entity readouts (`PlayerDetails`, `SkillDetails`, `TeamDetails`, `RegionDetails`, `VaultComponents`, simulators, charts).
  * `/src/components/list`: High-density rank lists and data tables (`ASRRankList`, `ASRDataTable`).
  * `/src/components/views`: Root route screens (`HomeView`, `MapSkillsView`, `RankingsView`, `ASRWallOfFame`, `ASRVideoAnnotator`).
* **Off-Thread Data Pipeline (`Google Sheets -> dataWorker -> useDataStore`):**
  * Live data is fetched from 4 Google Sheet GIDs (`MENS`, `WOMENS`, `LIVE`, `SETS`) with `/api/proxy-sheet` fallback (`server.ts`) and cached locally under `CONFIG.SNAPSHOT_KEY`.
  * `computeAllState` (`src/lib/asr-data-compute.ts`) runs inside `src/workers/dataWorker.ts` to precompute flat, tie-aware arrays (`playerList_M_AT`, `skillList_AT`, `teamList_gyms_AT`, `skillRecords_M_AT`, etc.) stored in `useDataStore`.
  * Read from `useDataStore` and `useAppStore` (`src/store/useAppStore.ts`). Do not duplicate global state locally or recompute leaderboard rankings on the main thread during render.
* **Non-Blocking Tab & Filter Transitions:**
  * In inspectors and views, drive active tab/pill highlights from immediate local state (`uiTab`, `uiMode`) while wrapping heavy list switches in `React.startTransition` (`contentTab`, `contentMode`) and syncing URL query parameters (`useSearchParams` with `{ replace: true, preventScrollReset: true }`).
