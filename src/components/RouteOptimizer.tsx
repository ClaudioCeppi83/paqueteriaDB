import React, { useState, useMemo } from "react";
import { 
  MapPin, 
  Navigation, 
  BarChart2, 
  ArrowRight, 
  Search, 
  Compass, 
  CheckCircle, 
  TrendingUp, 
  Sparkles, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink,
  Map,
  Layers,
  Award,
  Clock,
  ThumbsUp,
  AlertCircle
} from "lucide-react";
import { MorningReport, ParsedPackage, GoogleSheetsSettings } from "../types";

interface RouteOptimizerProps {
  morningReport: MorningReport | null;
  recentLogs: any[];
  googleSheetsSettings: GoogleSheetsSettings;
  accessToken?: string;
  onUpdatePackages: (packages: ParsedPackage[]) => void;
}

export default function RouteOptimizer({
  morningReport,
  recentLogs,
  googleSheetsSettings,
  accessToken,
  onUpdatePackages,
}: RouteOptimizerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [optimizationMode, setOptimizationMode] = useState<"default" | "sector" | "optimized">("default");
  const [completedStreets, setCompletedStreets] = useState<Record<string, boolean>>({});

  // 1. Core List of active packages
  const activePackages = useMemo(() => {
    return morningReport?.packages || [];
  }, [morningReport]);

  // Group packages by street to get unique stops
  const uniqueStops = useMemo(() => {
    const stopsMap: Record<string, { street: string; numbers: string[]; totalQty: number; statuses: string[] }> = {};
    
    activePackages.forEach((pkg) => {
      const key = pkg.street.toLowerCase().trim();
      if (!stopsMap[key]) {
        stopsMap[key] = {
          street: pkg.street,
          numbers: [],
          totalQty: 0,
          statuses: [],
        };
      }
      if (!stopsMap[key].numbers.includes(pkg.number)) {
        stopsMap[key].numbers.push(pkg.number);
      }
      stopsMap[key].totalQty += pkg.quantity;
      stopsMap[key].statuses.push(pkg.status);
    });

    return Object.values(stopsMap);
  }, [activePackages]);

  // Search filter
  const filteredStops = useMemo(() => {
    return uniqueStops.filter((stop) =>
      stop.street.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueStops, searchTerm]);

  // Optimization sequence state & algorithm
  const [orderedStopKeys, setOrderedStopKeys] = useState<string[]>([]);

  // Sync / Initialize sequence order when uniqueStops changes
  const stopsSequence = useMemo(() => {
    const defaultKeys = uniqueStops.map((s) => s.street.toLowerCase().trim());
    
    // If we have manual ordering already set and it matches, keep it. Otherwise reset.
    let keys = orderedStopKeys;
    const isSubset = keys.every(k => defaultKeys.includes(k)) && keys.length === defaultKeys.length;
    
    if (!isSubset || keys.length !== defaultKeys.length) {
      keys = [...defaultKeys];
    }

    // Apply smart sort if in optimizationMode === "optimized" or "sector"
    if (optimizationMode === "optimized") {
      // Sort alphabetically first, but group by similarities (heuristic clustering of nearby streets)
      keys.sort((a, b) => {
        // Try to cluster common words in streets (e.g. "Sant", "Mare", "Calle")
        const wordA = a.split(" ")[0] || "";
        const wordB = b.split(" ")[0] || "";
        if (wordA !== wordB) {
          return wordA.localeCompare(wordB);
        }
        return a.localeCompare(b);
      });
    } else if (optimizationMode === "sector") {
      // Group by typical sectors we recognize
      const getSectorScore = (street: string) => {
        const s = street.toLowerCase();
        if (s.includes("marc") || s.includes("sant marc")) return 1;
        if (s.includes("nostrum") || s.includes("mare nostrum")) return 2;
        if (s.includes("josep") || s.includes("sant josep")) return 3;
        if (s.includes("badalona")) return 4;
        return 5; // Default sector
      };
      keys.sort((a, b) => getSectorScore(a) - getSectorScore(b) || a.localeCompare(b));
    }

    return keys.map((key) => uniqueStops.find((s) => s.street.toLowerCase().trim() === key)).filter(Boolean) as typeof uniqueStops;
  }, [uniqueStops, optimizationMode, orderedStopKeys]);

  // Reorder helper
  const handleMove = (index: number, direction: "up" | "down") => {
    const keys = stopsSequence.map((s) => s.street.toLowerCase().trim());
    if (direction === "up" && index > 0) {
      const temp = keys[index];
      keys[index] = keys[index - 1];
      keys[index - 1] = temp;
    } else if (direction === "down" && index < keys.length - 1) {
      const temp = keys[index];
      keys[index] = keys[index + 1];
      keys[index + 1] = temp;
    }
    setOptimizationMode("default"); // Switch to manual customization mode
    setOrderedStopKeys(keys);
  };

  // Google Maps navigation generator (multi-stop deep link)
  const googleMapsUrl = useMemo(() => {
    if (stopsSequence.length === 0) return "";
    
    // Google Maps dir parameters: /maps/dir/Origin/Stop1/Stop2/Destination
    // Starting point is Badalona, Spain
    const origin = "Badalona, Spain";
    const destinations = stopsSequence
      .filter((s) => !completedStreets[s.street.toLowerCase().trim()]) // Only navigate to uncompleted stops
      .slice(0, 10) // Google Maps has a limit of 10 stops on mobile/free tier
      .map((s) => {
        const num = s.numbers[0] || "";
        return encodeURIComponent(`${s.street} ${num}, Badalona, Spain`);
      });

    if (destinations.length === 0) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Badalona, Spain")}`;
    
    return `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${destinations.join("/")}`;
  }, [stopsSequence, completedStreets]);

  // Update a package status (syncs back to state)
  const togglePackageStatusInStop = (streetName: string) => {
    const key = streetName.toLowerCase().trim();
    const isCurrentlyDone = !!completedStreets[key];
    const nextState = !isCurrentlyDone;
    
    setCompletedStreets(prev => ({
      ...prev,
      [key]: nextState
    }));

    // Also update actual package statuses in morning report so they sync with Sheets perfectly
    const updatedPackages = activePackages.map((pkg) => {
      if (pkg.street.toLowerCase().trim() === key) {
        return {
          ...pkg,
          status: (nextState ? "Entregado" : "Incidencia") as any
        };
      }
      return pkg;
    });

    onUpdatePackages(updatedPackages);
  };

  // 2. Statistics & Frequencies Calculations
  // Street frequencies from today's active list
  const activeStreetFrequencies = useMemo(() => {
    const freqs: Record<string, number> = {};
    activePackages.forEach((p) => {
      const s = p.street.trim();
      freqs[s] = (freqs[s] || 0) + p.quantity;
    });
    return Object.entries(freqs)
      .map(([street, count]) => ({ street, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [activePackages]);

  // Historical calculations from Google Sheets logs
  const historicalStats = useMemo(() => {
    if (!recentLogs || recentLogs.length === 0) {
      return {
        totalEarnings: 0,
        avgDelivered: 0,
        maxDelivered: 0,
        efficiency: 100,
        daysCount: 0
      };
    }

    let totalEarned = 0;
    let totalDelivered = 0;
    let totalReceived = 0;
    let maxDelivered = 0;
    const daysCount = recentLogs.length;

    recentLogs.forEach((log) => {
      const f = log.fields;
      const rec = Number(f.Recibidos || 0);
      const del = Number(f.Entregados || 0);
      const earn = Number(f.GeneradoEuro || 0);

      totalEarned += earn;
      totalDelivered += del;
      totalReceived += rec;
      if (del > maxDelivered) maxDelivered = del;
    });

    const efficiency = totalReceived > 0 ? Math.round((totalDelivered / totalReceived) * 100) : 100;
    const avgDelivered = daysCount > 0 ? Math.round(totalDelivered / daysCount) : 0;

    return {
      totalEarnings: totalEarned,
      avgDelivered,
      maxDelivered,
      efficiency,
      daysCount
    };
  }, [recentLogs]);

  // Progress metrics
  const completedCount = Object.values(completedStreets).filter(Boolean).length;
  const progressPercent = stopsSequence.length > 0 
    ? Math.round((completedCount / stopsSequence.length) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="route-optimizer-workspace">
      
      {/* LEFT & CENTER PANEL: Route planning and optimization */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="optimizer-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-600 animate-spin-slow" />
              Secuencia de Reparto Inteligente
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Como único repartidor, organiza tu secuencia de calles para evitar dar vueltas y optimizar tus tiempos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOptimizationMode("sector")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                optimizationMode === "sector" 
                  ? "bg-blue-50 text-blue-600 border-blue-200" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Por Sector
            </button>
            <button
              onClick={() => setOptimizationMode("optimized")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1 ${
                optimizationMode === "optimized" 
                  ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Agrupar
            </button>
          </div>
        </div>

        {/* Route Progress indicator */}
        {stopsSequence.length > 0 && (
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-auto">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Progreso de la Ruta</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-slate-900">{completedCount}</span>
                <span className="text-xs text-slate-500 font-medium">de {stopsSequence.length} calles completadas</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full md:flex-1 max-w-xs bg-slate-200 h-2.5 rounded-full overflow-hidden relative">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {/* Google Maps Multi-Stop Trigger */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/10 active:scale-[0.99] cursor-pointer shrink-0"
              id="google-maps-navigator-btn"
            >
              <Navigation className="w-4 h-4 fill-white" />
              <span>Navegar Ruta en Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Stop Filter Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar calle o sector en tu hoja de ruta..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition"
            id="search-stops-input"
          />
        </div>

        {stopsSequence.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
            <Map className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5]" />
            <p className="text-xs font-bold text-slate-800 mt-3">No hay paquetes activos para ordenar</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Pega e ingresa un mensaje de WhatsApp en la pestaña de registro para procesar y optimizar tu ruta diaria.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1" id="stops-sequence-list">
            {stopsSequence
              .filter((stop) => stop.street.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((stop, index) => {
                const stopKey = stop.street.toLowerCase().trim();
                const isCompleted = !!completedStreets[stopKey];
                
                return (
                  <div 
                    key={stopKey}
                    className={`flex items-center justify-between border rounded-xl p-3.5 transition group ${
                      isCompleted 
                        ? "bg-emerald-50/40 border-emerald-100 text-slate-500" 
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Interactive checkbox */}
                      <button
                        onClick={() => togglePackageStatusInStop(stop.street)}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition cursor-pointer ${
                          isCompleted 
                            ? "bg-emerald-500 border-emerald-500 text-white" 
                            : "border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-transparent"
                        }`}
                        title="Marcar como entregada"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>

                      {/* Visual Stop Number Badge */}
                      <span className="text-[10px] font-black font-mono w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                        {index + 1}
                      </span>

                      <div>
                        <span className={`text-xs font-extrabold ${isCompleted ? "line-through text-slate-400" : "text-slate-800"}`}>
                          {stop.street}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-bold">
                            Núm: {stop.numbers.join(", ")}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-500">{stop.totalQty} {stop.totalQty === 1 ? "paquete" : "paquetes"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Manual reordering controllers */}
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 cursor-pointer"
                        title="Mover arriba"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(index, "down")}
                        disabled={index === stopsSequence.length - 1}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 cursor-pointer"
                        title="Mover abajo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Route guidelines info box */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-[11px] leading-relaxed text-blue-900">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-950">Optimizando Badalona</p>
            <p className="mt-0.5 text-slate-600">
              Usa el botón <strong>"Navegar Ruta en Maps"</strong> para abrir un trayecto multi-paradas con las próximas 10 calles de tu secuencia directamente en tu teléfono. A medida que entregues, márcalas con el check de la izquierda para sacarlas de la navegación de Google Maps.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Statistics, Street Frequencies & Trends */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="optimizer-right">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-slate-400" />
            Análisis y Frecuencias
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Métricas de reparto acumuladas para optimizar tu carga de trabajo diaria.
          </p>
        </div>

        {/* Sub-section 1: Street frequency chart (Today) */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Calles más recurrentes (Hoy)</span>
            <span className="font-mono text-[10px] text-blue-600 font-extrabold">Uds</span>
          </h4>

          {activeStreetFrequencies.length === 0 ? (
            <div className="text-[11px] text-slate-400 py-4 text-center">
              No hay datos para calcular frecuencias de calles en la ruta de hoy.
            </div>
          ) : (
            <div className="space-y-3">
              {activeStreetFrequencies.map((item, i) => {
                const maxCount = activeStreetFrequencies[0]?.count || 1;
                const widthPercent = Math.max(12, Math.round((item.count / maxCount) * 100));
                
                return (
                  <div key={item.street} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate max-w-[160px]">{item.street}</span>
                      <span className="font-bold text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          i === 0 ? "bg-blue-600" : i === 1 ? "bg-indigo-500" : "bg-slate-400"
                        }`}
                        style={{ width: `${widthPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sub-section 2: Historical Personal Records */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Métricas de Rendimiento (Histórico)
          </h4>

          {historicalStats.daysCount === 0 ? (
            <div className="text-[11px] text-slate-400 py-4 text-center">
              Sincroniza tus reportes con Google Sheets para calcular las métricas históricas de tu rendimiento.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] font-bold">Día de Oro</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base font-black text-slate-950">{historicalStats.maxDelivered}</span>
                  <span className="text-[10px] text-slate-400 font-medium">entregas</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[10px] font-bold">Efectividad</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base font-black text-blue-600">{historicalStats.efficiency}%</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[10px] font-bold">Promedio diario</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base font-black text-slate-950">{historicalStats.avgDelivered}</span>
                  <span className="text-[10px] text-slate-400 font-medium">uds/día</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] font-bold">Total Facturado</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base font-black text-emerald-600">{historicalStats.totalEarnings.toFixed(2)}€</span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Info label */}
        {historicalStats.daysCount > 0 && (
          <div className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Métricas calculadas sobre los últimos {historicalStats.daysCount} días de reparto.</span>
          </div>
        )}
      </div>

    </div>
  );
}
