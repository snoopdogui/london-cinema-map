import { ExternalLink } from "lucide-react";
import { formatDistance } from "@/components/Sidebar";

const GENRE_COLORS = {
  Action: "bg-red-900/50 text-red-300 border-red-700/50",
  Drama: "bg-purple-900/50 text-purple-300 border-purple-700/50",
  Comedy: "bg-yellow-900/50 text-yellow-300 border-yellow-700/50",
  Horror: "bg-orange-900/50 text-orange-300 border-orange-700/50",
  Documentary: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  Independent: "bg-teal-900/50 text-teal-300 border-teal-700/50",
};

const GENRE_COLORS_LIGHT = {
  Action: "bg-red-100 text-red-700 border-red-300",
  Drama: "bg-purple-100 text-purple-700 border-purple-300",
  Comedy: "bg-yellow-100 text-yellow-700 border-yellow-300",
  Horror: "bg-orange-100 text-orange-700 border-orange-300",
  Documentary: "bg-blue-100 text-blue-700 border-blue-300",
  Independent: "bg-teal-100 text-teal-700 border-teal-300",
};

function StarRating({ rating }) {
  if (rating == null) return null;
  const full = Math.floor(rating);
  const partial = rating - full;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="relative inline-block text-base leading-none">
          <span className="text-gray-600">★</span>
          {i <= full && <span className="absolute inset-0 text-amber-400">★</span>}
          {i === full + 1 && partial > 0 && (
            <span className="absolute inset-0 text-amber-400 overflow-hidden" style={{ width: `${partial * 100}%` }}>★</span>
          )}
        </span>
      ))}
      <span className="text-amber-400 font-semibold text-sm ml-1">{rating}</span>
    </div>
  );
}

function Badge({ children, className = "" }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${className}`}>{children}</span>;
}

export default function CinemaPopup({ cinema, selectedDayName, distance, darkMode }) {
  const moviesForDay = cinema.movies
    .map((movie) => ({ ...movie, todayShowtimes: movie.showtimes.filter((st) => st.day === selectedDayName) }))
    .filter((m) => m.todayShowtimes.length > 0);

  const th = darkMode ? {
    headerBorder: "border-slate-700/60",
    title: "text-white",
    address: "text-slate-400",
    meta: "text-slate-500",
    separator: "text-slate-700",
    screeningsLabel: "text-indigo-300",
    movieCard: "bg-slate-800/60 border-slate-700/40",
    movieTitle: "text-white",
    chip: "bg-slate-700/80 text-slate-200 border-slate-600/50",
    badge: "bg-slate-800 text-slate-300 border-slate-600/50",
    empty: "text-slate-500",
    genreColors: GENRE_COLORS,
  } : {
    headerBorder: "border-gray-200",
    title: "text-gray-900",
    address: "text-gray-500",
    meta: "text-gray-500",
    separator: "text-gray-300",
    screeningsLabel: "text-indigo-600",
    movieCard: "bg-gray-50 border-gray-200",
    movieTitle: "text-gray-900",
    chip: "bg-gray-100 text-gray-700 border-gray-200",
    badge: "bg-gray-100 text-gray-600 border-gray-200",
    empty: "text-gray-500",
    genreColors: GENRE_COLORS_LIGHT,
  };

  return (
    <div className="w-80 font-sans">
      {/* Header */}
      <div className={`pl-4 pr-10 pt-4 pb-3 border-b ${th.headerBorder}`}>
        <div className="flex items-start justify-between gap-2">
          <h2 className={`${th.title} font-bold text-base leading-tight flex-1 min-w-0`}>{cinema.name}</h2>
          <div className="flex items-center gap-1.5 shrink-0">
            {distance != null && (
              <span className="text-[10px] font-mono bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                📍 {formatDistance(distance)}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
              cinema.price_range === "£" ? "bg-emerald-900/60 text-emerald-300 border-emerald-700/50"
              : cinema.price_range === "££" ? "bg-amber-900/60 text-amber-300 border-amber-700/50"
              : "bg-red-900/60 text-red-300 border-red-700/50"
            }`}>{cinema.price_range}</span>
          </div>
        </div>
        <p className={`${th.address} text-xs mt-1`}>{cinema.address}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`${th.meta} text-xs`}>{cinema.neighborhood}</span>
          <span className={`${th.separator}`}>·</span>
          <span className={`${th.meta} text-xs`}>{cinema.chain}</span>
        </div>
        <div className="mt-2"><StarRating rating={cinema.google_rating} /></div>
        <div className="flex flex-wrap gap-1 mt-2">
          {cinema.wheelchair_accessible && <Badge className={th.badge}>♿ Accessible</Badge>}
          {cinema.has_subtitled_screenings && <Badge className={th.badge}>CC Subtitled</Badge>}
          {cinema.has_sensory_friendly && <Badge className={th.badge}>🌟 Sensory</Badge>}
        </div>
        {cinema.discounts?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {cinema.discounts.map((d) => (
              <Badge key={d} className="bg-orange-900/40 text-orange-300 border-orange-700/40 capitalize">{d}</Badge>
            ))}
          </div>
        )}
        <div className={`mt-2 text-xs ${th.screeningsLabel} font-medium`}>Screenings on {selectedDayName}</div>
      </div>

      {/* Movies */}
      <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
        {moviesForDay.length === 0 ? (
          <p className={`${th.empty} text-sm text-center py-4`}>No screenings on {selectedDayName}</p>
        ) : (
          moviesForDay.map((movie, idx) => (
            <div key={idx} className={`rounded-lg p-3 border ${th.movieCard}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className={`${th.movieTitle} text-sm font-semibold leading-tight`}>{movie.title}</h3>
                {movie.ticket_price != null && (
                  <span className="text-emerald-400 font-bold text-sm shrink-0">£{movie.ticket_price.toFixed(2)}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${th.genreColors[movie.genre] || (darkMode ? "bg-slate-700 text-slate-300 border-slate-600" : "bg-gray-100 text-gray-600 border-gray-200")}`}>
                  {movie.genre}
                </span>
                {movie.language !== "English" && (
                  <Badge className="bg-blue-900/40 text-blue-300 border-blue-700/40">🌐 {movie.language}</Badge>
                )}
                {movie.has_subtitles && <Badge className={th.badge}>CC</Badge>}
              </div>
              <div className="flex flex-wrap gap-1">
                {movie.todayShowtimes.map((st, ti) => {
                  const href = st.booking_url || cinema.booking_url;
                  return href ? (
                    <a
                      key={ti}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs px-2 py-0.5 rounded border font-mono inline-flex items-center gap-1 transition-colors hover:border-indigo-500 hover:text-indigo-300 ${th.chip}`}
                    >
                      {st.time}
                      <ExternalLink size={9} className="opacity-50 shrink-0" />
                    </a>
                  ) : (
                    <span key={ti} className={`text-xs px-2 py-0.5 rounded border font-mono ${th.chip}`}>
                      {st.time}
                    </span>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
