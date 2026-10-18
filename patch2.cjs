const fs = require('fs');
let code = fs.readFileSync('src/components/views/RankingsView.tsx', 'utf8');
code = code.replace(
  `  const playerColumns = React.useMemo(() => [
    {
      label: "PTS",
      key: "pts",
      getValue: (p: PlayerProfile) => (p.pts || 0).toFixed(2),
    },
  ], []);`,
  `  const playerColumns = React.useMemo(() => [
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
  ], []);`
);
fs.writeFileSync('src/components/views/RankingsView.tsx', code);
