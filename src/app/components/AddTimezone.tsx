import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Search, X, Check } from "lucide-react";
import {
  getCommonTimezones,
  CITY_ALIASES,
  type SearchResult,
} from "../../utils/timezoneUtils";
import { motion, AnimatePresence } from "motion/react";

// ── Easing curves (Tip 4) ──
const EASE_OUT: [number, number, number, number] = [
  0, 0, 0.2, 1,
];
const EASE_IN: [number, number, number, number] = [
  0.4, 0, 1, 1,
];

/** Normalize underscores ↔ spaces for matching */
const normalize = (s: string) =>
  s.toLowerCase().replace(/_/g, " ");

/** Check if a string matches the query (space/underscore tolerant) */
const matchesQuery = (text: string, query: string): boolean => {
  const q = normalize(query).trim();
  if (!q) return false;
  return normalize(text).includes(q);
};

interface AddTimezoneProps {
  onAdd: (timezone: string, label?: string) => void;
  existingTimezones: string[];
}

export const AddTimezone: React.FC<AddTimezoneProps> = ({
  onAdd,
  existingTimezones,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allTimezones = useMemo(() => getCommonTimezones(), []);

  // Build unified search results: IANA direct matches + city alias matches
  const { availableResults, alreadyAddedResults } =
    useMemo(() => {
      const trimmed = search.trim();
      if (!trimmed)
        return {
          availableResults: [] as SearchResult[],
          alreadyAddedResults: [] as SearchResult[],
        };

      const seenKeys = new Set<string>(); // dedup key = "timezone|displayCity"
      const available: SearchResult[] = [];
      const alreadyAdded: SearchResult[] = [];

      // 1. IANA direct matches
      for (const tz of allTimezones) {
        if (!matchesQuery(tz, search)) continue;
        const city =
          tz.split("/").pop()?.replace(/_/g, " ") || tz;
        const key = `${tz}|${city}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const result: SearchResult = {
          timezone: tz,
          displayCity: city,
          iana: tz,
          isAlias: false,
        };
        if (existingTimezones.includes(tz)) {
          alreadyAdded.push(result);
        } else {
          available.push(result);
        }
      }

      // 2. City alias matches
      for (const [cityName, info] of Object.entries(
        CITY_ALIASES,
      )) {
        if (!matchesQuery(cityName, search)) continue;
        const key = `${info.timezone}|${cityName}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const result: SearchResult = {
          timezone: info.timezone,
          displayCity: cityName,
          iana: info.timezone,
          isAlias: true,
        };
        if (existingTimezones.includes(info.timezone)) {
          alreadyAdded.push(result);
        } else {
          available.push(result);
        }
      }

      return {
        availableResults: available.slice(0, 50),
        alreadyAddedResults: alreadyAdded,
      };
    }, [search, allTimezones, existingTimezones]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items =
      listRef.current.querySelectorAll("[data-tz-item]");
    const highlighted = items[highlightedIndex];
    if (highlighted) {
      highlighted.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
  }, [wrapperRef]);

  // Keyboard shortcut Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 10);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      // Pass the alias city name as the label so the row shows "Mumbai" not "Kolkata"
      onAdd(
        result.timezone,
        result.isAlias ? result.displayCity : undefined,
      );
      setSearch("");
      setIsOpen(false);
    },
    [onAdd],
  );

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !search.trim()) return;

    const count = availableResults.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          count > 0 ? (prev + 1) % count : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          count > 0 ? (prev - 1 + count) % count : 0,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (count > 0 && highlightedIndex < count) {
          handleSelect(availableResults[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setSearch("");
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const showDropdown = isOpen && search.trim().length > 0;
  const hasAvailable = availableResults.length > 0;
  const hasAlreadyAdded = alreadyAddedResults.length > 0;
  const noResults = !hasAvailable && !hasAlreadyAdded;

  return (
    <div className="relative w-full md:w-[24.5em] h-full" ref={wrapperRef}>
      <div
        className={`group flex items-center gap-[0.5em] px-[0.75em] py-[0.375em] bg-[var(--dt-search-surface)] border border-[var(--dt-border-strong)] rounded-md transition-all focus-within:bg-[var(--dt-bg)] focus-within:ring-2 focus-within:ring-[var(--dt-accent-ring)] focus-within:border-[var(--dt-accent)] hover:bg-[var(--dt-bg)] hover:border-[var(--dt-border-strong)] h-full ${isOpen ? "ring-2 ring-[var(--dt-accent-ring)] border-[var(--dt-accent)] bg-[var(--dt-bg)]" : ""}`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Search
          size="0.875em"
          className={`flex-shrink-0 transition-colors ${isOpen ? "text-[var(--dt-accent)]" : "text-[var(--dt-text-muted)] group-hover:text-[var(--dt-text-secondary)]"}`}
        />
        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent outline-none text-base text-[var(--dt-text)] placeholder:text-[var(--dt-text-muted)] h-[1.5em] w-full min-w-0"
          placeholder="Search major city"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-activedescendant={
            hasAvailable
              ? `tz-option-${highlightedIndex}`
              : undefined
          }
        />
        {/* Fixed-width right slot to prevent layout shift */}
        <div className="flex-shrink-0 w-[3em] flex items-center justify-end">
          {search ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSearch("");
                inputRef.current?.focus();
              }}
              className="flex items-center justify-center md:px-[0.375em] md:py-[0.125em] md:bg-[var(--dt-surface-raised)] md:border md:border-[var(--dt-border-strong)] md:rounded transition-colors"
            >
              <X
                size="0.875em"
                className="md:hidden text-[var(--dt-text-muted)]"
              />
              <span className="hidden md:inline text-[clamp(10px,0.5vw+8px,12px)] font-medium text-[var(--dt-text-secondary)]">
                Esc
              </span>
            </button>
          ) : (
            <div className="hidden md:flex items-center gap-[0.125em] px-[0.375em] py-[0.125em] bg-[var(--dt-surface-raised)] border border-[var(--dt-border-strong)] rounded text-[clamp(10px,0.5vw+8px,12px)] font-medium text-[var(--dt-text-secondary)]">
              <span className="text-[clamp(10px,0.5vw+8px,12px)]">
                &#8984;
              </span>
              <span>K</span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            ref={listRef}
            className="absolute top-full left-0 right-0 mt-[0.5em] bg-[var(--dt-search-dropdown)] rounded-lg shadow-xl border border-[var(--dt-border)] overflow-hidden z-50 py-1 max-h-64 overflow-y-auto ring-1 ring-black/5"
            style={{ transformOrigin: "top" }}
            data-no-squircle
            initial={{ opacity: 0, scaleY: 0.96, y: -4 }}
            animate={{
              opacity: 1,
              scaleY: 1,
              y: 0,
              transition: { duration: 0.2, ease: EASE_OUT },
            }}
            exit={{
              opacity: 0,
              scaleY: 0.96,
              y: -4,
              transition: { duration: 0.12, ease: EASE_IN },
            }}
            role="listbox"
          >
            {noResults ? (
              <div className="px-3 py-[2em] text-center">
                <p className="text-[clamp(14px,0.78vw+5px,18px)] text-[var(--dt-text)] font-medium">
                  No results found
                </p>
                <p className="text-[clamp(12px,0.5vw+8px,16px)] text-[var(--dt-text-muted)] mt-[0.25em]">
                  Try searching for a major city or region
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {hasAvailable && (
                  <>
                    <div className="px-3 py-[0.375em] text-[clamp(10px,0.5vw+8px,12px)] font-semibold text-[var(--dt-text-muted)] uppercase tracking-wider bg-[var(--dt-search-section-bg)] border-b border-[var(--dt-border)] border-l-2 border-transparent">
                      Timezones
                    </div>
                    {availableResults.map((result, idx) => (
                      <button
                        key={`${result.timezone}-${result.displayCity}`}
                        id={`tz-option-${idx}`}
                        data-tz-item
                        role="option"
                        aria-selected={idx === highlightedIndex}
                        className={`w-full text-left px-3 py-[0.5em] text-[clamp(13px,0.78vw+5px,16.25px)] transition-colors flex items-center justify-between group border-l-2 ${
                          idx === highlightedIndex
                            ? "bg-[var(--dt-accent-wash)] text-[var(--dt-accent)] border-[var(--dt-accent)]"
                            : "text-[var(--dt-text-secondary)] hover:bg-[var(--dt-accent-wash)] hover:text-[var(--dt-accent)] border-transparent hover:border-[var(--dt-accent)]"
                        }`}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() =>
                          setHighlightedIndex(idx)
                        }
                      >
                        <span className="font-medium">
                          {result.displayCity}
                        </span>
                        <span
                          className={`text-[clamp(10px,0.5vw+8px,12px)] font-mono ${
                            idx === highlightedIndex
                              ? "text-[var(--dt-accent-70)]"
                              : "text-[var(--dt-text-muted)] group-hover:text-[var(--dt-accent-70)]"
                          }`}
                        >
                          {result.iana}
                        </span>
                      </button>
                    ))}
                  </>
                )}
                {hasAlreadyAdded && (
                  <>
                    <div className="px-3 py-[0.375em] text-[clamp(10px,0.5vw+8px,12px)] font-semibold text-[var(--dt-text-muted)] uppercase tracking-wider bg-[var(--dt-search-section-bg)] border-b border-[var(--dt-border)] mt-px border-l-2 border-transparent">
                      Already in timeline
                    </div>
                    {alreadyAddedResults.map((result) => (
                      <div
                        key={`${result.timezone}-${result.displayCity}`}
                        className="w-full text-left px-3 py-[0.5em] text-[clamp(13px,0.78vw+5px,16.25px)] text-[var(--dt-text-muted)] flex items-center justify-between cursor-default border-l-2 border-transparent"
                      >
                        <span className="flex items-center gap-[0.5em]">
                          <Check
                            size={13}
                            className="text-[var(--dt-accent-70)]"
                          />
                          <span>{result.displayCity}</span>
                        </span>
                        <span className="text-[clamp(10px,0.5vw+8px,12px)] text-[var(--dt-text-muted)] font-mono">
                          {result.iana}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};