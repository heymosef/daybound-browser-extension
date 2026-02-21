import React, {
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import {
  addHours,
  format,
  getMinutes,
  startOfHour,
  getDay,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "motion/react";
import { MorphingTime } from "./MorphingTime";

interface TimelineProps {
  now: Date;
  timezone: string;
  isHome?: boolean;
  homeTimezone?: string;
  className?: string;
  use24Hour?: boolean;
  hoveredHourIndex?: number | null;
  onHoverHour?: (index: number | null) => void;
  isLive: boolean;
  selectedDateOffset: number;
  showWeekends?: boolean;
}

const TOTAL_HOURS = 25; // always 25 cells
const CENTER_INDEX = 12; // index of the "current hour" cell (live mode)
const LABEL_PAD = 0; // px – clamping offset from the container edge

// ── Shared easing curves (Tip 4: different easing for enter vs exit) ──
const EASE_OUT: [number, number, number, number] = [
  0, 0, 0.2, 1,
]; // decelerate – for entrances
const EASE_IN: [number, number, number, number] = [
  0.4, 0, 1, 1,
]; // accelerate – for exits

export const Timeline: React.FC<TimelineProps> = ({
  now,
  timezone,
  isHome,
  homeTimezone,
  className,
  use24Hour,
  hoveredHourIndex,
  onHoverHour,
  isLive,
  selectedDateOffset,
  showWeekends,
}) => {
  // ── Refs & measurement ──
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ outer: 0, inner: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      if (outerRef.current && innerRef.current) {
        setDims({
          outer: outerRef.current.offsetWidth,
          inner: innerRef.current.scrollWidth,
        });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outerRef.current) ro.observe(outerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Glide animation: track date changes for motion wrapper ──
  const prevOffsetRef = useRef(selectedDateOffset);
  const slideDirectionRef = useRef(0);
  const [glideCount, setGlideCount] = useState(0);
  const changeTypeRef = useRef<"date" | "format">("date");

  useLayoutEffect(() => {
    if (prevOffsetRef.current !== selectedDateOffset) {
      changeTypeRef.current = "date";
      slideDirectionRef.current =
        selectedDateOffset > prevOffsetRef.current ? 1 : -1;
      prevOffsetRef.current = selectedDateOffset;
      setGlideCount((c) => c + 1);
    }
  }, [selectedDateOffset]);

  // ── Format animation: track 12H/24H changes ──
  const prevFormatRef = useRef(use24Hour);
  const [formatCount, setFormatCount] = useState(0);
  const formatDirRef = useRef(1); // 1 = down (to 24hr), -1 = up (to 12hr)

  useLayoutEffect(() => {
    if (prevFormatRef.current !== use24Hour) {
      changeTypeRef.current = "format";
      formatDirRef.current = use24Hour ? 1 : -1;
      prevFormatRef.current = use24Hour;
      setFormatCount((c) => c + 1);
    }
  }, [use24Hour]);

  const currentMinutes = getMinutes(now);

  // ── Build the hour array ──
  const anchor = startOfHour(now);

  // Live mode: ±12h centred on current hour
  // Day-view mode: 25 hours starting from midnight (now is already midnight)
  const hours = isLive
    ? Array.from({ length: TOTAL_HOURS }, (_, i) =>
        addHours(anchor, i - CENTER_INDEX),
      )
    : Array.from({ length: TOTAL_HOURS }, (_, i) =>
        addHours(anchor, i),
      );

  // ── Rail positioning ──
  const nowFractionPercent = isLive
    ? ((CENTER_INDEX + currentMinutes / 60) / TOTAL_HOURS) * 100
    : 0;

  const railLeft = isLive ? "50%" : "0%";
  const railTransform = isLive
    ? `translateX(-${nowFractionPercent}%)`
    : "translateX(0%)";

  // ── Marker (overlay at container level, live mode only) ──
  // In live mode the rail is centred on "now", so the marker is always
  // at the horizontal centre of the container.
  const markerLeftPx = dims.outer / 2;

  // Freeze the marker time string so it doesn't flash "12:00 AM" during exit
  const markerTimeDisplayRef = useRef("");
  if (isLive) {
    markerTimeDisplayRef.current = format(
      toZonedTime(now, timezone),
      use24Hour ? "H:mm" : "h:mm a",
    );
  }

  // ── Floating date labels ──
  type DateBoundary = {
    index: number;
    label: string;
    key: string;
  };
  const dateBoundaries: DateBoundary[] = [];
  let prevDateKey = "";
  for (let i = 0; i < hours.length; i++) {
    const local = toZonedTime(hours[i], timezone);
    const key = format(local, "yyyy-MM-dd");
    if (key !== prevDateKey) {
      dateBoundaries.push({
        index: i,
        label: format(local, "EEE, MMM d"),
        key,
      });
      prevDateKey = key;
    }
  }

  const cellWidth =
    dims.inner > 0 ? dims.inner / TOTAL_HOURS : 0;

  const railOffset = isLive
    ? dims.outer / 2 -
      ((CENTER_INDEX + currentMinutes / 60) / TOTAL_HOURS) *
        dims.inner
    : 0;

  const LABEL_WIDTH_ESTIMATE = 80;

  const floatingLabels = dateBoundaries.map((b, idx) => {
    const nextIdx =
      idx + 1 < dateBoundaries.length
        ? dateBoundaries[idx + 1].index
        : TOTAL_HOURS;

    const naturalX = railOffset + b.index * cellWidth;
    const lastCellRight = railOffset + nextIdx * cellWidth;

    const isVisible =
      lastCellRight > 0 && naturalX < dims.outer;
    const x = Math.max(LABEL_PAD, naturalX);

    return { ...b, x, isVisible };
  });

  for (let i = 0; i < floatingLabels.length - 1; i++) {
    const curr = floatingLabels[i];
    const next = floatingLabels[i + 1];
    if (
      curr.isVisible &&
      next.isVisible &&
      next.x - curr.x < LABEL_WIDTH_ESTIMATE
    ) {
      curr.isVisible = false;
    }
  }

  return (
    <div
      ref={outerRef}
      className={twMerge(
        "overflow-hidden w-full h-full relative select-none cursor-default",
        className,
      )}
    >
      {/* ── Floating date labels (overlay layer) ── */}
      {dims.outer > 0 &&
        floatingLabels.map(
          (fl) =>
            fl.isVisible && (
              <motion.div
                key={`${fl.key}-${glideCount}`}
                initial={
                  glideCount > 0
                    ? {
                        opacity: 0,
                        x: slideDirectionRef.current * 15,
                      }
                    : false
                }
                animate={{
                  opacity:
                    isLive &&
                    fl.x > dims.outer / 2 - 120 &&
                    fl.x < dims.outer / 2 + 50
                      ? 0
                      : 1,
                  x: 0,
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="absolute top-[0.5em] z-30 text-[clamp(10px,0.5vw+8px,12px)] tracking-wider whitespace-nowrap text-[var(--dt-text)] pointer-events-none px-[0.5em] py-[0.125em] rounded-full bg-[var(--dt-bg)]/90 backdrop-blur-sm border border-[var(--dt-border)] ml-[8px] mr-[0px] my-[0px]"
                style={{ left: fl.x }}
              >
                {fl.label}
              </motion.div>
            ),
        )}

      {/* ── Current-time marker (overlay, fades in/out) ── */}
      {/* Tip 2: exit faster than enter; Tip 4: ease-out enter, ease-in exit */}
      <AnimatePresence>
        {isLive && dims.outer > 0 && (
          <motion.div
            key="current-marker"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { duration: 0.35, ease: EASE_OUT },
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.2, ease: EASE_IN },
            }}
            className="absolute top-0 bottom-0 z-20 pointer-events-none"
            style={{ left: markerLeftPx }}
          >
            {/* Vertical line */}
            <div className="absolute top-0 bottom-0 w-px bg-[var(--dt-accent)]" />
            {/* Time pill */}
            <div className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none mt-[0.25em]">
              <div className="relative">
                {/* Invisible sizer: always renders the CURRENT format to hold width */}
                <div
                  aria-hidden
                  className="bg-[var(--dt-accent)] text-[var(--dt-text-inverse)] text-[clamp(10px,0.5vw+8px,12px)] font-medium px-[0.375em] py-[0.125em] rounded whitespace-nowrap leading-none invisible"
                >
                  {markerTimeDisplayRef.current}
                </div>
                {/* Crossfade layer — Tip 2: faster exit; Tip 4: asymmetric easing */}
                <AnimatePresence initial={false}>
                  <motion.div
                    key={use24Hour ? "24h" : "12h"}
                    initial={{
                      opacity: 0,
                      y: formatDirRef.current * -6,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: 0.3,
                        ease: EASE_OUT,
                      },
                    }}
                    exit={{
                      opacity: 0,
                      y: formatDirRef.current * 6,
                      transition: {
                        duration: 0.18,
                        ease: EASE_IN,
                      },
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-[var(--dt-accent)] dark:bg-[color-mix(in_oklch,var(--dt-accent),black_30%)] text-[var(--dt-text-inverse)] text-[clamp(10px,0.5vw+8px,12px)] font-medium px-[0.375em] py-[0.125em] rounded whitespace-nowrap leading-none"
                  >
                    <MorphingTime>{markerTimeDisplayRef.current}</MorphingTime>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inner rail ── */}
      <div
        ref={innerRef}
        className="flex h-full absolute top-0"
        style={{
          left: railLeft,
          transform: railTransform,
          minWidth: "105%",
        }}
      >
        {/* Motion wrapper: re-mounts on date or format change */}
        <motion.div
          key={`${glideCount}-${formatCount}`}
          initial={
            glideCount > 0 || formatCount > 0
              ? changeTypeRef.current === "date"
                ? {
                    opacity: 0.3,
                    x: slideDirectionRef.current * 25,
                    filter: "blur(0px)",
                  }
                : {
                    opacity: 0,
                    y: formatDirRef.current * -6,
                    filter: "blur(4px)",
                  }
              : false
          }
          animate={{
            opacity: 1,
            x: 0,
            y: 0,
            filter: "blur(0px)",
          }}
          transition={
            changeTypeRef.current === "date"
              ? { duration: 0.45, ease: [0.4, 0, 0.2, 1] }
              : { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
          }
          className="flex h-full w-full"
        >
          {hours.map((time, index) => {
            const localTime = toZonedTime(time, timezone);
            const isCurrentHour =
              isLive && index === CENTER_INDEX;
            const isHovered = hoveredHourIndex === index;
            const hour = parseInt(format(localTime, "H"));

            const isNight = hour < 7 || hour >= 19;
            const isMidnight = hour === 0;

            const isWeekend =
              showWeekends &&
              (getDay(localTime) === 0 ||
                getDay(localTime) === 6);

            return (
              <div
                key={index}
                onMouseEnter={() => onHoverHour?.(index)}
                onMouseLeave={() => onHoverHour?.(null)}
                style={{
                  background: isHovered
                    ? "var(--dt-surface-highlight)"
                    : isNight
                      ? "var(--dt-night)"
                      : "var(--dt-bg)",
                }}
                className={clsx(
                  "relative grow shrink-0 basis-0 min-w-[3.25em] md:min-w-[1.75em]",
                  "flex flex-col items-center justify-center",
                  "pb-[0.25em] pt-[0.5em] group/hour",
                  "border-l border-transparent transition-colors duration-75",
                )}
              >
                {/* Top Tick */}
                <div
                  className={clsx(
                    "absolute top-0 left-0 right-0 h-[0.25em] border-l",
                    isMidnight && !(!isLive && index === 0)
                      ? "border-[var(--dt-midnight-border)] h-[0.5em]"
                      : isMidnight && !isLive && index === 0
                        ? "border-transparent h-[0.5em]"
                        : "border-[var(--dt-tick)]",
                  )}
                />

                {/* Midnight Divider */}
                {isMidnight && (
                  <div
                    className={clsx(
                      "absolute top-0 bottom-0 left-0 w-px bg-[var(--dt-midnight-line)] z-10",
                      !isLive && index === 0 && "hidden",
                    )}
                  />
                )}

                {/* Hour Label */}
                <div className="flex flex-col items-center z-0 gap-[0.125em]">
                  <span
                    className={clsx(
                      "text-[clamp(13px,0.78vw+5px,16.25px)] font-medium leading-none",
                      isCurrentHour
                        ? "text-[var(--dt-accent)] font-bold"
                        : "text-[var(--dt-hour-text)]",
                      isMidnight &&
                        !isCurrentHour &&
                        "text-[var(--dt-hour-midnight)]",
                    )}
                  >
                    {use24Hour
                      ? format(localTime, "H")
                      : format(localTime, "h")}
                  </span>
                  {!use24Hour && (
                    <span
                      className={clsx(
                        "text-[clamp(10px,0.5vw+8px,12px)] leading-none",
                        isCurrentHour
                          ? "text-[var(--dt-accent-80)]"
                          : "text-[var(--dt-text-secondary)]",
                      )}
                    >
                      {format(localTime, "a").toLowerCase()}
                    </span>
                  )}
                </div>

                {/* Weekend indicator — thin bottom stripe */}
                {isWeekend && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--dt-accent)] opacity-40" />
                )}
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};