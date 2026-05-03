import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MapPin, Navigation, Hospital, Pill, Stethoscope,
  Loader2, AlertTriangle, LocateFixed, Search, X,
} from "lucide-react";

export const Route = createFileRoute("/nearby")({ component: Nearby });

/* ── Types ─────────────────────────────────── */
type Filter = "hospital" | "clinic" | "pharmacy";
type Coords = { lat: number; lng: number };
type Place = {
  id: number; name: string; address: string;
  lat: number; lng: number; type: Filter;
  distance: number; phone?: string; opening_hours?: string;
};
type GeoResult = { display_name: string; lat: string; lon: string };

/* ── Constants ─────────────────────────────── */
const FILTER_META: Record<Filter, {
  icon: any; en: string; hi: string; overpassTag: string; color: string; emoji: string;
}> = {
  hospital: { icon: Hospital,    en: "Hospitals", hi: "अस्पताल",  overpassTag: '"amenity"="hospital"',       color: "#ef4444", emoji: "🏥" },
  clinic:   { icon: Stethoscope, en: "Clinics",   hi: "क्लीनिक",  overpassTag: '"amenity"~"clinic|doctors"', color: "#3b82f6", emoji: "🩺" },
  pharmacy: { icon: Pill,        en: "Pharmacy",  hi: "फार्मेसी", overpassTag: '"amenity"="pharmacy"',       color: "#22c55e", emoji: "💊" },
};

/* ── Helpers ───────────────────────────────── */
function haversine(a: Coords, b: Coords) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

/* ── Overpass fetch ────────────────────────── */
async function fetchPlaces(center: Coords, filter: Filter): Promise<Place[]> {
  const tag = FILTER_META[filter].overpassTag;
  const query = `[out:json][timeout:15];
    (node[${tag}](around:5000,${center.lat},${center.lng});
     way[${tag}](around:5000,${center.lat},${center.lng});
     relation[${tag}](around:5000,${center.lat},${center.lng}););
    out center body 40;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error("Overpass API error");
  const data = await res.json();
  return data.elements
    .map((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!lat || !lng) return null;
      const tags = el.tags || {};
      const addrParts = [tags["addr:street"], tags["addr:city"], tags["addr:postcode"]].filter(Boolean);
      return {
        id: el.id, name: tags.name || FILTER_META[filter].en,
        address: addrParts.join(", ") || tags["addr:full"] || "",
        lat, lng, type: filter, distance: haversine(center, { lat, lng }),
        phone: tags.phone || tags["contact:phone"],
        opening_hours: tags.opening_hours,
      } as Place;
    })
    .filter(Boolean)
    .sort((a: Place, b: Place) => a.distance - b.distance);
}

/* ── Nominatim geocode ─────────────────────── */
async function geocodeSearch(q: string): Promise<GeoResult[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
    { headers: { "Accept-Language": "en" } }
  );
  if (!res.ok) return [];
  return res.json();
}

/* ── Component ─────────────────────────────── */
function Nearby() {
  const { lang } = useLanguage();

  // Leaflet loaded dynamically (client-only) to avoid SSR window error
  const L = useRef<any>(null);

  const mapRef       = useRef<HTMLDivElement>(null);
  const mapInst      = useRef<any>(null);
  const markerLayer  = useRef<any>(null);
  const searchPin    = useRef<any>(null);
  const radiusCircle = useRef<any>(null);

  const [filter,      setFilter]      = useState<Filter>("hospital");
  const [places,      setPlaces]      = useState<Place[]>([]);
  const [center,      setCenter]      = useState<Coords | null>(null);
  const [gps,         setGps]         = useState<Coords | null>(null);
  const [mapReady,    setMapReady]    = useState(false);
  const [placesLoad,  setPlacesLoad]  = useState(false);
  const [err,         setErr]         = useState<string | null>(null);
  const [selectedId,  setSelectedId]  = useState<number | null>(null);

  const [query,       setQuery]       = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searchLoad,  setSearchLoad]  = useState(false);
  const searchTimeout = useRef<any>(null);

  /* ── Helper: build icons with Leaflet ────── */
  const makeIcon = useCallback((color: string, emoji: string) => {
    if (!L.current) return undefined;
    return L.current.divIcon({
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -34],
      html: `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;
        background:${color};border-radius:50% 50% 50% 4px;transform:rotate(-45deg);
        box-shadow:0 3px 14px ${color}88;border:2.5px solid #fff;">
        <span style="transform:rotate(45deg);font-size:16px;">${emoji}</span></div>`,
    });
  }, []);

  const makePinIcon = useCallback(() => {
    if (!L.current) return undefined;
    return L.current.divIcon({
      className: "",
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -32],
      html: `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;
        background:#6366f1;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);
        box-shadow:0 4px 16px #6366f199;border:3px solid #fff;">
        <span style="transform:rotate(45deg);font-size:15px;">📌</span></div>`,
    });
  }, []);

  /* ── Move search center ──────────────────── */
  const moveToCoords = useCallback((coords: Coords, label?: string) => {
    const Lref = L.current;
    const map  = mapInst.current;
    if (!Lref || !map) return;

    setCenter(coords);
    map.setView([coords.lat, coords.lng], 14, { animate: true, duration: 0.7 });

    // Remove old pin + circle
    searchPin.current?.remove();
    radiusCircle.current?.remove();

    // Draggable pin
    const pin = Lref.marker([coords.lat, coords.lng], {
      icon: makePinIcon(), draggable: true, zIndexOffset: 500,
    }).addTo(map);
    pin.bindPopup(
      `<div style="padding:10px 14px;font-weight:600;">📌 ${label || (lang === "hi" ? "चुना गया स्थान" : "Selected Location")}</div>`
    ).openPopup();
    pin.on("dragend", (e: any) => {
      const { lat, lng } = e.target.getLatLng();
      moveToCoords({ lat, lng }, lang === "hi" ? "खींचा गया स्थान" : "Dragged Location");
    });
    searchPin.current = pin;

    // 5 km radius circle
    radiusCircle.current = Lref.circle([coords.lat, coords.lng], {
      radius: 5000, color: "#6366f1", weight: 1.5,
      fillColor: "#6366f1", fillOpacity: 0.06,
    }).addTo(map);
  }, [lang, makePinIcon]);

  /* ── Init Leaflet (client-only) ──────────── */
  useEffect(() => {
    if (typeof window === "undefined" || mapInst.current) return;

    // Dynamically import Leaflet — avoids SSR window error
    import("leaflet").then((leafletModule) => {
      const Lref = leafletModule.default;
      L.current = Lref;

      if (!mapRef.current) return;

      const map = Lref.map(mapRef.current, {
        center: [22.5, 80.3], zoom: 5, zoomControl: false,
      });

      Lref.control.zoom({ position: "bottomright" }).addTo(map);

      Lref.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markerLayer.current = Lref.layerGroup().addTo(map);
      mapInst.current = map;
      setMapReady(true);

      // Click on map → set location
      map.on("click", (e: any) => {
        moveToCoords(
          { lat: e.latlng.lat, lng: e.latlng.lng },
          lang === "hi" ? "क्लिक किया स्थान" : "Clicked Location"
        );
      });

      // GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setGps(coords);

            const dotIcon = Lref.divIcon({
              className: "",
              iconSize: [18, 18],
              html: '<div class="user-pulse"></div>',
            });
            Lref.marker([coords.lat, coords.lng], { icon: dotIcon, zIndexOffset: 1000 })
              .addTo(map)
              .bindPopup(
                `<div style="padding:10px 14px;font-weight:600;">📍 ${lang === "hi" ? "आपका GPS स्थान" : "Your GPS Location"}</div>`
              );
            moveToCoords(coords, lang === "hi" ? "आपका स्थान" : "Your Location");
          },
          () => {},
          { timeout: 8000 }
        );
      }
    });

    return () => {
      mapInst.current?.remove();
      mapInst.current = null;
    };
  }, []); // run once on mount

  /* ── Fetch places when center or filter changes */
  useEffect(() => {
    if (!center) return;
    let cancelled = false;
    setPlacesLoad(true);
    setErr(null);

    fetchPlaces(center, filter)
      .then((results) => {
        if (cancelled) return;
        setPlaces(results);
        markerLayer.current?.clearLayers();
        const icon = makeIcon(FILTER_META[filter].color, FILTER_META[filter].emoji);
        results.forEach((p) => {
          const m = L.current?.marker([p.lat, p.lng], { icon }).addTo(markerLayer.current);
          m?.bindPopup(`
            <div style="padding:14px 16px;min-width:200px;">
              <div style="font-weight:700;font-size:.95rem;margin-bottom:5px;">${p.name}</div>
              ${p.address ? `<div style="font-size:.78rem;color:#64748b;margin-bottom:8px;">${p.address}</div>` : ""}
              <div style="font-size:.78rem;color:#64748b;margin-bottom:10px;">
                📍 ${p.distance.toFixed(1)} km${p.phone ? ` &nbsp;|&nbsp; 📞 ${p.phone}` : ""}
              </div>
              ${p.opening_hours ? `<div style="font-size:.74rem;color:#94a3b8;margin-bottom:10px;">🕐 ${p.opening_hours}</div>` : ""}
              <a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank"
                style="display:inline-flex;align-items:center;gap:4px;padding:6px 14px;background:#3b82f6;
                  color:#fff;border-radius:8px;font-size:.78rem;font-weight:600;text-decoration:none;">
                🧭 ${lang === "hi" ? "दिशा-निर्देश" : "Directions"}
              </a>
            </div>`);
          m?.on("click", () => setSelectedId(p.id));
        });
      })
      .catch((e) => { if (!cancelled) setErr(e.message || "Failed to load"); })
      .finally(() => { if (!cancelled) setPlacesLoad(false); });

    return () => { cancelled = true; };
  }, [center, filter, lang, makeIcon]);

  /* ── Search input handler ────────────────── */
  const handleSearchChange = (val: string) => {
    setQuery(val);
    clearTimeout(searchTimeout.current);
    if (val.length < 3) { setSuggestions([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoad(true);
      const results = await geocodeSearch(val);
      setSuggestions(results);
      setSearchLoad(false);
    }, 400);
  };

  const selectSuggestion = (r: GeoResult) => {
    setSuggestions([]);
    setQuery(r.display_name.split(",")[0]);
    moveToCoords({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) }, r.display_name.split(",")[0]);
  };

  const useGPS = () => {
    if (gps) { moveToCoords(gps, lang === "hi" ? "आपका स्थान" : "Your Location"); return; }
    navigator.geolocation?.getCurrentPosition((pos) => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setGps(c);
      moveToCoords(c, lang === "hi" ? "आपका स्थान" : "Your Location");
    });
  };

  const panToCard = (p: Place) => {
    setSelectedId(p.id);
    mapInst.current?.setView([p.lat, p.lng], 16, { animate: true, duration: 0.7 });
    markerLayer.current?.eachLayer((layer: any) => {
      const ll = layer.getLatLng?.();
      if (ll && Math.abs(ll.lat - p.lat) < 0.0001 && Math.abs(ll.lng - p.lng) < 0.0001)
        layer.openPopup();
    });
  };

  /* ── Render ──────────────────────────────── */
  return (
    <MobileShell>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight md:text-2xl">
          {lang === "hi" ? "आस-पास स्वास्थ्य केंद्र" : "Nearby Healthcare"}
        </h2>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full text-xs" onClick={useGPS}>
          <LocateFixed className="h-3.5 w-3.5" />
          {lang === "hi" ? "GPS" : "Use GPS"}
        </Button>
      </div>

      {/* Location Search Bar */}
      <div className="relative mb-5">
        <div className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 shadow-sm ring-1 ring-border focus-within:ring-primary focus-within:ring-2 transition-all">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={
              lang === "hi"
                ? "शहर या पता खोजें… या नक्शे पर क्लिक करें"
                : "Search city or address… or click on map"
            }
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searchLoad && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {query && !searchLoad && (
            <button onClick={() => { setQuery(""); setSuggestions([]); }}>
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border bg-card shadow-xl">
            {suggestions.map((r, i) => (
              <button
                key={i}
                onClick={() => selectSuggestion(r)}
                className="flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm transition-colors last:border-0 hover:bg-accent"
              >
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="line-clamp-1">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hint */}
      {!center && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <MapPin className="h-5 w-5 shrink-0" />
          {lang === "hi"
            ? "GPS बटन दबाएं, पता खोजें, या नक्शे पर कहीं भी क्लिक करें"
            : "Press GPS, search an address, or click anywhere on the map to start"}
        </div>
      )}

      {/* Filter Chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(FILTER_META) as Filter[]).map((key) => {
          const meta = FILTER_META[key];
          const Icon = meta.icon;
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                active
                  ? "scale-105 bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {lang === "hi" ? meta.hi : meta.en}
              {active && !placesLoad && center && (
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                  {places.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: Place list */}
        <div className="flex-1 lg:max-w-md">
          {placesLoad && (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              {lang === "hi" ? "आस-पास खोज रहे हैं…" : "Searching nearby…"}
            </div>
          )}
          {err && (
            <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />{err}
              </div>
            </Card>
          )}
          {!placesLoad && !err && center && places.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <MapPin className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {lang === "hi" ? "कुछ नहीं मिला। दूसरी श्रेणी आज़माएं।" : "No places found. Try another category."}
              </p>
            </div>
          )}

          <div className="custom-scrollbar space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-300px)]">
            {places.map((p) => (
              <Card
                key={p.id}
                onClick={() => panToCard(p)}
                className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg ${
                  selectedId === p.id ? "border-primary/50 bg-primary/5 shadow-lg ring-1 ring-primary/20" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold leading-tight">{p.name}</p>
                    {p.address && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.address}</p>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" />
                        <span className="font-medium">{p.distance.toFixed(1)} km</span>
                      </div>
                      {p.opening_hours && (
                        <span className="max-w-[140px] truncate text-[10px]">🕐 {p.opening_hours}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0 rounded-xl hover:bg-primary hover:text-primary-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`,
                        "_blank"
                      );
                    }}
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Map */}
        <div className="flex-[2]">
          <Card className="map-container sticky top-24 overflow-hidden rounded-3xl shadow-xl">
            <div ref={mapRef} className="h-80 w-full bg-muted md:h-[500px] lg:h-[600px]" />
          </Card>
          {!mapReady && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {lang === "hi" ? "नक्शा लोड हो रहा है…" : "Loading map…"}
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
