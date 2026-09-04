"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CinemaPopup from "./CinemaPopup";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function createCinemaIcon(priceRange) {
  const color =
    priceRange === "£" ? "#10b981"
    : priceRange === "££" ? "#f59e0b"
    : "#ef4444";

  const html = `<div style="
    width:13px;height:13px;border-radius:50%;
    background:${color};
    border:2.5px solid rgba(255,255,255,0.9);
    box-shadow:0 1px 5px rgba(0,0,0,0.4);
  "></div>`;

  return L.divIcon({ html, className: "", iconSize: [13, 13], iconAnchor: [6, 6], popupAnchor: [0, -10] });
}

// Pulsing dot icon for the user's position
const userLocationIcon = L.divIcon({
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#6366f1;border:3px solid #a5b4fc;
    box-shadow:0 0 0 6px rgba(99,102,241,0.25);
  "></div>`,
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FlyToSelected({ cinema, markerRefs }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!cinema) return;
    const sameId = cinema.id === prev.current;
    prev.current = cinema.id;

    if (sameId) {
      // Already at this cinema — skip the fly and open popup directly.
      markerRefs.current[cinema.id]?.openPopup();
      return;
    }

    map.flyTo([cinema.lat, cinema.lng], 15, { animate: true, duration: 0.8 });

    // Open the popup only after the fly animation settles so PopupAutoPan
    // can measure and correct the popup position without fighting the animation.
    let done = false;
    const open = () => {
      if (done) return;
      done = true;
      markerRefs.current[cinema.id]?.openPopup();
    };
    map.once("moveend", open);
    const fallback = setTimeout(open, 900); // if moveend doesn't fire (already at target)
    return () => { map.off("moveend", open); clearTimeout(fallback); };
  }, [cinema, map, markerRefs]);
  return null;
}

function PopupAutoPan({ bottomSheetHeight }) {
  const map = useMap();
  const bsRef = useRef(bottomSheetHeight);
  useEffect(() => { bsRef.current = bottomSheetHeight; });

  useEffect(() => {
    function onPopupOpen(e) {
      requestAnimationFrame(() => {
        const el = e.popup.getElement();
        if (!el) return;
        const mapRect = map.getContainer().getBoundingClientRect();
        const pr = el.getBoundingClientRect();
        const { x: mapW, y: mapH } = map.getSize();
        const bsHeight = bsRef.current;

        const topInMap = pr.top - mapRect.top;
        const botInMap = pr.bottom - mapRect.top;
        const leftInMap = pr.left - mapRect.left;
        const rightInMap = pr.right - mapRect.left;

        const isMobile = window.innerWidth < 768;
        let panX = 0, panY = 0;

        if (isMobile) {
          // On mobile, centre the popup in the visible area between the
          // floating header (48px + 10px gap = 58px) and the bottom sheet.
          const topPad = 58;
          const visibleBot = mapH - bsHeight - 10;
          const popupH = botInMap - topInMap;
          const visibleH = visibleBot - topPad;
          // Target top: centred, but never above topPad
          const targetTop = topPad + Math.max(0, (visibleH - popupH) / 2);
          panY = topInMap - targetTop;
        } else {
          if (topInMap < 10) panY = topInMap - 10;
          else if (botInMap > mapH - bsHeight - 10) panY = botInMap - (mapH - bsHeight - 10);
        }
        if (leftInMap < 5) panX = leftInMap - 5;
        else if (rightInMap > mapW - 5) panX = rightInMap - (mapW - 5);

        if (Math.abs(panX) > 1 || Math.abs(panY) > 1) {
          map.panBy([panX, panY], { animate: true, duration: 0.3 });
        }
      });
    }
    map.on("popupopen", onPopupOpen);
    return () => map.off("popupopen", onPopupOpen);
  }, [map]);

  return null;
}

function FlyToUser({ userLocation }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (userLocation) {
      const key = `${userLocation.lat},${userLocation.lng}`;
      if (key !== prev.current) {
        prev.current = key;
        map.flyTo([userLocation.lat, userLocation.lng], 13, { animate: true, duration: 1 });
      }
    }
  }, [userLocation, map]);
  return null;
}

export default function Map({ cinemas, selectedCinema, selectedDayName, userLocation, locationRadius, cinemaDistances, darkMode, bottomSheetHeight = 0 }) {
  const markerRefs = useRef({});

  return (
    <MapContainer center={[51.505, -0.09]} zoom={13} className="h-full w-full" zoomControl={false}>
      <TileLayer
        key={darkMode ? "dark" : "light"}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={darkMode
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
      />

      <FlyToSelected cinema={selectedCinema} markerRefs={markerRefs} />
      <FlyToUser userLocation={userLocation} />
      <PopupAutoPan bottomSheetHeight={bottomSheetHeight} />

      {/* User location: radius ring + dot */}
      {userLocation && (
        <>
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={(locationRadius ?? 5) * 1000}
            pathOptions={{ color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.07, weight: 1.5, dashArray: "6 4" }}
          />
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon} zIndexOffset={1000} />
        </>
      )}

      {cinemas.map((cinema) => (
        <Marker
          key={cinema.id}
          position={[cinema.lat, cinema.lng]}
          icon={createCinemaIcon(cinema.price_range)}
          ref={(ref) => { if (ref) markerRefs.current[cinema.id] = ref; }}
        >
          <Popup minWidth={320} maxWidth={340} autoPan={false}>
            <CinemaPopup
              cinema={cinema}
              selectedDayName={selectedDayName}
              distance={cinemaDistances[cinema.id]}
              darkMode={darkMode}
            />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
