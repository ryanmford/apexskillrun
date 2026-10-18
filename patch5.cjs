const fs = require('fs');
let code = fs.readFileSync('src/lib/asr-data.ts', 'utf8');

code = code.replace(/const top10Perfs = \[\.\.\.perfs\]\.sort\(\(a, b\) => \(b\.points \|\| 0\) - \(a\.points \|\| 0\)\)\.slice\(0, 10\);/g, "const top10Perfs = [...perfs].sort((a, b) => (b.skillPoints || 0) - (a.skillPoints || 0)).slice(0, 10);");

code = code.replace(/const top10TotalPts = top10Perfs\.reduce\(\(sum: number, p: { points\?: number }\) => sum \+ \(p\.points \|\| 0\), 0\);/g, "const top10TotalPts = top10Perfs.reduce((sum: number, p: { skillPoints?: number }) => sum + (p.skillPoints || 0), 0);");

fs.writeFileSync('src/lib/asr-data.ts', code);
