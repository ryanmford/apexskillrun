const fs = require('fs');
let code = fs.readFileSync('src/components/inspector/PlayerDetails.tsx', 'utf8');

const regex = /{ label: "CHALLENGES", value: stats.challenges },\s*{ label: "SENDS", value: stats.sends },\s*{ label: "POINTS", value: stats.pts.toFixed\(2\) },/g;

code = code.replace(regex, `{ label: "RATING", value: stats.rating.toFixed(2) },
                    { label: "POINTS", value: stats.pts.toFixed(2) },
                    { label: "SENDS", value: stats.sends },`);

fs.writeFileSync('src/components/inspector/PlayerDetails.tsx', code);
