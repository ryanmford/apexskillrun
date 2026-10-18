const fs = require('fs');
const { execSync } = require('child_process');

const csv = execSync('curl -sL "https://docs.google.com/spreadsheets/d/19qI0mQJc4iW_tz-OycA1atgAM4qMzrS_diChMAbrobo/export?format=csv&gid=623600169"').toString();
const lines = csv.split("\n");
console.log("Lines:", lines.length);

let hIdx = -1;
for (let i = 0; i < Math.min(10, lines.length); i++) {
  if (/athlete|name|player|challenge|track|course|pb|result|time|name|challenge|track|pb|result/i.test(lines[i])) {
    hIdx = i;
    break;
  }
}

const headers = lines[hIdx].split(',').map(h => h.trim().toLowerCase());
const challengeIdx = headers.findIndex(h => h === "challenge");
const playerIdx = headers.findIndex(h => h === "player");
const dateIdx = headers.findIndex(h => h === "date");

console.log({ challengeIdx, playerIdx, dateIdx });

const skillRunsHistory = {};
for(let i=hIdx+1; i<lines.length; i++) {
  const parts = lines[i].split(",");
  if (parts.length < dateIdx) continue;
  
  const challenge = parts[challengeIdx];
  const player = parts[playerIdx];
  const date = parts[dateIdx];
  
  if (!challenge || !player) continue;
  
  const normC = challenge.toUpperCase().trim();
  if (!skillRunsHistory[normC]) skillRunsHistory[normC] = [];
  skillRunsHistory[normC].push({ pKey: player.toUpperCase().trim().replace(/\s/g, ''), date });
}

let olofCount = 0;
const firstSends = {};
Object.keys(skillRunsHistory).forEach(normC => {
  const runs = skillRunsHistory[normC].filter(r => r.date);
  if (runs.length > 0) {
    runs.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstDate = new Date(runs[0].date).getTime();
    const firstRunners = runs.filter(r => new Date(r.date).getTime() === firstDate).map(r => r.pKey);
    firstRunners.forEach(p => {
       firstSends[p] = (firstSends[p] || 0) + 1;
       if (p === 'OLOFWOOD') olofCount++;
    });
  }
});

console.log("Olof Wood first sends:", olofCount);
