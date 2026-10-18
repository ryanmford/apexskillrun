const fs = require('fs');
let code = fs.readFileSync('src/lib/asr-data.ts', 'utf8');

const regex = /rating: top10TotalPts \/ 10/g;
code = code.replace(regex, "rating: top10Perfs.length > 0 ? top10TotalPts / top10Perfs.length : 0");

fs.writeFileSync('src/lib/asr-data.ts', code);
