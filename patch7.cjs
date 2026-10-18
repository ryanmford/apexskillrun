const fs = require('fs');
let code = fs.readFileSync('src/components/ASRListItems.tsx', 'utf8');

const target = `<div
 className={cn(
 "flex flex-col items-end justify-center text-right",
 isCompact ? "min-w-[50px]" : "min-w-[50px] sm:min-w-[80px] lg:min-w-[120px]",
 )}
 >
 {(stats || []).map((s: { value?: React.ReactNode }, idx: number) => (
 <span
 key={idx}`;

const replacement = `<div className="flex items-center justify-end text-right h-full">
 {(stats || []).map((s: { value?: React.ReactNode }, idx: number) => {
   const colDef = columns?.filter(
     (c: { isRank?: boolean; type?: string }) => !c.isRank && c.type !== "profile",
   )[idx];
   return (
   <div key={idx} className={cn("flex flex-col items-end justify-center h-full shrink-0", (colDef as any)?.width || (isCompact ? "min-w-[50px]" : "min-w-[50px] sm:min-w-[80px] lg:min-w-[120px]"))}>
 <span`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/ASRListItems.tsx', code);
