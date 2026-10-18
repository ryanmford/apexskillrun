const { execSync } = require('child_process');
const csv = execSync('curl -sL "https://docs.google.com/spreadsheets/d/19qI0mQJc4iW_tz-OycA1atgAM4qMzrS_diChMAbrobo/export?format=csv&gid=623600169"').toString();

const lines = csv.split("\n");
console.log("Total runs:", lines.length);

let firstSends = {};
let skillDates = {};

for(let i=2; i<lines.length; i++) {
  const line = lines[i];
  const parts = line.split(",");
  if (parts.length < 5) continue;
  const challenge = parts[21] || parts[22]; // Actually let's use the columns
  // Challenge is 21 or something? Wait...
  // index 21: Challenge
  // index 22: Player
  // Let me just split by comma but with regex
}
