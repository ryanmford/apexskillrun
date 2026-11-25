import React, { useRef, useEffect, useState, useLayoutEffect, useMemo, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo, type AnimationPlaybackControls } from "motion/react";

function useWindowSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));
  useLayoutEffect(() => {
    const handleResize = () => {
      setSize(prev =>
        prev.width === window.innerWidth && prev.height === window.innerHeight
          ? prev
          : { width: window.innerWidth, height: window.innerHeight }
      );
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  return size;
}

interface BottomSheetProps {
  children: React.ReactNode;
  snapPoints: number[]; // e.g., [0, 0.2, 0.5, 0.85] of window height
  initialSnap?: number;
  activeSnap?: number | null;
  onSnapChange?: (snap: number) => void;
  resetSignal?: number;
}

const OFFSCREEN_BUFFER_PX = 48;

export const ASRBottomSheet: React.FC<BottomSheetProps> = ({
  children,
  snapPoints,
  initialSnap = snapPoints[0],
  activeSnap,
  onSnapChange,
  resetSignal = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animControlsRef = useRef<AnimationPlaybackControls | null>(null);
  const dragStartSnapIndexRef = useRef<number>(0);
  const skipEffectSnapRef = useRef<number | null>(null);
  const prevResetSignalRef = useRef<number>(resetSignal);
  const prevHeightRef = useRef<number>(0);

  const { height } = useWindowSize();
  const H = height || (typeof window !== "undefined" ? window.innerHeight : 800);

  const sortedSnaps = useMemo(() => [...snapPoints].sort((a, b) => a - b), [snapPoints]);
  const minSnap = sortedSnaps[0] ?? 0;
  const maxSnap = sortedSnaps[sortedSnaps.length - 1] ?? 0.85;

  const getLogicalY = useCallback((p: number) => H * (1 - p), [H]);
  const getVisualY = useCallback(
    (p: number) => (p <= 0 ? H + OFFSCREEN_BUFFER_PX : H * (1 - p)),
    [H],
  );

  const y = useMotionValue(getVisualY(initialSnap));

  const bgOpacity = useTransform(y, [H * 0.12, H * 0.78], [0.4, 0], { clamp: true });
  const bgDisplay = useTransform(bgOpacity, (v) => (v <= 0.005 ? "none" : "block"));

  // Fade out completely once top edge passes viewport bottom so box-shadow never peeks
  const sheetOpacity = useTransform(y, [H - 8, H + 32], [1, 0], { clamp: true });

  // Flatten border radius near the highest snap point to seal off "little holes" (only if it hits the top notch)
  const highestY = getVisualY(maxSnap);
  const borderRadius = useTransform(y, [highestY, highestY + 40], [maxSnap >= 0.95 ? 0 : 32, 32], { clamp: true });

  const isHidden =
    minSnap <= 0 &&
    activeSnap !== undefined &&
    activeSnap !== null &&
    activeSnap <= 0;

  // Stop any running animation on unmount
  useEffect(() => {
    return () => {
      animControlsRef.current?.stop();
    };
  }, []);

  // Sync external activeSnap control and explicit resetSignal triggers
  useEffect(() => {
    const isResetTriggered = resetSignal !== prevResetSignalRef.current;
    const isHeightChanged = prevHeightRef.current !== 0 && prevHeightRef.current !== H;
    prevResetSignalRef.current = resetSignal;
    prevHeightRef.current = H;

    if (activeSnap !== undefined && activeSnap !== null && H > 0) {
      if (!isResetTriggered && !isHeightChanged && skipEffectSnapRef.current === activeSnap) {
        skipEffectSnapRef.current = null;
        return;
      }
      skipEffectSnapRef.current = null;

      animControlsRef.current?.stop();
      if (isHeightChanged && !isResetTriggered) {
        y.set(getVisualY(activeSnap));
      } else {
        animControlsRef.current = animate(y, getVisualY(activeSnap), {
          type: "spring",
          stiffness: 420,
          damping: 38,
          mass: 0.8,
        });
      }
    }
  }, [activeSnap, H, resetSignal, getVisualY, y]);

  const handleDragStart = () => {
    animControlsRef.current?.stop();
    const currentY = y.get();
    let startIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < sortedSnaps.length; i++) {
      const dist = Math.abs(currentY - getLogicalY(sortedSnaps[i]));
      if (dist < minDist) {
        minDist = dist;
        startIdx = i;
      }
    }
    dragStartSnapIndexRef.current = startIdx;
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentY = y.get();
    const velocity = info.velocity.y;

    // Predict where the sheet would land based on current velocity
    const predictedY = currentY + velocity * 0.22;

    // Find closest snap point using logical Y so dismiss (0) isn't biased by offscreen buffer
    let closestIndex = 0;
    let minDistance = Math.abs(predictedY - getLogicalY(sortedSnaps[0]));

    for (let i = 1; i < sortedSnaps.length; i++) {
      const distance = Math.abs(predictedY - getLogicalY(sortedSnaps[i]));
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    // Crisp short flick support (Google Maps style): step one snap in flick direction
    const startIdx = dragStartSnapIndexRef.current;
    if (closestIndex === startIdx) {
      if (velocity > 280 && info.offset.y > 15) {
        closestIndex = Math.max(0, startIdx - 1);
      } else if (velocity < -280 && info.offset.y < -15) {
        closestIndex = Math.min(sortedSnaps.length - 1, startIdx + 1);
      }
    }

    const targetSnap = sortedSnaps[closestIndex];
    const targetY = getVisualY(targetSnap);

    animControlsRef.current?.stop();
    animControlsRef.current = animate(y, targetY, {
      type: "spring",
      stiffness: 420,
      damping: 38,
      mass: 0.8,
      velocity,
    });

    if (onSnapChange) {
      if (targetSnap !== activeSnap) {
        skipEffectSnapRef.current = targetSnap;
      }
      onSnapChange(targetSnap);
    }
  };

  return (
    <>
      {/* Optional backdrop: removed from compositor when fully transparent at resting snap */}
      <motion.div
        className="fixed inset-0 z-40 pointer-events-none backdrop-blur-[2px]"
        style={{ opacity: bgOpacity, display: bgDisplay, backgroundColor: "rgba(0,0,0,0.3)" }}
      />

      <motion.div
        ref={containerRef}
        aria-hidden={isHidden}
        className={`fixed left-0 right-0 bottom-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-black/10 dark:border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden ${
          isHidden ? "pointer-events-none" : "pointer-events-auto"
        }`}
        style={{
          y,
          opacity: sheetOpacity,
          height: H, // sheet is full height but pushed down via Y
          borderTopLeftRadius: borderRadius,
          borderTopRightRadius: borderRadius,
        }}
        drag="y"
        dragConstraints={{ top: getVisualY(maxSnap), bottom: getVisualY(minSnap) }}
        dragElastic={0.05}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        dragMomentum={false}
      >
        <div className="w-full flex justify-center py-3 shrink-0 touch-none cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-black/15 dark:bg-white/15 shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />
        </div>

        <div
          className="flex-1 w-full overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom)]"
          onPointerDown={(e) => {
            // When fully expanded, let scrollable list content scroll natively and inputs focus cleanly,
            // while keeping the drag handle and non-scrollable header draggable to pull the sheet down.
            if (activeSnap !== undefined && activeSnap !== null && activeSnap >= 0.8) {
              const target = e.target as HTMLElement | null;
              if (target?.closest("[data-sheet-scrollable='true'], input, textarea, select")) {
                e.stopPropagation();
              }
            }
          }}
        >
          {children}
        </div>
      </motion.div>
    </>
  );
};
