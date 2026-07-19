import React, { useEffect, useState, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import { MapPin, CheckCircle, Info, Settings, Sparkles, Navigation, AlertCircle } from "lucide-react";

// Fallback Badalona coordinates for common streets to ensure instant visual markers
const PRESET_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "sant josep": { lat: 41.4485, lng: 2.2472 },
  "mare nostrum": { lat: 41.4365, lng: 2.2384 },
  "sant marc": { lat: 41.4432, lng: 2.2415 },
  "alfonso xiii": { lat: 41.4398, lng: 2.2305 },
  "creu": { lat: 41.4502, lng: 2.2458 },
  "prim": { lat: 41.4474, lng: 2.2443 },
  "francesc layret": { lat: 41.4491, lng: 2.2482 },
  "badalona": { lat: 41.4500, lng: 2.2475 },
};

interface RouteMapProps {
  stops: Array<{
    street: string;
    numbers: string[];
    totalQty: number;
  }>;
  completedStreets: Record<string, boolean>;
  onToggleStop: (streetName: string) => void;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

/**
 * Inner Component that uses the Google Maps instance to geocode and draw markers/routes.
 */
function GoogleMapRenderer({
  stops,
  completedStreets,
  onToggleStop,
}: {
  stops: RouteMapProps["stops"];
  completedStreets: RouteMapProps["completedStreets"];
  onToggleStop: RouteMapProps["onToggleStop"];
}) {
  const map = useMap();
  const [geocodedStops, setGeocodedStops] = useState<
    Array<{
      street: string;
      numbers: string[];
      totalQty: number;
      lat: number;
      lng: number;
    }>
  >([]);

  // Geocode addresses when map is loaded and stops list changes
  useEffect(() => {
    if (!map) return;

    const geocoder = new window.google.maps.Geocoder();
    const results: typeof geocodedStops = [];

    const geocodePromises = stops.map(async (stop) => {
      const streetLower = stop.street.toLowerCase().trim();
      
      // Check preset coordinates first for instant lookup
      let coord = PRESET_COORDINATES[streetLower];
      if (!coord) {
        // Find matching partial key in preset coordinates
        const matchKey = Object.keys(PRESET_COORDINATES).find(k => streetLower.includes(k));
        if (matchKey) {
          coord = PRESET_COORDINATES[matchKey];
        }
      }

      if (coord) {
        return { ...stop, ...coord };
      }

      // If not in presets, query Google Geocoding API securely
      return new Promise<typeof stop & { lat: number; lng: number }>((resolve) => {
        geocoder.geocode(
          { address: `${stop.street}, Badalona, Spain` },
          (results, status) => {
            if (status === "OK" && results?.[0]?.geometry?.location) {
              const loc = results[0].geometry.location;
              resolve({
                ...stop,
                lat: loc.lat(),
                lng: loc.lng(),
              });
            } else {
              // Fallback to Badalona Center with random tiny offset to prevent overlap
              const randomOffsetLat = (Math.random() - 0.5) * 0.008;
              const randomOffsetLng = (Math.random() - 0.5) * 0.008;
              resolve({
                ...stop,
                lat: PRESET_COORDINATES["badalona"].lat + randomOffsetLat,
                lng: PRESET_COORDINATES["badalona"].lng + randomOffsetLng,
              });
            }
          }
        );
      });
    });

    Promise.all(geocodePromises).then((resolvedStops) => {
      setGeocodedStops(resolvedStops);

      // Fit map bounds to show all markers nicely
      if (resolvedStops.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        resolvedStops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
        map.fitBounds(bounds);
        // Prevent map from zooming too close if there is only 1 marker
        const listener = window.google.maps.event.addListener(map, "bounds_changed", () => {
          if (map.getZoom()! > 16) map.setZoom(15);
          window.google.maps.event.removeListener(listener);
        });
      }
    });
  }, [map, stops]);

  return (
    <>
      {geocodedStops.map((stop, index) => {
        const stopKey = stop.street.toLowerCase().trim();
        const isCompleted = !!completedStreets[stopKey];

        return (
          <AdvancedMarker
            key={stop.street}
            position={{ lat: stop.lat, lng: stop.lng }}
            title={`${index + 1}. ${stop.street}`}
            onClick={() => onToggleStop(stop.street)}
          >
            <div className="cursor-pointer transition hover:scale-110 active:scale-95">
              <Pin
                background={isCompleted ? "#10b981" : "#2563eb"}
                borderColor={isCompleted ? "#064e3b" : "#1e3a8a"}
                glyphColor="#ffffff"
                glyph={(index + 1).toString()}
              />
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

export default function RouteMap({ stops, completedStreets, onToggleStop }: RouteMapProps) {
  // Center of Badalona, Spain
  const defaultCenter = { lat: 41.4500, lng: 2.2475 };

  // Local state for interactive fallback vector stops
  const fallbackVectorStops = useMemo(() => {
    return stops.map((stop, i) => {
      const streetLower = stop.street.toLowerCase().trim();
      let preset = PRESET_COORDINATES[streetLower];
      if (!preset) {
        const matchKey = Object.keys(PRESET_COORDINATES).find(k => streetLower.includes(k));
        preset = matchKey ? PRESET_COORDINATES[matchKey] : PRESET_COORDINATES["badalona"];
      }

      // Project Badalona lat/lng to neat canvas grid coordinates (percentages)
      // Lat: 41.4320 to 41.4560 (South to North)
      // Lng: 2.2250 to 2.2600 (West to East)
      const latMin = 41.4320;
      const latMax = 41.4560;
      const lngMin = 2.2250;
      const lngMax = 2.2600;

      // Add slight jitter based on index so overlapping fallback items separate
      const jitterLat = (i * 0.0013) % 0.005;
      const jitterLng = (i * 0.0019) % 0.006;

      const yPct = 100 - ((preset.lat + jitterLat - latMin) / (latMax - latMin)) * 100;
      const xPct = ((preset.lng + jitterLng - lngMin) / (lngMax - lngMin)) * 100;

      return {
        ...stop,
        x: Math.min(90, Math.max(10, xPct)),
        y: Math.min(85, Math.max(15, yPct)),
      };
    });
  }, [stops]);

  if (!hasValidKey) {
    // --- CRAFTED FALLBACK INTERACTIVE VECTOR ROUTE MAP ---
    return (
      <div className="border border-slate-200 bg-slate-900 rounded-2xl overflow-hidden relative shadow-sm" id="fallback-route-map">
        
        {/* Dark High-Contrast Tech theme style */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="p-4 bg-slate-800 border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs font-black text-slate-200">Visor de Ruta Interactivo (Badalona Digital)</span>
          </div>

          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Mapa en Modo Local (Falta Google Maps API Key)
          </span>
        </div>

        {/* Vector SVG Grid canvas containing connected delivery stop vertices */}
        <div className="h-[360px] relative flex items-center justify-center p-6 bg-slate-950/90 select-none">
          {stops.length === 0 ? (
            <div className="text-center space-y-2 max-w-xs">
              <MapPin className="w-8 h-8 text-slate-600 mx-auto stroke-[1.5]" />
              <p className="text-xs font-bold text-slate-400">Sin direcciones para mapear</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Procesa un mensaje de WhatsApp en la pestaña de registro para visualizar la ruta aquí de forma dinámica.
              </p>
            </div>
          ) : (
            <div className="w-full h-full relative border border-slate-800/60 rounded-xl bg-slate-900/40 overflow-hidden">
              
              {/* Connected Route Paths (SVG lines) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* Draw sequential route connections between active uncompleted stop coordinates */}
                {fallbackVectorStops.map((stop, i) => {
                  if (i === 0) return null;
                  const prevStop = fallbackVectorStops[i - 1];
                  return (
                    <line
                      key={`path-${i}`}
                      x1={`${prevStop.x}%`}
                      y1={`${prevStop.y}%`}
                      x2={`${stop.x}%`}
                      y2={`${stop.y}%`}
                      stroke="url(#routeGrad)"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      className="animate-pulse"
                    />
                  );
                })}
              </svg>

              {/* Connected Stop Pins */}
              {fallbackVectorStops.map((stop, index) => {
                const stopKey = stop.street.toLowerCase().trim();
                const isCompleted = !!completedStreets[stopKey];

                return (
                  <button
                    key={stop.street}
                    onClick={() => onToggleStop(stop.street)}
                    style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 transform hover:scale-115 active:scale-95 focus:outline-none cursor-pointer"
                    id={`vector-stop-btn-${index}`}
                  >
                    {/* Ring Pulse Effect */}
                    {!isCompleted && (
                      <span className="absolute -inset-2.5 bg-blue-500/20 rounded-full animate-ping duration-1000 pointer-events-none"></span>
                    )}

                    {/* Node Core */}
                    <div className={`w-8 h-8 rounded-full border shadow-xl flex items-center justify-center font-mono text-[11px] font-black transition ${
                      isCompleted
                        ? "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/10"
                        : "bg-blue-600 border-blue-500 text-white shadow-blue-500/20"
                    }`}>
                      {isCompleted ? <CheckCircle className="w-4 h-4 stroke-[2.5]" /> : index + 1}
                    </div>

                    {/* Rich tooltip labels displayed on hover */}
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition duration-200 z-30 w-44">
                      <p className="text-[10px] font-black text-slate-100 leading-snug truncate">
                        {stop.street}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        Números: {stop.numbers.join(", ")}
                      </p>
                      <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5 mt-1.5 font-sans">
                        <span className="text-[8px] uppercase font-bold text-slate-500">
                          {stop.totalQty} {stop.totalQty === 1 ? "bulto" : "bultos"}
                        </span>
                        <span className={`text-[8px] font-extrabold px-1 rounded ${isCompleted ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"}`}>
                          {isCompleted ? "Completado" : "Pendiente"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Integration Instructions */}
        <div className="p-4 bg-slate-850 border-t border-slate-700 space-y-3 relative z-10">
          <div className="flex items-start gap-2.5">
            <Settings className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-200 block">¿Cómo habilitar Google Maps real?</span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Esta aplicación soporta integración premium nativa con el mapa satelital de Google Maps. Sigue estos sencillos pasos para activarlo en tu sesión:
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-[10px] space-y-1.5 leading-relaxed text-slate-400">
            <p><strong>Paso 1:</strong> Obtén una clave de API en <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a>.</p>
            <p><strong>Paso 2:</strong> Ve a <strong>Ajustes (⚙️ icono arriba a la derecha)</strong> → pestaña <strong>Secrets</strong> → crea una variable con el nombre exacto <code>GOOGLE_MAPS_PLATFORM_KEY</code> y pega tu valor.</p>
            <p><strong>Paso 3:</strong> La aplicación se compilará con Google Maps real en pocos segundos sin necesidad de recargar la pestaña.</p>
          </div>
        </div>

      </div>
    );
  }

  // --- PREMIUM GOOGLE MAPS ACTIVE ENGINE ---
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden relative shadow-sm" id="google-maps-engine" style={{ height: "450px" }}>
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={14}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
          style={{ width: "100%", height: "100%" }}
          gestureHandling="cooperative"
          disableDefaultUI={false}
        >
          <GoogleMapRenderer
            stops={stops}
            completedStreets={completedStreets}
            onToggleStop={onToggleStop}
          />
        </Map>
      </APIProvider>
    </div>
  );
}
