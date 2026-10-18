const fs = require('fs');
let code = fs.readFileSync('src/lib/asr-data.ts', 'utf8');

const target = `    .sort((a: any, b: any) => {
      if ((b.pts || 0) !== (a.pts || 0)) {
        return (b.pts || 0) - (a.pts || 0);
      }
      if (Math.abs((b.rating || 0) - (a.rating || 0)) > 0.000001) {
        return (b.rating || 0) - (a.rating || 0);
      }`;

const replacement = `    .sort((a: any, b: any) => {
      if (Math.abs((b.rating || 0) - (a.rating || 0)) > 0.000001) {
        return (b.rating || 0) - (a.rating || 0);
      }
      if ((b.pts || 0) !== (a.pts || 0)) {
        return (b.pts || 0) - (a.pts || 0);
      }`;

code = code.replace(target, replacement); // For the second instance
code = code.replace(target, replacement); // For the third instance

// Fix the messed up first instance
const messedUp = `    .sort((a: any, b: any) => {
      if (Math.abs((b.rating || 0) - (a.rating || 0)) > 0.000001) {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (Math.abs((b.rating || 0) - (a.rating || 0)) > 0.000001) {
        return (b.rating || 0) - (a.rating || 0);
      }`;
code = code.replace(messedUp, replacement);

fs.writeFileSync('src/lib/asr-data.ts', code);
