const fs = require('fs');
let code = fs.readFileSync('src/components/ASRListItems.tsx', 'utf8');
code = code.replace(
  ` <div className={cn(
 "flex flex-col items-end justify-center text-right",
 isCompact ? "min-w-[50px]" : "min-w-[50px] sm:min-w-[80px] lg:min-w-[120px]",
 )}
 >
 {(stats || []).map((s: { value?: React.ReactNode }, idx: number) => (
 <span`,
  ` <div className={cn(
 "flex items-center text-right h-full gap-0",
 )}
 >
 {(stats || []).map((s: { value?: React.ReactNode }, idx: number) => (
 <span`
);
fs.writeFileSync('src/components/ASRListItems.tsx', code);
