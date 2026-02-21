import React, { useState, useRef } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { X, Home, ArrowUp, ArrowDown } from "lucide-react";
import {
  TimezoneConfig,
  getCityName,
  getRegionName,
  getAbbreviation,
  getCountryFromTimezone,
} from "../../utils/timezoneUtils";
import { Timeline } from "./Timeline";
import { motion, AnimatePresence } from "motion/react";
import { MorphingTime } from "./MorphingTime";

// ── Shared easing curves (Tip 4: different easing for enter vs exit) ──
const EASE_OUT: [number, number, number, number] = [
  0, 0, 0.2, 1,
]; // decelerate – for entrances
const EASE_IN: [number, number, number, number] = [
  0.4, 0, 1, 1,
]; // accelerate – for exits

interface TimezoneRowProps {
  config: TimezoneConfig;
  now: Date;
  timelineTime: Date;
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onSetHome: (id: string) => void;
  isHome?: boolean;
  homeTimezone?: string;
  isFirst?: boolean;
  isLast?: boolean;
  use24Hour: boolean;
  showBadge: boolean;
  showWeekends: boolean;
  hoveredHourIndex: number | null;
  onHoverHour: (index: number | null) => void;
  isLive: boolean;
  selectedDateOffset: number;
}

export const TimezoneRow: React.FC<TimezoneRowProps> = ({
  config,
  now,
  timelineTime,
  onRemove,
  onRename,
  onMove,
  onSetHome,
  isHome,
  homeTimezone,
  isFirst,
  isLast,
  use24Hour,
  showBadge,
  showWeekends,
  hoveredHourIndex,
  onHoverHour,
  isLive,
  selectedDateOffset,
}) => {
  const { timezone, label } = config;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(
    label || getCityName(timezone),
  );

  // Track format direction for animation: 1 = down (to 24hr), -1 = up (to 12hr)
  const formatDirRef = useRef(1);
  const prevUse24HourRef = useRef(use24Hour);
  if (prevUse24HourRef.current !== use24Hour) {
    formatDirRef.current = use24Hour ? 1 : -1;
    prevUse24HourRef.current = use24Hour;
  }

  // Calculate local time for display
  const localTime = toZonedTime(now, timezone);

  // Get formatted strings
  const dateString = format(localTime, "EEE, MMM d");
  const abbreviation = getAbbreviation(now, timezone);

  const cityName = label || getCityName(timezone);
  const regionName = getRegionName(timezone);
  const countryName = getCountryFromTimezone(timezone);

  const handleSaveRename = () => {
    if (editName.trim()) {
      onRename(config.id, editName.trim());
    } else {
      setEditName(cityName); // Revert if empty
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveRename();
    if (e.key === "Escape") {
      setEditName(cityName);
      setIsEditing(false);
    }
  };

  return (
    <div className="group relative grid grid-cols-[1fr_auto_auto] md:grid-cols-[18em_8em_1fr] items-center bg-[var(--dt-bg)] hover:bg-[var(--dt-bg-hover)] transition-colors border-b border-[var(--dt-border)] last:border-0 py-4 md:py-0 md:h-[clamp(4.5em,8vh,6em)]">
      
      {/* ── 1. Left Info Section (City, Country, Controls) ── */}
      <div className="col-span-1 md:col-span-1 flex items-center pl-2 pr-2 gap-[0.75em]">
        {/* Controls */}
        <div className="flex flex-col gap-[0.125em] w-[1.25em] items-center justify-center">
          {isHome ? (
            <Home
              className="text-[var(--dt-text-muted)] w-[1em] h-[1em]"
            />
          ) : (
            <>
              <button
                onClick={() => onRemove(config.id)}
                className="md:hidden text-[var(--dt-text-muted)] hover:text-red-600 transition-colors p-0.5"
                title="Remove timezone"
              >
                <X className="w-[1em] h-[1em]" />
              </button>
              <div className="hidden md:flex opacity-0 group-hover:opacity-100 flex-col gap-[0.125em] transition-opacity">
                {!isFirst && (
                  <button
                    onClick={() => onMove(config.id, "up")}
                    className="text-[var(--dt-text-muted)] hover:text-[var(--dt-text-secondary)] p-0.5 rounded hover:bg-[var(--dt-surface-raised)]"
                  >
                    <ArrowUp className="w-[1em] h-[1em]" />
                  </button>
                )}
                {!isLast && (
                  <button
                    onClick={() => onMove(config.id, "down")}
                    className="text-[var(--dt-text-muted)] hover:text-[var(--dt-text-secondary)] p-0.5 rounded hover:bg-[var(--dt-surface-raised)]"
                  >
                    <ArrowDown className="w-[1em] h-[1em]" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[0.5em] h-[1.5em]">
            {isEditing ? (
              <div className="flex items-center w-full">
                <input
                  autoFocus
                  className="w-full text-[clamp(15px,0.84vw+6px,18px)] font-medium text-[var(--dt-text)] bg-transparent border-b border-[var(--dt-accent)] focus:outline-none p-0 leading-tight"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSaveRename}
                  onKeyDown={handleKeyDown}
                />
              </div>
            ) : (
              <div
                className="flex items-center gap-[0.5em] cursor-pointer group/name"
                onClick={() => {
                  setEditName(cityName);
                  setIsEditing(true);
                }}
              >
                <span
                  className={`text-[clamp(15px,0.84vw+6px,18px)] font-medium truncate transition-colors ${isHome ? "text-[var(--dt-accent)]" : "text-[var(--dt-text)] group-hover/name:text-[var(--dt-accent)]"}`}
                >
                  {cityName}
                </span>
                {showBadge && (
                  <span className="text-[clamp(10px,0.5vw+8px,12px)] font-medium text-[var(--dt-text-secondary)] border border-[var(--dt-border-strong)] px-[0.25em] rounded bg-[var(--dt-surface)]">
                    {abbreviation}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="text-[clamp(10px,0.5vw+8px,12px)] text-[var(--dt-text-secondary)] truncate flex items-center gap-[0.375em]">
            <span
              className="truncate w-full text-[clamp(13px,0.84vw+5.39px,16px)]"
              title={config.country}
            >
              {config.country || countryName || regionName}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Current Time Section ── */}
      <div className="col-span-1 md:col-span-1 flex flex-col items-end justify-center pr-0 md:px-0 md:pr-[1.5em] md:border-r border-[var(--dt-border)] md:h-full overflow-hidden">
        <div className="flex flex-col items-end">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={use24Hour ? "24h" : "12h"}
              initial={{
                opacity: 0,
                y: formatDirRef.current * -6,
                filter: "blur(4px)",
              }}
              animate={{
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: { duration: 0.25, ease: EASE_OUT },
              }}
              exit={{
                opacity: 0,
                y: formatDirRef.current * 6,
                filter: "blur(4px)",
                transition: { duration: 0.15, ease: EASE_IN },
              }}
              className="font-medium text-[var(--dt-text)] whitespace-nowrap text-[clamp(15px,0.84vw+6px,18px)]"
            >
              <MorphingTime>
                {format(
                  toZonedTime(now, timezone),
                  use24Hour ? "HH:mm" : "h:mm a",
                )}
              </MorphingTime>
            </motion.div>
          </AnimatePresence>
          <div
            className={`text-[clamp(13px,0.84vw+5.39px,16px)] whitespace-nowrap ${isHome ? "text-[var(--dt-accent)]" : "text-[var(--dt-text-secondary)]"}`}
          >
            {dateString}
          </div>
        </div>
      </div>

      {/* ── 3. Delete Button (Mobile Only: Column 3) ── */}
      <div className="md:hidden col-span-1 flex flex-col items-center justify-center gap-[0.125em] pl-[0.75em] pr-2">
        {!isHome && (
          <>
            {!isFirst && (
              <button
                onClick={() => onMove(config.id, "up")}
                className="text-[var(--dt-text-muted)] hover:text-[var(--dt-text-secondary)] p-0.5 rounded hover:bg-[var(--dt-surface-raised)]"
              >
                <ArrowUp className="w-[1em] h-[1em]" />
              </button>
            )}
            {!isLast && (
              <button
                onClick={() => onMove(config.id, "down")}
                className="text-[var(--dt-text-muted)] hover:text-[var(--dt-text-secondary)] p-0.5 rounded hover:bg-[var(--dt-surface-raised)]"
              >
                <ArrowDown className="w-[1em] h-[1em]" />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── 4. Desktop Hover Actions (Absolute) ── */}
      {!isHome && (
        <div
          className="hidden md:flex absolute right-0 top-0 bottom-0 md:left-[18em] md:right-auto md:w-[8em] opacity-0 group-hover:opacity-100 items-center justify-end pr-[1.5em] transition-opacity z-10 pointer-events-none group-hover:pointer-events-auto"
          style={{
            background: `linear-gradient(to left, var(--dt-bg) 30%, transparent)`,
          }}
        >
          <button
            onClick={() => onSetHome(config.id)}
            className="p-[0.375em] text-[var(--dt-text-muted)] hover:text-[var(--dt-accent)] hover:bg-[var(--dt-surface-raised)] rounded-md transition-all mr-1"
            title="Set as home"
          >
            <Home className="w-[1.25em] h-[1.25em]" />
          </button>
          <button
            onClick={() => onRemove(config.id)}
            className="p-[0.375em] text-[var(--dt-text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
            title="Remove timezone"
          >
            <X className="w-[1.25em] h-[1.25em]" />
          </button>
        </div>
      )}

      {/* ── 5. Timeline ── */}
      <div className="col-span-3 md:col-span-1 w-full h-[4.5em] md:h-full overflow-hidden relative border-t-0 border-transparent mt-3 md:mt-0 pt-0">
        <Timeline
          now={timelineTime}
          timezone={timezone}
          isHome={isHome}
          homeTimezone={homeTimezone}
          use24Hour={use24Hour}
          className="h-full w-full border-0 rounded-none"
          hoveredHourIndex={hoveredHourIndex}
          onHoverHour={onHoverHour}
          isLive={isLive}
          selectedDateOffset={selectedDateOffset}
          showWeekends={showWeekends}
        />
      </div>
    </div>
  );
};