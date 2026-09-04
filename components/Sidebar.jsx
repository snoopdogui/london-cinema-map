"use client";

import { getDayName } from "@/app/page";
import { Sunrise, Sun, Sunset, ExternalLink } from "lucide-react";

const GENRES = ["Action", "Drama", "Comedy", "Horror", "Documentary", "Independent"];
const PRICE_RANGES = ["£", "££", "£££"];
const TIME_PERIODS = ["Morning", "Afternoon", "Evening"];
const CHAINS = ["Odeon", "Vue", "Cineworld", "Curzon", "Everyman", "Picturehouse", "Independent", "Soho House"];
const DISCOUNTS = ["student", "senior", "NHS"];
const RADIUS_OPTIONS = [1, 2, 5, 10, 20];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getTimePeriod(time) {
  const [h] = time.split(":").map(Number);
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function StarRating({ rating, th }) {
  if (rating == null) return <span className={`${th.noRating} text-xs`}>No rating</span>;
  return (
    <span className="text-amber-400 font-semibold text-xs">
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
      <span className={`ml-1 ${th.ratingVal}`}>{rating}</span>
    </span>
  );
}

function FilterSection({ title, children, th }) {
  return (
    <div className="px-5 pb-4">
      <h3 className={`${th.sectionTitle} text-xs font-semibold uppercase tracking-wider mb-2`}>{title}</h3>
      {children}
    </div>
  );
}

function buildDayButtons() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const shortDay = SHORT_DAYS[(d.getDay() + 6) % 7];
    const dateNum = d.getDate();
    return { offset: i, label: i === 0 ? "Today" : i === 1 ? "Tmrw" : shortDay, sub: i <= 1 ? shortDay : String(dateNum) };
  });
}

export default function Sidebar({
  filters, setFilters, filteredCinemas, selectedDayName, onCinemaSelect,
  userLocation, locationRadius, locationLoading, locationError,
  cinemaDistances, onRequestLocation, onClearLocation, onRadiusChange,
  dataSource, darkMode, width, className,
}) {
  const th = darkMode ? {
    bg: "bg-[#141922]",
    border: "border-slate-800",
    text: "text-white",
    subtext: "text-slate-400",
    muted: "text-slate-500",
    faint: "text-slate-600",
    sectionTitle: "text-slate-400",
    input: "bg-slate-800/80 border-slate-700/60 text-white placeholder-slate-500 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/30",
    pillInactive: "border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-300",
    priceInactive: "border-slate-600 text-slate-400",
    card: "bg-slate-800/60 hover:bg-slate-800/90 border-slate-700/50 hover:border-slate-600",
    cardTitle: "text-white group-hover:text-indigo-300",
    chip: "text-slate-500 bg-slate-800 border-slate-700/50",
    distBadge: "bg-indigo-900/50 text-indigo-300 border-indigo-700/40",
    divider: "border-slate-800",
    clearBtn: "border-slate-700/60 text-slate-500 hover:border-slate-500 hover:text-slate-300",
    errorBox: "bg-red-950/40 border-red-800/50",
    errorText: "text-red-300",
    emptyState: "text-slate-600",
    noRating: "text-slate-600",
    ratingVal: "text-slate-400",
    dot: "bg-slate-600",
    movieTitle: "text-slate-400",
    movieGenre: "text-slate-500",
    dayBtnInactive: "border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-300",
    nearMeBtn: "border-indigo-600/60 text-indigo-300 hover:bg-indigo-600/20 hover:border-indigo-500",
    clearLocation: "text-slate-500 hover:text-slate-300",
    rangeTrack: "bg-slate-700",
    radiusLabel: "text-indigo-300",
  } : {
    bg: "bg-white",
    border: "border-gray-200",
    text: "text-gray-900",
    subtext: "text-gray-600",
    muted: "text-gray-500",
    faint: "text-gray-400",
    sectionTitle: "text-gray-500",
    input: "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400/30",
    pillInactive: "border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700",
    priceInactive: "border-gray-300 text-gray-500",
    card: "bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow",
    cardTitle: "text-gray-900 group-hover:text-indigo-600",
    chip: "text-gray-500 bg-gray-100 border-gray-200",
    distBadge: "bg-indigo-50 text-indigo-600 border-indigo-200",
    divider: "border-gray-200",
    clearBtn: "border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600",
    errorBox: "bg-red-50 border-red-300",
    errorText: "text-red-600",
    emptyState: "text-gray-400",
    noRating: "text-gray-400",
    ratingVal: "text-gray-500",
    dot: "bg-gray-400",
    movieTitle: "text-gray-600",
    movieGenre: "text-gray-500",
    dayBtnInactive: "border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700",
    nearMeBtn: "border-indigo-500 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-600",
    clearLocation: "text-gray-500 hover:text-gray-700",
    rangeTrack: "bg-gray-300",
    radiusLabel: "text-indigo-600",
  };

  const dayButtons = buildDayButtons();
  const radiusIndex = RADIUS_OPTIONS.indexOf(locationRadius);

  const toggleArrayFilter = (key, value) => {
    setFilters((prev) => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  return (
    <aside style={{ width: width ?? 380 }} className={`${className ?? ""} shrink-0 h-screen ${th.bg} border-r ${th.border} flex flex-col overflow-hidden`}>
      {/* Header */}
      <div className={`px-6 py-5 border-b ${th.border} shrink-0`}>
        <div className="flex items-center gap-2 mb-1.5">
          <h1 className={`${th.text} font-black text-xl tracking-tight`}>The London Cinema Map</h1>
        </div>
        <div className="flex items-center gap-2">
          <p className={`${th.muted} text-sm`}>
            {filteredCinemas.length} cinema{filteredCinemas.length !== 1 ? "s" : ""} open on {selectedDayName}
          </p>
          {dataSource === "loading" && (
            <span className="text-[10px] bg-slate-700/60 text-slate-400 border border-slate-600/50 px-1.5 py-0.5 rounded-full">
              loading live data…
            </span>
          )}
          {dataSource === "live" && (
            <span className="text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 px-1.5 py-0.5 rounded-full">
              live
            </span>
          )}
          {dataSource === "mock" && (
            <span className="text-[10px] bg-slate-700/60 text-slate-500 border border-slate-600/50 px-1.5 py-0.5 rounded-full">
              demo data
            </span>
          )}
        </div>
      </div>

      {/* Day selector */}
      <div className={`px-4 py-3 border-b ${th.border} shrink-0 ${th.bg}`}>
        <div className="flex gap-1.5">
          {dayButtons.map(({ offset, label, sub }) => {
            const isActive = filters.selectedDayIndex === offset;
            return (
              <button key={offset} onClick={() => setFilters((p) => ({ ...p, selectedDayIndex: offset }))}
                className={`flex-1 py-1.5 rounded-lg border flex flex-col items-center leading-tight transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40"
                    : th.dayBtnInactive
                }`}>
                <span className="text-xs font-semibold">{label}</span>
                <span className={`text-[10px] ${isActive ? "text-indigo-200" : th.faint}`}>{sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Location */}
        <FilterSection title="Location" th={th}>
          {!userLocation ? (
            <div className="space-y-2">
              <button
                onClick={onRequestLocation}
                disabled={locationLoading}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all duration-150 ${
                  locationLoading
                    ? `${th.border} ${th.muted} cursor-not-allowed`
                    : th.nearMeBtn
                }`}
              >
                {locationLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    <span>Getting location…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span>Near Me</span>
                  </>
                )}
              </button>
              {locationError && (
                <div className={`flex items-start gap-2 ${th.errorBox} border rounded-lg px-3 py-2`}>
                  <svg className={`w-4 h-4 ${th.errorText} shrink-0 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                  <p className={`${th.errorText} text-xs leading-snug`}>{locationError}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-emerald-500 text-xs font-medium">Location active</span>
                </div>
                <button onClick={onClearLocation}
                  className={`${th.clearLocation} text-xs underline underline-offset-2 transition-colors`}>
                  Clear
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${th.subtext} text-xs`}>Radius</span>
                  <span className={`${th.text} text-xs font-semibold tabular-nums`}>{locationRadius} km</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={1}
                  value={radiusIndex === -1 ? 2 : radiusIndex}
                  onChange={(e) => onRadiusChange(RADIUS_OPTIONS[parseInt(e.target.value)])}
                  className={`w-full h-1.5 rounded-full appearance-none cursor-pointer
                    ${th.rangeTrack}
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-indigo-500
                    [&::-webkit-slider-thumb]:shadow-md
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-indigo-300
                    [&::-moz-range-thumb]:w-4
                    [&::-moz-range-thumb]:h-4
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-indigo-500
                    [&::-moz-range-thumb]:border-2
                    [&::-moz-range-thumb]:border-indigo-300
                    [&::-moz-range-thumb]:cursor-pointer`}
                />
                <div className="flex justify-between mt-1.5">
                  {RADIUS_OPTIONS.map((r) => (
                    <span key={r} className={`text-[10px] ${r === locationRadius ? `${th.radiusLabel} font-semibold` : th.faint}`}>
                      {r}km
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </FilterSection>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${th.muted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search cinema, film, or neighbourhood..."
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm transition-colors outline-none ${th.input}`}
            />
          </div>
        </div>

        {/* Price Range */}
        <FilterSection title="Price Range" th={th}>
          <div className="flex gap-2">
            {PRICE_RANGES.map((price) => {
              const isActive = filters.priceRanges.includes(price);
              const colorClass = price === "£"
                ? isActive ? "bg-emerald-600 border-emerald-500 text-white" : `${th.priceInactive} hover:border-emerald-700`
                : price === "££"
                ? isActive ? "bg-amber-600 border-amber-500 text-white" : `${th.priceInactive} hover:border-amber-700`
                : isActive ? "bg-red-700 border-red-600 text-white" : `${th.priceInactive} hover:border-red-800`;
              return (
                <button key={price} onClick={() => toggleArrayFilter("priceRanges", price)}
                  className={`flex-1 py-1.5 rounded-lg border text-sm font-bold transition-all duration-150 ${colorClass}`}>
                  {price}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Time of Day */}
        <FilterSection title="Time of Day" th={th}>
          <div className="flex gap-2">
            {TIME_PERIODS.map((period) => {
              const isActive = filters.timePeriods.includes(period);
              const Icon = period === "Morning" ? Sunrise : period === "Afternoon" ? Sun : Sunset;
              return (
                <button key={period} onClick={() => toggleArrayFilter("timePeriods", period)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-0.5 transition-all duration-150 ${
                    isActive ? "bg-indigo-600/80 border-indigo-500 text-white" : th.pillInactive
                  }`}>
                  <Icon size={14} strokeWidth={1.75} /><span>{period}</span>
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Genre */}
        <FilterSection title="Genre" th={th}>
          <div className="grid grid-cols-2 gap-1.5">
            {GENRES.map((genre) => {
              const isActive = filters.genres.includes(genre);
              return (
                <button key={genre} onClick={() => toggleArrayFilter("genres", genre)}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium text-left transition-all duration-150 ${
                    isActive ? "bg-violet-700/70 border-violet-500/70 text-violet-100" : th.pillInactive
                  }`}>
                  {genre}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Chain */}
        <FilterSection title="Chain / Venue" th={th}>
          <div className="flex flex-wrap gap-1.5">
            {CHAINS.map((chain) => {
              const isActive = filters.chains.includes(chain);
              return (
                <button key={chain} onClick={() => toggleArrayFilter("chains", chain)}
                  className={`py-1 px-2.5 rounded-full border text-xs font-medium transition-all duration-150 ${
                    isActive ? "bg-sky-700/70 border-sky-500/70 text-sky-100" : th.pillInactive
                  }`}>
                  {chain}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Accessibility */}
        <FilterSection title="Accessibility" th={th}>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "wheelchairOnly", label: "Wheelchair access" },
              { key: "subtitledOnly", label: "CC Subtitled screenings" },
              { key: "sensoryOnly", label: "Sensory friendly" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFilters((p) => ({ ...p, [key]: !p[key] }))}
                className={`py-1 px-2.5 rounded-full border text-xs font-medium transition-all duration-150 ${
                  filters[key] ? "bg-teal-700/70 border-teal-500/70 text-teal-100" : th.pillInactive
                }`}>
                {label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Discounts */}
        <FilterSection title="Discounts" th={th}>
          <div className="flex gap-1.5">
            {DISCOUNTS.map((d) => {
              const isActive = filters.discounts.includes(d);
              return (
                <button key={d} onClick={() => toggleArrayFilter("discounts", d)}
                  className={`flex-1 py-1 rounded-lg border text-xs font-medium capitalize transition-all duration-150 ${
                    isActive ? "bg-orange-700/70 border-orange-500/70 text-orange-100" : th.pillInactive
                  }`}>
                  {d}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Language */}
        <FilterSection title="Film Language" th={th}>
          <div className="flex gap-2">
            {["English", "Non-English", "Subtitled"].map((lang) => {
              const isActive = filters.language === lang;
              return (
                <button key={lang} onClick={() => setFilters((p) => ({ ...p, language: isActive ? "" : lang }))}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 ${
                    isActive ? "bg-rose-700/70 border-rose-500/70 text-rose-100" : th.pillInactive
                  }`}>
                  {lang}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Clear all */}
        <div className="px-5 pb-4">
          <button
            onClick={() => {
              setFilters({ search: "", priceRanges: [], timePeriods: [], genres: [], chains: [], discounts: [], wheelchairOnly: false, subtitledOnly: false, sensoryOnly: false, language: "", selectedDayIndex: 0 });
              onClearLocation();
            }}
            className={`w-full py-1.5 rounded-lg border text-xs transition-colors ${th.clearBtn}`}>
            Clear all filters
          </button>
        </div>

        <div className={`mx-5 border-t ${th.divider} mb-3`} />

        {/* Results */}
        <div className="px-5 pb-5">
          <h3 className={`${th.sectionTitle} text-xs font-semibold uppercase tracking-wider mb-3`}>Results</h3>
          {filteredCinemas.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl block mb-2">🎭</span>
              <p className={`text-sm ${th.emptyState}`}>No cinemas match your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
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
                  <button key={cinema.id} onClick={() => onCinemaSelect(cinema)}
                    className={`w-full text-left border rounded-xl p-4 transition-all duration-150 group ${th.card}`}>
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <span className={`text-sm font-semibold leading-tight transition-colors flex-1 min-w-0 truncate ${th.cardTitle}`}>{cinema.name}</span>
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
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating rating={cinema.google_rating} th={th} />
                      <span className={`${th.faint} text-xs`}>·</span>
                      <span className={`${th.muted} text-xs`}>{cinema.neighborhood}</span>
                    </div>
                    {matchedMovies.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {matchedMovies.map((m, i) => {
                          const dayShowtimes = m.showtimes.filter((st) => st.day === selectedDayName);
                          return (
                            <div key={i}>
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1 h-1 rounded-full ${th.dot} shrink-0`} />
                                <span className={`${th.movieTitle} text-xs truncate`}>{m.title}</span>
                                <span className={`${th.faint} text-xs shrink-0`}>·</span>
                                <span className={`${th.movieGenre} text-xs shrink-0`}>{m.genre}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 ml-3 mt-0.5">
                                {dayShowtimes.map((st, ti) => (
                                  <span
                                    key={ti}
                                    className={`text-[10px] font-mono border px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${th.chip} ${st.booking_url ? "cursor-pointer hover:border-indigo-500 hover:text-indigo-300 transition-colors" : ""}`}
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
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
