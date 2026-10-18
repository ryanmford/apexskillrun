const fs = require('fs');
let code = fs.readFileSync('src/components/views/RankingsView.tsx', 'utf8');

const target = `  const playerColumns = React.useMemo(() => [
    {
      label: "RATING",
      key: "rating",
      getValue: (p: PlayerProfile) => (p.rating || 0).toFixed(2),
    },
    {
      label: "PTS",
      key: "pts",
      getValue: (p: PlayerProfile) => (p.pts || 0).toFixed(2),
    },
    {
      label: "SENDS",
      key: "sends",
      getValue: (p: PlayerProfile) => String(p.sends || 0),
    },
  ], []);`;

const replacement = `  const playerColumns = React.useMemo(() => [
    {
      label: "RATING",
      key: "rating",
      getValue: (p: PlayerProfile) => (
        <div className="flex flex-col items-end leading-none justify-center">
          <span>{(p.rating || 0).toFixed(2)}</span>
          <span className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1 sm:mt-1.5">
            {(p.pts || 0).toFixed(2)} PTS
          </span>
        </div>
      ),
    },
  ], []);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/views/RankingsView.tsx', code);
