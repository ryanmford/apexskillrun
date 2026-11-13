import React, { useContext } from "react";
import { Play, MapPin } from "lucide-react";
import { THEME, cn, trackEvent, formatFlagsWithSpace } from "../lib/asr-utils";
import { ThemeContext } from "../theme-context";
import { useAppStore } from "../store/useAppStore";

export const ASRRankBadge = React.memo(
 ({ rank, size = "md", scale = 1 }: { rank?: string | number | null; size?: "sm" | "md" | "lg"; scale?: number }) => {
 const theme = useContext(ThemeContext);
 const isUnranked = String(rank || "").trim() === "UR";
 const rankNum = isUnranked ? "UR" : rank === "-" ? "?" : rank;
 const dim =
 size === "lg"
 ? "w-10 h-10 sm:w-11 sm:h-11 "
      : size === "sm"
      ? "w-5 h-5 sm:w-6 sm:h-6"
      : "w-7 h-7 sm:w-8 sm:h-8 ";
 const textClass =
 size === "lg"
 ? "text-sm sm:text-base "
      : size === "sm"
      ? "text-[8px] sm:text-[9px]"
      : "text-[10px] sm:text-xs ";
 const styles: Record<string, { border: string; text: string; glow: string }> = {
 unranked: {
 border: theme === "dark" ? "border-zinc-700" : "border-zinc-200",
 text: "text-zinc-500",
 glow: "drop-shadow-none",
 },
 default: {
 border: "border-none",
 text: theme === "dark" ? "text-white" : "text-black",
 glow: "drop-shadow-none",
 },
 };
 const current = isUnranked
 ? styles.unranked
 : styles.default;
 return (
 <span
 style={{ transform: `scale(${scale})` }}
 className={`inline-flex items-center justify-center rounded-full font-black tabular-nums tracking-tighter transition-all duration-300 shrink-0 ${dim} ${textClass} ${current.border} ${current.text} ${current.glow} ${isUnranked ? "border-2" : "border-0"} ios-clip-fix`}
 >
 {rankNum}
 </span>
 );
 },
);



export const ASRListItem = React.memo(
 ({
 rank,
 title,
 subtitle,
 variant = "table",
 stats = [],
 columns = [],
 videoUrl,
 icon,
 onClick,
 badgeContent,
 shouldFade = false,
 flag,
 mapUrl,
 showVideoIcon = false,
 isUnclaimed = false,
 isCompact = false, onHover, isHighlighted,
 }: {
   rank?: string | number | null;
   title?: React.ReactNode;
   subtitle?: React.ReactNode;
   variant?: "table" | "card" | "hero";
   stats?: { value?: React.ReactNode; subValue?: React.ReactNode; valueClassName?: string; label?: React.ReactNode }[];
   columns?: { isRank?: boolean; type?: string }[];
   videoUrl?: string | null;
   icon?: React.ReactNode;
   onClick?: (e?: React.MouseEvent | React.KeyboardEvent) => void;
   badgeContent?: React.ReactNode;
   shouldFade?: boolean;
   flag?: string | null;
   mapUrl?: string | null;
   showVideoIcon?: boolean;
   isUnclaimed?: boolean;
   isCompact?: boolean;
   onHover?: (isHovering: boolean) => void;
   isHighlighted?: boolean;
 }) => {
 const setPlayingVideoUrl = useAppStore((s) => s.setPlayingVideoUrl);
 const theme = useContext(ThemeContext);
 const accentColor = theme === "dark" ? "text-white" : "text-zinc-900";
 const tableHover =
 theme === "dark" 
 ? "hover:bg-white/[0.08]" 
 : "hover:bg-black/[0.05]";
 const cardHover =
 theme === "dark" 
 ? "hover:bg-white/5 hover:border-zinc-500/30 transition-colors duration-150" 
 : "hover:bg-black/5 hover:border-zinc-500/30 transition-colors duration-150";

 const getHighlightClass = () => {
   if (!isHighlighted) return "";
   return theme === "dark" ? "!bg-white/10 !ring-2 !ring-zinc-100 shadow-[0_0_15px_rgba(255,255,255,0.2)] !scale-[1.02] z-10 relative" : "!bg-black/5 !ring-2 !ring-zinc-900 shadow-[0_0_15px_rgba(0,0,0,0.2)] !scale-[1.02] z-10 relative";
 };
 const getTableHighlightClass = () => {
   if (!isHighlighted) return "";
   return theme === "dark" ? "!bg-white/[0.12] scale-[1.01] z-10 relative" : "!bg-zinc-900/5 scale-[1.01] z-10 relative";
 };

 const ItemWrapper: React.ElementType = 'div';

 if (variant === "table") {
 return (
 <ItemWrapper
 onClick={onClick}
 role={onClick ? "button" : undefined} 
 onPointerEnter={(e: React.PointerEvent) => {
   if (e.pointerType === "mouse" && onHover) onHover(true);
 }}
 onPointerLeave={(e: React.PointerEvent) => {
   if (e.pointerType === "mouse" && onHover) onHover(false);
 }}
 tabIndex={onClick ? 0 : undefined}
 onKeyDown={(e) => {
 if (onClick && (e.key === "Enter" || e.key === " ")) {
 e.preventDefault();
 onClick(e);
 }
 }}
 className={cn(
 "group flex items-center transition-all duration-300 ios-clip-fix py-5 sm:py-6 lg:py-8 px-0 outline-none w-full text-left",
 onClick
 ? `cursor-pointer active:scale-95 active:bg-zinc-500/10 hover:scale-[1.01] focus-visible:outline-none focus-visible:bg-zinc-500/5 focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-zinc-500 rounded-xl ${tableHover}`
 : "cursor-default",
 getTableHighlightClass(),
 shouldFade ? "opacity-40 grayscale" : "opacity-100",
 )}
 >
 <div className="w-16 sm:w-24 lg:w-32 pl-3 sm:pl-10 lg:pl-12 shrink-0 flex items-center justify-center">
 {rank !== undefined && rank !== null ? (
 <div className="scale-100 sm:scale-125 lg:scale-150 origin-center flex items-center justify-center">
 <ASRRankBadge rank={rank} />
 </div>
 ) : mapUrl ? (
 <a
 href={mapUrl.startsWith('http') ? mapUrl : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapUrl)}`}
 target="_blank"
 rel="noopener noreferrer"
 onClick={(e) => e.stopPropagation()}
 className={cn(
   "w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all active:scale-90 text-zinc-500 hover:text-blue-500 flex items-center justify-center shrink-0",
   theme === "dark" ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.05]",
 )}
 title="Open in Google Maps"
 >
 <MapPin
 className="w-5 h-5"
 strokeWidth={2.25}
 />
 </a>
 ) : (
 <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" aria-hidden="true" />
 )}
 </div>
 <div className="flex-1 flex min-w-0 h-full items-center">
 <div className="flex-1 flex flex-col min-w-0 pr-2 pl-2 sm:pl-8 lg:pl-10 text-left">
 <div
 className={cn(
 "flex items-center text-[11px] sm:text-[18px] lg:text-[24px] font-black uppercase leading-tight transition-colors max-w-full",
 isUnclaimed
 ? theme === "dark"
 ? "text-zinc-300"
 : "text-zinc-600"
 : theme === "dark"
 ? "text-zinc-100"
 : "text-zinc-900",
 )}
 >
 <div className="truncate shrink">
 {flag && (
 <span className="mr-2 shrink-0">
 {formatFlagsWithSpace(flag)}
 </span>
 )}
 {title}
 </div>
 {badgeContent && (
 <div className="flex items-center gap-1.5 ml-2 shrink-0 scale-75 sm:scale-100 origin-left">
 {badgeContent}
 </div>
 )}
 </div>
 <div
 className={cn(
 "text-[9px] sm:text-[13px] lg:text-[16px] font-black uppercase block truncate mt-0.5 sm:mt-1 lg:mt-1 max-w-full",
 isUnclaimed
 ? theme === "dark"
 ? "text-zinc-600"
 : "text-zinc-400"
 : theme === "dark"
 ? "opacity-60 text-white"
 : "opacity-80 text-zinc-600",
 )}
 >
 {subtitle}
 </div>
 </div>
 {(stats || []).map((s: { value?: React.ReactNode; subValue?: React.ReactNode; valueClassName?: string }, idx: number) => {
 const colDef = columns?.filter(
 (c: { isRank?: boolean; type?: string }) => !c.isRank && c.type !== "profile",
 )[idx];
 return (
 <div
 key={idx}
 className={`${(colDef as any)?.width || "w-20 sm:w-24 lg:w-32"} px-1 sm:px-4 lg:px-6 flex items-center justify-end text-right shrink-0 h-full`}
 >
 <span
 className={cn(
 THEME.VALUE, "tabular-nums",
 "text-right transition-colors",
 idx === 0
 ? cn(
 "text-sm sm:text-[24px] lg:text-[32px] tracking-tight",
 s.value !== undefined && s.value !== null && s.value !== ""
 ? cn(accentColor, "")
 : "opacity-20",
 )
 : cn(
 "text-[10px] sm:text-[15px] lg:text-[19px] font-bold transition-colors",
 theme === "dark"
 ? "text-white/60"
 : "text-zinc-500",
 ),
 s.valueClassName,
 )}
 >
 {s.subValue !== undefined && s.subValue !== null ? (
   <div className="flex flex-col items-end leading-none justify-center">
     <span>{s.value ?? "--"}</span>
     <span className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1 sm:mt-1.5">
       {s.subValue}
     </span>
   </div>
 ) : (
   s.value ?? "--"
 )}
 </span>
 </div>
 );
 })}
 </div>
 {showVideoIcon && (
 <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 mr-4 sm:mr-6 lg:mr-8 ml-2">
 {videoUrl ? (
 <button
 type="button"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 trackEvent("outbound_click", {
 link_url: videoUrl,
 link_type: "video",
 });
 setPlayingVideoUrl(videoUrl);
 }}
 className={cn(
   "w-full h-full rounded-full transition-all active:scale-90 text-zinc-500 hover:text-blue-500 flex items-center justify-center",
   theme === "dark" ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.05]",
 )}
 title="Watch Video"
 >
 <Play
 className="w-[18px] h-[18px] sm:w-5 sm:h-5"
 strokeWidth={2.5}
 />
 </button>
 ) : null}
 </div>
 )}
 </ItemWrapper>
 );
 }

 return (
 <ItemWrapper
 onClick={isUnclaimed ? undefined : onClick}
 role={onClick && !isUnclaimed ? "button" : undefined} 
 onPointerEnter={(e: React.PointerEvent) => {
   if (e.pointerType === "mouse" && onHover) onHover(true);
 }}
 onPointerLeave={(e: React.PointerEvent) => {
   if (e.pointerType === "mouse" && onHover) onHover(false);
 }}
 tabIndex={onClick && !isUnclaimed ? 0 : undefined}
 onKeyDown={(e) => {
 if (onClick && !isUnclaimed && (e.key === "Enter" || e.key === " ")) {
 e.preventDefault();
 onClick(e);
 }
 }}
 className={cn(
 "group flex items-center justify-between transition-all duration-300 ios-clip-fix outline-none text-left w-full",
 isCompact
 ? cn("py-3 pl-3 rounded-[1.25rem] border h-auto min-h-[66px]", showVideoIcon ? "pr-3" : "pr-3.5")
 : cn(
     "py-3 sm:py-5 lg:py-6 pl-3 sm:pl-6 lg:pl-8 rounded-[1.25rem] sm:rounded-[1.5rem] lg:rounded-[2rem] border h-auto min-h-[64px] sm:min-h-[80px] lg:min-h-[100px]",
     showVideoIcon ? "pr-3 sm:pr-5" : "pr-3.5 sm:pr-6",
   ),
 onClick && !isUnclaimed
 ? `cursor-pointer active:scale-95 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 ${"theme-focus"} ${cardHover}`
 : "cursor-default",
 isUnclaimed
 ? cn(
 "border-dashed bg-transparent",
 theme === "dark" ? "border-white/10" : "border-black/10",
 )
 : THEME.CARD(theme),
 getHighlightClass(),
 shouldFade ? "opacity-40 grayscale" : "opacity-100",
 )}
 >
 <div
 className={cn(
 "flex items-center min-w-0 pr-2 sm:pr-3 flex-1",
 isCompact ? "gap-2.5 sm:gap-3" : "gap-3 sm:gap-4 lg:gap-6",
 )}
 >
 {icon ? (
 <div className="p-0 rounded-xl transition-colors shrink-0">
 {icon}
 </div>
 ) : (
 <div
 className={cn(
 "shrink-0 flex items-center justify-center",
 isCompact ? "w-8 sm:w-9" : "w-8 sm:w-10 lg:w-12",
 )}
 >
 {rank !== undefined && rank !== null ? (
 <div className="scale-100 sm:scale-125 lg:scale-150 origin-center flex items-center justify-center">
 <ASRRankBadge rank={rank} />
 </div>
 ) : mapUrl ? (
 <a
 href={mapUrl.startsWith('http') ? mapUrl : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapUrl)}`}
 target="_blank"
 rel="noopener noreferrer"
 onClick={(e) => e.stopPropagation()}
 className={cn(
   "rounded-full transition-all active:scale-90 text-zinc-500 hover:text-blue-500 flex items-center justify-center shrink-0",
   theme === "dark" ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.05]",
   isCompact ? "w-8 h-8 sm:w-9 sm:h-9" : "w-9 h-9 sm:w-10 sm:h-10",
 )}
 title="Open in Google Maps"
 >
 <MapPin
 className={cn(isCompact ? "w-[18px] h-[18px]" : "w-5 h-5 sm:w-6 sm:h-6")}
 strokeWidth={2.25}
 />
 </a>
 ) : (
 <div
 className={cn("shrink-0", isCompact ? "w-8 h-8 sm:w-9 sm:h-9" : "w-9 h-9 sm:w-10 sm:h-10")}
 aria-hidden="true"
 />
 )}
 </div>
 )}
 <div className="flex flex-col justify-center min-w-0 flex-1 text-left">
 <div
 className={cn(
 "flex items-start min-w-0 font-black uppercase leading-tight transition-colors",
 isCompact ? "text-[13px] sm:text-[14px] gap-1.5" : "text-[14px] sm:text-[18px] lg:text-[22px] gap-1.5 sm:gap-2",
 isUnclaimed
 ? theme === "dark"
 ? "text-zinc-300"
 : "text-zinc-600"
 : theme === "dark"
 ? "text-zinc-100"
 : "text-zinc-900",
 )}
 >
 {flag && (
 <span className="shrink-0 leading-tight select-none">
 {formatFlagsWithSpace(flag)}
 </span>
 )}
 <span className="line-clamp-2 min-w-0 break-words leading-tight">
 {title}
 </span>
 {badgeContent && (
 <div className="flex items-center gap-1 shrink-0 ml-1 scale-[0.65] origin-left self-center">
 {badgeContent}
 </div>
 )}
 </div>
 {subtitle !== undefined && subtitle !== null && subtitle !== false && (
 <div className="flex flex-col mt-1">
 <div
 className={cn(
 "font-black uppercase whitespace-normal break-words line-clamp-2 leading-tight",
 isCompact ? "text-[11px] sm:text-[12px]" : "text-[12px] sm:text-[14px] lg:text-[16px]",
 isUnclaimed
 ? theme === "dark"
 ? "text-zinc-600"
 : "text-zinc-400"
 : theme === "dark"
 ? "opacity-60 text-white"
 : "opacity-80 text-zinc-600",
 )}
 >
 {subtitle}
 </div>
 </div>
 )}
 </div>
 </div>
 <div className="flex items-center pr-0 shrink-0 h-full">
 <div className={cn("flex items-center justify-end text-right h-full", isCompact ? "gap-2" : "gap-2 sm:gap-4")}>
 {(stats || []).map((s: { value?: React.ReactNode; subValue?: React.ReactNode; valueClassName?: string }, idx: number) => {
   const colDef = columns?.filter(
     (c: { isRank?: boolean; type?: string }) => !c.isRank && c.type !== "profile",
   )[idx];
   return (
   <div key={idx} className={cn("flex flex-col items-end justify-center h-full shrink-0", (colDef as any)?.width || (isCompact ? "min-w-[54px]" : "min-w-[54px] sm:min-w-[80px] lg:min-w-[120px]"))}>
 <span
 className={cn(
 THEME.VALUE, "tabular-nums",
 "text-right transition-colors",
 idx === 0
 ? cn(
 isCompact ? "text-[15px] sm:text-[16px]" : "text-[16px] sm:text-[24px] lg:text-[28px] tracking-tight",
 s.value !== undefined && s.value !== null && s.value !== ""
 ? cn(accentColor, "")
 : "opacity-20",
 )
 : theme === "dark"
 ? cn(
 "text-white/50",
 isCompact ? "text-[12px] sm:text-[13px] font-bold" : "text-[12px] sm:text-[14px] lg:text-[18px] font-bold",
 )
 : cn(
 "text-zinc-500",
 isCompact ? "text-[12px] sm:text-[13px] font-bold" : "text-[12px] sm:text-[14px] lg:text-[18px] font-bold",
 ),
 s.valueClassName,
 )}
 >
 {s.subValue !== undefined && s.subValue !== null ? (
   <div className="flex flex-col items-end leading-none justify-center">
     <span>{s.value ?? "--"}</span>
     <span className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1 sm:mt-1.5">
       {s.subValue}
     </span>
   </div>
 ) : (
   s.value ?? "--"
 )}
 </span>
 </div>
 );
})}
 </div>
 {showVideoIcon && (
 <div
 className={cn(
 "flex items-center justify-center shrink-0",
 isCompact ? "w-8 h-8 sm:w-9 sm:h-9 ml-2 sm:ml-2.5" : "w-10 h-10 sm:w-11 sm:h-11 ml-2 sm:ml-3",
 )}
 >
 {videoUrl ? (
 <button
 type="button"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 trackEvent("outbound_click", {
 link_url: videoUrl,
 link_type: "video",
 });
 setPlayingVideoUrl(videoUrl);
 }}
 className={cn(
   "w-full h-full rounded-full transition-all active:scale-90 text-zinc-500 hover:text-blue-500 flex items-center justify-center",
   theme === "dark" ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.05]",
 )}
 title="Watch Video"
 >
 <Play
 className={cn(isCompact ? "w-[18px] h-[18px]" : "w-5 h-5")}
 strokeWidth={2.5}
 />
 </button>
 ) : null}
 </div>
 )}
 </div>
 </ItemWrapper>
 );
 },
 (prev: any, next: any) => {
 if (prev.rank !== next.rank) return false;
 if (prev.title !== next.title) return false;
 if (prev.subtitle !== next.subtitle) return false;
 if (prev.variant !== next.variant) return false;
 if (prev.isCompact !== next.isCompact) return false;
 if (prev.videoUrl !== next.videoUrl) return false;
 if (prev.flag !== next.flag) return false;
 if (prev.shouldFade !== next.shouldFade) return false;
 if (prev.isUnclaimed !== next.isUnclaimed) return false;
 if (prev.showVideoIcon !== next.showVideoIcon) return false;
 if (prev.mapUrl !== next.mapUrl) return false;
 if (prev.icon !== next.icon) return false;
 if (prev.badgeContent !== next.badgeContent) return false;
 if (prev.isHighlighted !== next.isHighlighted) return false;
 if (prev.onClick !== next.onClick) return false;
 if (prev.onHover !== next.onHover) return false;
 if (prev.columns !== next.columns) return false;

 // Check array lengths
 if (prev.stats?.length !== next.stats?.length) return false;

 // Check specific stats recursively rather than shallow checking the new stats array
 for (let i = 0; i < (prev.stats?.length || 0); i++) {
 if (prev.stats[i]?.value !== next.stats[i]?.value) return false;
 if (prev.stats[i]?.subValue !== next.stats[i]?.subValue) return false;
 if (prev.stats[i]?.valueClassName !== next.stats[i]?.valueClassName) return false;
 if (prev.stats[i]?.label !== next.stats[i]?.label) return false;
 }

 return true;
 },
);
