"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import MobileBottomSheet from "@/components/MobileBottomSheet";
import InfoModal from "@/components/InfoModal";
import ContactModal from "@/components/ContactModal";
import { cinemas as mockCinemas } from "@/data/cinemas";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const JS_DAY_TO_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function getDayName(offsetFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + offsetFromToday);
  return JS_DAY_TO_NAME[d.getDay()];
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTimePeriod(time) {
  const [h] = time.split(":").map(Number);
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

const DEFAULT_FILTERS = {
  search: "",
  priceRanges: [],
  timePeriods: [],
  genres: [],
  chains: [],
  discounts: [],
  wheelchairOnly: false,
  subtitledOnly: false,
  sensoryOnly: false,
  language: "",
  selectedDayIndex: 0,
};

export default function Home() {
  const [cinemas, setCinemas] = useState(mockCinemas);
  const [dataSource, setDataSource] = useState("mock");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cinemaMapTheme");
    if (saved !== null) setDarkMode(saved === "dark");
  }, []);

  useEffect(() => {
    localStorage.setItem("cinemaMapTheme", darkMode ? "dark" : "light");
    document.documentElement.classList.toggle("light", !darkMode);
  }, [darkMode]);

  useEffect(() => {
    setDataSource("loading");
    const d = new Date();
    d.setDate(d.getDate() + filters.selectedDayIndex);
    const date = d.toISOString().slice(0, 10);
    fetch(`/api/showtimes?date=${date}`)
      .then((r) => r.json())
      .then(({ source, cinemas: data }) => {
        setCinemas(data);
        setDataSource(source);
      })
      .catch(() => {
        setDataSource("mock");
      });
  }, [filters.selectedDayIndex]);

  const [sheetHeight, setSheetHeight] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const isDragging = useRef(false);

  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(Math.max(e.clientX, 240), 600);
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  const [userLocation, setUserLocation] = useState(null);
  const [locationRadius, setLocationRadius] = useState(5);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const selectedDayName = getDayName(filters.selectedDayIndex);

  const cinemaDistances = useMemo(() => {
    if (!userLocation) return {};
    return Object.fromEntries(
      cinemas.map((c) => [c.id, haversineKm(userLocation.lat, userLocation.lng, c.lat, c.lng)])
    );
  }, [userLocation]);

  const handleRequestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support geolocation.");
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === 1 /* PERMISSION_DENIED */) {
          setLocationError("Location access was denied. Enable it in your browser settings and try again.");
        } else if (err.code === 2 /* POSITION_UNAVAILABLE */) {
          setLocationError("Your location couldn't be determined. Try again.");
        } else {
          setLocationError("Location request timed out. Please try again.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handleClearLocation = useCallback(() => {
    setUserLocation(null);
    setLocationError(null);
  }, []);

  const filteredCinemas = useMemo(() => {
    return cinemas.filter((cinema) => {
      if (userLocation) {
        const dist = cinemaDistances[cinema.id] ?? Infinity;
        if (dist > locationRadius) return false;
      }

      if (filters.priceRanges.length > 0 && !filters.priceRanges.includes(cinema.price_range)) return false;
      if (filters.chains.length > 0 && !filters.chains.includes(cinema.chain)) return false;
      if (filters.wheelchairOnly && !cinema.wheelchair_accessible) return false;
      if (filters.subtitledOnly && !cinema.has_subtitled_screenings) return false;
      if (filters.sensoryOnly && !cinema.has_sensory_friendly) return false;
      if (filters.discounts.length > 0) {
        const hasAll = filters.discounts.every((d) =>
          cinema.discounts.some((cd) => cd.toLowerCase().includes(d.toLowerCase()))
        );
        if (!hasAll) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matches =
          cinema.name.toLowerCase().includes(q) ||
          cinema.neighborhood.toLowerCase().includes(q) ||
          cinema.movies.some((m) => m.title.toLowerCase().includes(q));
        if (!matches) return false;
      }

      const hasShowingOnDay = cinema.movies.some((movie) =>
        movie.showtimes.some((st) => {
          if (st.day !== selectedDayName) return false;
          const genreMatch = filters.genres.length === 0 || filters.genres.includes(movie.genre);
          const timeMatch =
            filters.timePeriods.length === 0 ||
            filters.timePeriods.includes(getTimePeriod(st.time));
          const langMatch =
            !filters.language ||
            (filters.language === "English" && movie.language === "English") ||
            (filters.language === "Non-English" && movie.language !== "English") ||
            (filters.language === "Subtitled" && movie.has_subtitles);
          return genreMatch && timeMatch && langMatch;
        })
      );
      if (!hasShowingOnDay) return false;

      return true;
    });
  }, [filters, selectedDayName, userLocation, locationRadius, cinemaDistances]);

  const handleCinemaSelect = useCallback((cinema) => {
    // Spread to always produce a new reference so FlyToSelected's effect re-runs
    // even when the same cinema is selected twice in a row.
    setSelectedCinema({ ...cinema });
  }, []);

  return (
    <main className={`flex flex-col h-screen w-screen overflow-hidden ${darkMode ? "bg-[#0d1117]" : "bg-gray-100"}`}>
      {/* Mobile-only floating header — fixed so the map extends behind it */}
      <header className="md:hidden fixed top-0 inset-x-0 h-12 flex items-center justify-between px-4 z-[1002]">
        <span
          className="text-white text-sm font-semibold tracking-wide"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.4)" }}
        >
          The London Cinema Map
        </span>
        <div className="flex items-center gap-1">
          {/* Contact */}
          <button
            onClick={() => setShowContact(true)}
            title="Get in touch"
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow border border-gray-200/60 flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          {/* Info */}
          <button
            onClick={() => setShowInfo(true)}
            title="About this app"
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow border border-gray-200/60 flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="8" strokeLinecap="round" strokeWidth={2.5} />
              <line x1="12" y1="12" x2="12" y2="16" strokeLinecap="round" />
            </svg>
          </button>
          {/* Dark/light toggle */}
          <button
            onClick={() => setDarkMode((d) => !d)}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow border border-gray-200/60 flex items-center justify-center hover:bg-white transition-colors"
          >
            {darkMode ? (
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Content row */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          filters={filters}
          setFilters={setFilters}
          filteredCinemas={filteredCinemas}
          selectedDayName={selectedDayName}
          onCinemaSelect={handleCinemaSelect}
          userLocation={userLocation}
          locationRadius={locationRadius}
          locationLoading={locationLoading}
          locationError={locationError}
          cinemaDistances={cinemaDistances}
          onRequestLocation={handleRequestLocation}
          onClearLocation={handleClearLocation}
          onRadiusChange={setLocationRadius}
          dataSource={dataSource}
          darkMode={darkMode}
          width={sidebarWidth}
          className="hidden md:flex"
        />
        <div
          onMouseDown={handleResizeMouseDown}
          className={`hidden md:block w-1 shrink-0 cursor-col-resize transition-colors ${
            darkMode ? "bg-gray-700 hover:bg-blue-500" : "bg-gray-300 hover:bg-blue-400"
          }`}
        />
        <div className="flex-1 relative min-h-0">
          <Map
            cinemas={filteredCinemas}
            selectedCinema={selectedCinema}
            selectedDayName={selectedDayName}
            userLocation={userLocation}
            locationRadius={locationRadius}
            cinemaDistances={cinemaDistances}
            darkMode={darkMode}
            bottomSheetHeight={sheetHeight}
          />
          {/* Contact button — desktop only */}
          <button
            onClick={() => setShowContact(true)}
            title="Get in touch"
            className="hidden md:flex absolute top-4 right-28 z-[1001] w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/80 hover:bg-white items-center justify-center transition-colors"
          >
            <svg className={`w-5 h-5 ${darkMode ? "text-slate-600" : "text-gray-500"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Info button — desktop only */}
          <button
            onClick={() => setShowInfo(true)}
            title="About this app"
            className="hidden md:flex absolute top-4 right-16 z-[1001] w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/80 hover:bg-white items-center justify-center transition-colors"
          >
            <svg className={`w-5 h-5 ${darkMode ? "text-slate-600" : "text-gray-500"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="8" strokeLinecap="round" strokeWidth={2.5} />
              <line x1="12" y1="12" x2="12" y2="16" strokeLinecap="round" />
            </svg>
          </button>

          {/* Dark/light toggle — desktop only */}
          <button
            onClick={() => setDarkMode((d) => !d)}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="hidden md:flex absolute top-4 right-4 z-[1001] w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/80 hover:bg-white items-center justify-center transition-colors"
          >
            {darkMode ? (
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>

        <div className="md:hidden">
          <MobileBottomSheet
            filters={filters}
            setFilters={setFilters}
            filteredCinemas={filteredCinemas}
            selectedDayName={selectedDayName}
            onCinemaSelect={handleCinemaSelect}
            userLocation={userLocation}
            locationRadius={locationRadius}
            locationLoading={locationLoading}
            locationError={locationError}
            cinemaDistances={cinemaDistances}
            onRequestLocation={handleRequestLocation}
            onClearLocation={handleClearLocation}
            onRadiusChange={setLocationRadius}
            dataSource={dataSource}
            darkMode={darkMode}
            onSnapChange={setSheetHeight}
          />
        </div>
      </div>

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} darkMode={darkMode} />}
      {showContact && <ContactModal onClose={() => setShowContact(false)} darkMode={darkMode} />}
    </main>
  );
}
