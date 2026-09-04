"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { formatDistance } from "@/components/Sidebar";

const RADIUS_OPTIONS = [1, 2, 5, 10, 20];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildDayButtons() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const shortDay = SHORT_DAYS[(d.getDay() + 6) % 7];
    const dateNum = d.getDate();
    return {
      offset: i,
      label: i === 0 ? "Today" : i === 1 ? "Tmrw" : shortDay,
      sub: i <= 1 ? shortDay : String(dateNum),
    };
  });
}

function getTimePeriod(time) {
  const [h] = time.split(":").map(Number);
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

const SNAP = { MIN: 0, HALF: 1, FULL: 2 };

export default function MobileBottomSheet({
  filters, setFilters, filteredCinemas, selectedDayName, onCinemaSelect,
  userLocation, locationRadius, locationLoading, locationError,
  cinemaDistances, onRequestLocation, onClearLocation, onRadiusChange,
  dataSource, darkMode, onSnapChange,
}) {
  const [snapIndex, setSnapIndex] = useState(SNAP.HALF);
  const [openFilter, setOpenFilter] = useState(null);
  const [snapHeights, setSnapHeights] = useState([80, 300, 600]);

  const sheetRef = useRef(null);
  const drag = useRef({ active: false, startY: 0, startHeight: 0 });

  useEffect(() => {
    const compute = () => {
      const vh = window.innerHeight;
      const next = [80, Math.round(vh * 0.45), Math.round(vh * 0.92)];
      setSnapHeights(next);
      if (sheetRef.current && !drag.current.active) {
        sheetRef.current.style.height = `${next[snapIndex]}px`;
      }
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [snapIndex]);

  // Notify parent of current sheet height whenever snap changes
  useEffect(() => {
    onSnapChange?.(snapHeights[snapIndex]);
  }, [snapIndex, snapHeights, onSnapChange]);

  const handleTouchStart = useCallback((e) => {
    drag.current.active = true;
    drag.current.startY = e.touches[0].clientY;
    drag.current.startHeight = sheetRef.current?.offsetHeight ?? snapHeights[snapIndex];
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }, [snapIndex, snapHeights]);

  const handleTouchMove = useCallback((e) => {
    if (!drag.current.active) return;
    const dy = drag.current.startY - e.touches[0].clientY;
    const newH = Math.max(60, Math.min(snapHeights[SNAP.FULL] + 20, drag.current.startHeight + dy));
    if (sheetRef.current) sheetRef.current.style.height = `${newH}px`;
  }, [snapHeights]);

  const handleTouchEnd = useCallback(() => {
    if (!drag.current.active) return;
    drag.current.active = false;
    const currentH = sheetRef.current?.offsetHeight ?? snapHeights[snapIndex];
    if (sheetRef.current) sheetRef.current.style.transition = "";

    let nearest = SNAP.MIN;
    let minDist = Infinity;
    snapHeights.forEach((h, i) => {
      const d = Math.abs(h - currentH);
      if (d < minDist) { minDist = d; nearest = i; }
    });

    if (sheetRef.current) sheetRef.current.style.height = `${snapHeights[nearest]}px`;
    setSnapIndex(nearest);
  }, [snapIndex, snapHeights]);

  const toggleFilter = useCallback((key) => {
    setOpenFilter(prev => prev === key ? null : key);
  }, []);

  const toggleArrayFilter = useCallback((key, value) => {
    setFilters(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }, [setFilters]);

  const clearAll = useCallback(() => {
    setFilters({ search: "", priceRanges: [], timePeriods: [], genres: [], chains: [], discounts: [], wheelchairOnly: false, subtitledOnly: false, sensoryOnly: false, language: "", selectedDayIndex: 0 });
    onClearLocation();
    setOpenFilter(null);
  }, [setFilters, onClearLocation]);

  const th = darkMode ? {
    bg: "bg-[#141922]",
    border: "border-slate-800",
    text: "text-white",
    subtext: "text-slate-400",
    muted: "text-slate-500",
    faint: "text-slate-600",
    handle: "bg-slate-600",
    pillInactive: "bg-slate-800 border-slate-700 text-slate-300",
    pillOpen: "bg-slate-700 border-slate-600 text-slate-200",
    clearPill: "bg-slate-800 border-rose-700/60 text-rose-400",
    card: "bg-slate-800/60 border-slate-700/50",
    cardTitle: "text-white",
    chip: "text-slate-500 bg-slate-800 border-slate-700/50",
    distBadge: "bg-indigo-900/50 text-indigo-300 border-indigo-700/40",
    border2: "border-slate-800",
    dropdownBg: "bg-[#1c2330]",
    emptyState: "text-slate-600",
    dot: "bg-slate-600",
    movieTitle: "text-slate-400",
    input: "bg-slate-800 border-slate-700 text-white placeholder-slate-500",
  } : {
    bg: "bg-white",
    border: "border-gray-200",
    text: "text-gray-900",
    subtext: "text-gray-600",
    muted: "text-gray-500",
    faint: "text-gray-400",
    handle: "bg-gray-400",
    pillInactive: "bg-white border-gray-200 text-gray-700 shadow-sm",
    pillOpen: "bg-gray-100 border-gray-400 text-gray-900",
    clearPill: "bg-rose-50 border-rose-200 text-rose-600",
    card: "bg-white border-gray-200 shadow-sm",
    cardTitle: "text-gray-900",
    chip: "text-gray-500 bg-gray-100 border-gray-200",
    distBadge: "bg-indigo-50 text-indigo-600 border-indigo-200",
    border2: "border-gray-200",
    dropdownBg: "bg-gray-50",
    emptyState: "text-gray-400",
    dot: "bg-gray-400",
    movieTitle: "text-gray-600",
    input: "bg-white border-gray-300 text-gray-900 placeholder-gray-400",
  };

  const filterPills = [
    { key: "day", label: "Day", count: filters.selectedDayIndex > 0 ? 1 : 0, activeLabel: filters.selectedDayIndex > 0 ? selectedDayName : null },
    { key: "location", label: "Near Me", count: userLocation ? 1 : 0 },
    { key: "price", label: "Price", count: filters.priceRanges.length },
    { key: "time", label: "Time", count: filters.timePeriods.length },
    { key: "genre", label: "Genre", count: filters.genres.length },
    { key: "chain", label: "Chain", count: filters.chains.length },
    { key: "access", label: "Access", count: [filters.wheelchairOnly, filters.subtitledOnly, filters.sensoryOnly].filter(Boolean).length },
    { key: "discounts", label: "Discounts", count: filters.discounts.length },
    { key: "language", label: "Language", count: filters.language ? 1 : 0 },
    { key: "search", label: "Search", count: filters.search ? 1 : 0 },
  ];

  const hasActiveFilters =
    filters.priceRanges.length > 0 || filters.timePeriods.length > 0 ||
    filters.genres.length > 0 || filters.chains.length > 0 ||
    filters.discounts.length > 0 || filters.wheelchairOnly ||
    filters.subtitledOnly || filters.sensoryOnly || filters.language ||
    filters.search || filters.selectedDayIndex > 0 || !!userLocation;

  const isMinimized = snapIndex === SNAP.MIN;

  return (
    <div
      ref={sheetRef}
      style={{ height: `${snapHeights[snapIndex]}px` }}
      className={`fixed bottom-0 left-0 right-0 z-[1000] ${th.bg} border-t ${th.border} rounded-t-2xl shadow-2xl flex flex-col sheet-transition overflow-hidden`}
    >
      {/* Drag handle — touch target covers handle bar + count line */}
      <div
        className="shrink-0 touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className={`w-9 h-1 rounded-full ${th.handle}`} />
        </div>
        <div className="px-4 pb-2 flex items-center gap-2">
          <p className={`${th.muted} text-sm font-medium flex-1 truncate`}>
            {filteredCinemas.length} cinema{filteredCinemas.length !== 1 ? "s" : ""} open on {selectedDayName}
          </p>
          {dataSource === "loading" && (
            <span className="text-[10px] bg-slate-700/60 text-slate-400 border border-slate-600/50 px-1.5 py-0.5 rounded-full shrink-0">loading…</span>
          )}
          {dataSource === "live" && (
            <span className="text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 px-1.5 py-0.5 rounded-full shrink-0">live</span>
          )}
          {dataSource === "mock" && (
            <span className="text-[10px] bg-slate-700/60 text-slate-500 border border-slate-600/50 px-1.5 py-0.5 rounded-full shrink-0">demo</span>
          )}
        </div>
      </div>

      {/* Expanded content — hidden when minimized */}
      {!isMinimized && (
        <>
          {/* Horizontal filter pills */}
          <div className={`px-4 pb-2.5 border-b ${th.border2} shrink-0`}>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {hasActiveFilters && (
                <button
                  onClick={clearAll}
                  className={`shrink-0 px-4 py-2 rounded-full border text-xs font-medium whitespace-nowrap transition-all ${th.clearPill}`}
                >
                  Clear ×
                </button>
              )}
              {filterPills.map(({ key, label, count, activeLabel }) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  className={`shrink-0 px-4 py-2 rounded-full border text-xs font-medium whitespace-nowrap transition-all ${
                    count > 0
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : openFilter === key
                      ? th.pillOpen
                      : th.pillInactive
                  }`}
                >
                  {activeLabel ?? label}{count > 1 ? ` (${count})` : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Filter dropdown panel */}
          {openFilter && (
            <div className={`px-4 py-3 border-b ${th.border2} ${th.dropdownBg} shrink-0`}>
              <FilterDropdown
                filterKey={openFilter}
                filters={filters}
                setFilters={setFilters}
                toggleArrayFilter={toggleArrayFilter}
                dayButtons={buildDayButtons()}
                userLocation={userLocation}
                locationRadius={locationRadius}
                locationLoading={locationLoading}
                locationError={locationError}
                onRequestLocation={onRequestLocation}
                onClearLocation={onClearLocation}
                onRadiusChange={onRadiusChange}
                th={th}
                onClose={() => setOpenFilter(null)}
              />
            </div>
          )}

          {/* Scrollable results */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3">
            {filteredCinemas.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl block mb-2">🎭</span>
                <p className={`text-sm ${th.emptyState}`}>No cinemas match your filters</p>
              </div>
            ) : (
              <div className="space-y-3 pb-8">
                {filteredCinemas.map((cinema) => {
                  const dist = cinemaDistances[cinema.id];
                  const matchedMovies = cinema.movies.filter((m) =>
                    m.showtimes.some((st) => {
                      if (st.day !== selectedDayName) return false;
                      const genreMatch = filters.genres.length === 0 || filters.genres.includes(m.genre);
                      const timeMatch = filters.timePeriods.length === 0 || filters.timePeriods.includes(getTimePeriod(st.time));
                      return genreMatch && timeMatch;
                    })
                  );
                  return (
                    <button
                      key={cinema.id}
                      onClick={() => { onCinemaSelect(cinema); setSnapIndex(SNAP.MIN); }}
                      className={`w-full text-left border rounded-xl p-4 transition-all duration-150 ${th.card}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <span className={`text-sm font-semibold leading-tight flex-1 min-w-0 truncate ${th.cardTitle}`}>
                          {cinema.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {dist != null && (
                            <span className={`text-[10px] font-mono border px-1.5 py-0.5 rounded-full ${th.distBadge}`}>
                              {formatDistance(dist)}
                            </span>
                          )}
                          <span className={`text-xs font-bold ${cinema.price_range === "£" ? "text-emerald-400" : cinema.price_range === "££" ? "text-amber-400" : "text-red-400"}`}>
                            {cinema.price_range}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        {cinema.google_rating && (
                          <span className="text-amber-400 text-xs font-semibold">
                            {"★".repeat(Math.round(cinema.google_rating))}{"☆".repeat(5 - Math.round(cinema.google_rating))}
                            <span className={`ml-1 ${th.muted}`}>{cinema.google_rating}</span>
                          </span>
                        )}
                        {cinema.google_rating && <span className={`${th.faint} text-xs`}>·</span>}
                        <span className={`${th.muted} text-xs`}>{cinema.neighborhood}</span>
                      </div>
                      {matchedMovies.slice(0, 2).map((m, i) => {
                        const times = m.showtimes.filter(st => st.day === selectedDayName);
                        return (
                          <div key={i} className="mt-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1 h-1 rounded-full ${th.dot} shrink-0`} />
                              <span className={`${th.movieTitle} text-xs truncate`}>{m.title}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 ml-3 mt-0.5">
                              {times.slice(0, 4).map((st, ti) => (
                                <span
                                  key={ti}
                                  className={`text-[10px] font-mono border px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${th.chip}${st.booking_url ? " cursor-pointer" : ""}`}
                                  onClick={st.booking_url ? (e) => { e.stopPropagation(); window.open(st.booking_url, "_blank", "noopener,noreferrer"); } : undefined}
                                >
                                  {st.time}
                                  {st.booking_url && <ExternalLink size={8} className="opacity-50 shrink-0" />}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FilterDropdown({
  filterKey, filters, setFilters, toggleArrayFilter, dayButtons,
  userLocation, locationRadius, locationLoading, locationError,
  onRequestLocation, onClearLocation, onRadiusChange, th, onClose,
}) {
  if (filterKey === "day") {
    return (
      <div className="flex gap-1.5 flex-wrap">
        {dayButtons.map(({ offset, label, sub }) => {
          const isActive = filters.selectedDayIndex === offset;
          return (
            <button
              key={offset}
              onClick={() => { setFilters(p => ({ ...p, selectedDayIndex: offset })); onClose(); }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex flex-col items-center min-w-[44px] transition-all ${
                isActive ? "bg-indigo-600 border-indigo-500 text-white" : th.pillInactive
              }`}
            >
              <span className="font-semibold">{label}</span>
              <span className={`text-[10px] ${isActive ? "text-indigo-200" : th.faint}`}>{sub}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (filterKey === "location") {
    const radiusIndex = RADIUS_OPTIONS.indexOf(locationRadius);
    if (!userLocation) {
      return (
        <div className="space-y-2">
          <button
            onClick={onRequestLocation}
            disabled={locationLoading}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
              locationLoading
                ? `${th.border} ${th.muted} cursor-not-allowed`
                : "border-indigo-600/60 text-indigo-400 hover:bg-indigo-600/10"
            }`}
          >
            {locationLoading ? "Getting location…" : "Use my location"}
          </button>
          {locationError && <p className="text-red-400 text-xs">{locationError}</p>}
        </div>
      );
    }
    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-emerald-500 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Location active
          </span>
          <button onClick={onClearLocation} className={`${th.muted} text-xs underline underline-offset-2`}>Clear</button>
        </div>
        <div>
          <div className="flex justify-between mb-1.5">
            <span className={`${th.subtext} text-xs`}>Radius</span>
            <span className={`${th.text} text-xs font-semibold`}>{locationRadius} km</span>
          </div>
          <input
            type="range" min={0} max={4} step={1}
            value={radiusIndex === -1 ? 2 : radiusIndex}
            onChange={e => onRadiusChange(RADIUS_OPTIONS[parseInt(e.target.value)])}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700"
          />
          <div className="flex justify-between mt-1">
            {RADIUS_OPTIONS.map(r => (
              <span key={r} className={`text-[10px] ${r === locationRadius ? "text-indigo-400 font-semibold" : th.faint}`}>{r}km</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (filterKey === "price") {
    return (
      <div className="flex gap-2">
        {["£", "££", "£££"].map(price => {
          const isActive = filters.priceRanges.includes(price);
          return (
            <button key={price} onClick={() => toggleArrayFilter("priceRanges", price)}
              className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${
                isActive
                  ? price === "£" ? "bg-emerald-600 border-emerald-500 text-white"
                    : price === "££" ? "bg-amber-600 border-amber-500 text-white"
                    : "bg-red-700 border-red-600 text-white"
                  : th.pillInactive
              }`}
            >{price}</button>
          );
        })}
      </div>
    );
  }

  if (filterKey === "time") {
    return (
      <div className="flex gap-2">
        {["Morning", "Afternoon", "Evening"].map(period => {
          const isActive = filters.timePeriods.includes(period);
          return (
            <button key={period} onClick={() => toggleArrayFilter("timePeriods", period)}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                isActive ? "bg-indigo-600/80 border-indigo-500 text-white" : th.pillInactive
              }`}
            >{period}</button>
          );
        })}
      </div>
    );
  }

  if (filterKey === "genre") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {["Action", "Drama", "Comedy", "Horror", "Documentary", "Independent"].map(genre => {
          const isActive = filters.genres.includes(genre);
          return (
            <button key={genre} onClick={() => toggleArrayFilter("genres", genre)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isActive ? "bg-violet-700/70 border-violet-500/70 text-violet-100" : th.pillInactive
              }`}
            >{genre}</button>
          );
        })}
      </div>
    );
  }

  if (filterKey === "chain") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {["Odeon", "Vue", "Cineworld", "Curzon", "Everyman", "Picturehouse", "Independent", "Soho House"].map(chain => {
          const isActive = filters.chains.includes(chain);
          return (
            <button key={chain} onClick={() => toggleArrayFilter("chains", chain)}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                isActive ? "bg-sky-700/70 border-sky-500/70 text-sky-100" : th.pillInactive
              }`}
            >{chain}</button>
          );
        })}
      </div>
    );
  }

  if (filterKey === "access") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: "wheelchairOnly", label: "Wheelchair" },
          { key: "subtitledOnly", label: "CC Subtitled" },
          { key: "sensoryOnly", label: "Sensory friendly" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilters(p => ({ ...p, [key]: !p[key] }))}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              filters[key] ? "bg-teal-700/70 border-teal-500/70 text-teal-100" : th.pillInactive
            }`}
          >{label}</button>
        ))}
      </div>
    );
  }

  if (filterKey === "discounts") {
    return (
      <div className="flex gap-2">
        {["student", "senior", "NHS"].map(d => {
          const isActive = filters.discounts.includes(d);
          return (
            <button key={d} onClick={() => toggleArrayFilter("discounts", d)}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-all ${
                isActive ? "bg-orange-700/70 border-orange-500/70 text-orange-100" : th.pillInactive
              }`}
            >{d}</button>
          );
        })}
      </div>
    );
  }

  if (filterKey === "language") {
    return (
      <div className="flex gap-2">
        {["English", "Non-English", "Subtitled"].map(lang => {
          const isActive = filters.language === lang;
          return (
            <button key={lang} onClick={() => setFilters(p => ({ ...p, language: isActive ? "" : lang }))}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                isActive ? "bg-rose-700/70 border-rose-500/70 text-rose-100" : th.pillInactive
              }`}
            >{lang}</button>
          );
        })}
      </div>
    );
  }

  if (filterKey === "search") {
    return (
      <input
        type="text"
        placeholder="Search cinema, film, or neighbourhood..."
        value={filters.search}
        onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
        autoFocus
        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${th.input}`}
      />
    );
  }

  return null;
}
