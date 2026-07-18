import React, { useState } from "react";
import { 
  Clipboard, 
  Sparkles, 
  Save, 
  Trash2, 
  Plus, 
  MapPin, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  TrendingUp, 
  FileText,
  RefreshCw,
  Edit2
} from "lucide-react";
import { MorningReport, AfternoonReport, ParsedPackage, AirtableSettings } from "../types";
import { 
  safeFetch, 
  clientParseMorning, 
  clientParseAfternoon, 
  clientAirtableSaveDeliveries, 
  clientAirtableSaveSummary 
} from "../utils/apiFallback";

interface DeliveryParserProps {
  airtableSettings: AirtableSettings;
  onMorningParsed: (report: MorningReport) => void;
  onAfternoonParsed: (report: AfternoonReport) => void;
  morningReport: MorningReport | null;
  afternoonReport: AfternoonReport | null;
  setMorningReport: React.Dispatch<React.SetStateAction<MorningReport | null>>;
  setAfternoonReport: React.Dispatch<React.SetStateAction<AfternoonReport | null>>;
}

export default function DeliveryParser({
  airtableSettings,
  onMorningParsed,
  onAfternoonParsed,
  morningReport,
  afternoonReport,
  setMorningReport,
  setAfternoonReport,
}: DeliveryParserProps) {
  const [morningText, setMorningText] = useState("");
  const [afternoonText, setAfternoonText] = useState("");
  
  const [loadingMorning, setLoadingMorning] = useState(false);
  const [loadingAfternoon, setLoadingAfternoon] = useState(false);
  
  const [morningSyncStatus, setMorningSyncStatus] = useState<{ type: "idle" | "saving" | "success" | "error"; message?: string }>({ type: "idle" });
  const [afternoonSyncStatus, setAfternoonSyncStatus] = useState<{ type: "idle" | "saving" | "success" | "error"; message?: string }>({ type: "idle" });

  const [newPackage, setNewPackage] = useState<Partial<ParsedPackage>>({ street: "", number: "", quantity: 1, status: "Entregado" });
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  });

  // Example inputs as requested by user
  const loadMorningExample = () => {
    setMorningText(`Claudio

Almeria:
S/N
56
52
Eucaristic:
29 x2
Modrego:
2
5
21
22
24
27
37
Montroig:
117
Industria:
378
400
Sant Marc:
3
15
Mare Nostrum:
17
21
Mar Egea:
10
Pereda:
21
Ruyra:
1 x2
Placa de la cros:
12
Tirrena:
3
5 x2
Maristany:
296
323
Mar de Alboranv:
6

Total: 30`);
  };

  const loadAfternoonExample = () => {
    setAfternoonText(` Claudio 
08918
17/07/2025
Recibidos:30
*Incidencias:1
Entregados:29`);
  };

  // Parsing morning message
  const handleParseMorning = async () => {
    if (!morningText.trim()) return;
    setLoadingMorning(true);
    setMorningSyncStatus({ type: "idle" });

    try {
      const result = await safeFetch<any>(
        "/api/parse",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: morningText, type: "morning" }),
        },
        async () => ({ source: "client-fallback", data: clientParseMorning(morningText) })
      );

      if (result && result.data) {
        // Enforce the package format
        const formattedPackages = result.data.packages.map((p: any) => ({
          street: p.street || "Calle Desconocida",
          number: String(p.number || "S/N"),
          quantity: Number(p.quantity || 1),
          status: "Entregado", // Default status
        }));

        const report: MorningReport = {
          packages: formattedPackages,
          totalCount: Number(result.data.totalCount || formattedPackages.reduce((a: any, b: any) => a + b.quantity, 0)),
          messageTotal: Number(result.data.messageTotal || 0),
        };

        onMorningParsed(report);
      } else {
        alert(result?.error || "No se pudo procesar el mensaje matutino");
      }
    } catch (err: any) {
      alert("Error de red al procesar el mensaje de la mañana");
    } finally {
      setLoadingMorning(false);
    }
  };

  // Parsing afternoon message
  const handleParseAfternoon = async () => {
    if (!afternoonText.trim()) return;
    setLoadingAfternoon(true);
    setAfternoonSyncStatus({ type: "idle" });

    try {
      const result = await safeFetch<any>(
        "/api/parse",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: afternoonText, type: "afternoon" }),
        },
        async () => ({ source: "client-fallback", data: clientParseAfternoon(afternoonText) })
      );

      if (result && result.data) {
        const report: AfternoonReport = {
          postalCode: result.data.postalCode || "08918",
          date: result.data.date || new Date().toLocaleDateString("es-ES"),
          received: Number(result.data.received || 0),
          incidents: Number(result.data.incidents || 0),
          delivered: Number(result.data.delivered || 0),
          earnings: Number(result.data.earnings || 0),
        };

        // Convert the parsed Date of format DD/MM/YYYY into YYYY-MM-DD for selectedDate
        if (report.date) {
          const parts = report.date.split("/");
          if (parts.length === 3) {
            setSelectedDate(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`);
          }
        }

        onAfternoonParsed(report);
      } else {
        alert(result?.error || "No se pudo procesar el mensaje de la tarde");
      }
    } catch (err: any) {
      alert("Error de red al procesar el mensaje de la tarde");
    } finally {
      setLoadingAfternoon(false);
    }
  };

  // Airtable Sync for Individual Packages (Morning Report)
  const handleSyncMorningToAirtable = async () => {
    if (!morningReport || morningReport.packages.length === 0) return;
    if (!airtableSettings.pat || !airtableSettings.baseId || !airtableSettings.deliveriesTable) {
      setMorningSyncStatus({
        type: "error",
        message: "Por favor, configura las credenciales de Airtable en Ajustes primero.",
      });
      return;
    }

    setMorningSyncStatus({ type: "saving" });

    // Inject dates and status
    const recordsToSave = morningReport.packages.map((pkg) => ({
      date: selectedDate,
      street: pkg.street,
      number: pkg.number,
      quantity: pkg.quantity,
      status: pkg.status,
    }));

    try {
      const result = await safeFetch<any>(
        "/api/airtable/save-deliveries",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pat: airtableSettings.pat,
            baseId: airtableSettings.baseId,
            table: airtableSettings.deliveriesTable,
            records: recordsToSave,
          }),
        },
        () => clientAirtableSaveDeliveries(
          airtableSettings.pat,
          airtableSettings.baseId,
          airtableSettings.deliveriesTable,
          recordsToSave
        )
      );

      if (result && result.status === "ok") {
        setMorningSyncStatus({
          type: "success",
          message: `Sincronizados correctamente ${result.count} paquetes en tu Airtable.`,
        });
      } else {
        setMorningSyncStatus({
          type: "error",
          message: result?.error || "Error al sincronizar con Airtable.",
        });
      }
    } catch (err: any) {
      setMorningSyncStatus({
        type: "error",
        message: err.message || "Error al conectar con el servidor o Airtable.",
      });
    }
  };

  // Airtable Sync for Daily Summary (Afternoon Report)
  const handleSyncAfternoonToAirtable = async () => {
    if (!afternoonReport) return;
    if (!airtableSettings.pat || !airtableSettings.baseId || !airtableSettings.summariesTable) {
      setAfternoonSyncStatus({
        type: "error",
        message: "Por favor, configura las credenciales de Airtable en Ajustes primero.",
      });
      return;
    }

    setAfternoonSyncStatus({ type: "saving" });

    const summaryWithDate = {
      ...afternoonReport,
      date: selectedDate,
    };

    try {
      const result = await safeFetch<any>(
        "/api/airtable/save-summary",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pat: airtableSettings.pat,
            baseId: airtableSettings.baseId,
            table: airtableSettings.summariesTable,
            summary: summaryWithDate,
          }),
        },
        () => clientAirtableSaveSummary(
          airtableSettings.pat,
          airtableSettings.baseId,
          airtableSettings.summariesTable,
          summaryWithDate
        )
      );

      if (result && result.status === "ok") {
        setAfternoonSyncStatus({
          type: "success",
          message: `Sincronizado resumen diario en Airtable. Id: ${result.record?.id || "Exitoso"}`,
        });
      } else {
        setAfternoonSyncStatus({
          type: "error",
          message: result?.error || "Error al guardar el resumen diario en Airtable.",
        });
      }
    } catch (err: any) {
      setAfternoonSyncStatus({
        type: "error",
        message: err.message || "Error de red al conectar con el servidor o Airtable.",
      });
    }
  };

  // Helpers to edit packages list locally
  const handleDeletePackage = (index: number) => {
    if (!morningReport) return;
    const updated = [...morningReport.packages];
    updated.splice(index, 1);
    const newTotal = updated.reduce((sum, p) => sum + p.quantity, 0);
    setMorningReport({
      ...morningReport,
      packages: updated,
      totalCount: newTotal,
    });
  };

  const handleUpdatePackageField = (index: number, field: keyof ParsedPackage, value: any) => {
    if (!morningReport) return;
    const updated = [...morningReport.packages];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    
    const newTotal = updated.reduce((sum, p) => sum + p.quantity, 0);
    setMorningReport({
      ...morningReport,
      packages: updated,
      totalCount: newTotal,
    });
  };

  const handleAddPackage = () => {
    if (!newPackage.street) return;
    const added: ParsedPackage = {
      street: newPackage.street,
      number: newPackage.number || "S/N",
      quantity: Number(newPackage.quantity || 1),
      status: (newPackage.status as any) || "Entregado",
    };

    if (morningReport) {
      const updated = [...morningReport.packages, added];
      setMorningReport({
        ...morningReport,
        packages: updated,
        totalCount: updated.reduce((sum, p) => sum + p.quantity, 0),
      });
    } else {
      setMorningReport({
        packages: [added],
        totalCount: added.quantity,
        messageTotal: added.quantity,
      });
    }

    setNewPackage({ street: "", number: "", quantity: 1, status: "Entregado" });
    setIsAddingPackage(false);
  };

  return (
    <div className="space-y-6 font-sans text-slate-800" id="parser-container">
      
      {/* Configuration & Date Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div>
            <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">Fecha de los reportes</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-1.5 text-sm outline-none text-slate-800 mt-1 transition"
              id="report-date-selector"
            />
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={loadMorningExample}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
            id="load-morning-demo"
          >
            Mañana Demo
          </button>
          <button
            onClick={loadAfternoonExample}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
            id="load-afternoon-demo"
          >
            Tarde Demo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PANEL DE MAÑANA (ENTREGAS) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden" id="morning-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Reporte de Mañana (Entregas)
            </h3>
            <span className="text-xs text-slate-500">Pega tu mensaje matutino</span>
          </div>

          <textarea
            value={morningText}
            onChange={(e) => setMorningText(e.target.value)}
            placeholder="Pega el mensaje de WhatsApp de la mañana aquí...&#10;Ejemplo:&#10;Almeria:&#10;S/N&#10;56&#10;Eucaristic:&#10;29 x2"
            rows={8}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl p-4 text-xs font-mono text-slate-850 placeholder-slate-400 outline-none resize-none transition"
            id="morning-textarea"
          />

          <button
            onClick={handleParseMorning}
            disabled={loadingMorning || !morningText.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 text-white font-semibold text-xs rounded-xl py-3 flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/10 cursor-pointer disabled:cursor-not-allowed"
            id="parse-morning-btn"
          >
            {loadingMorning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Procesando mensaje con IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Procesar Mensaje Matutino</span>
              </>
            )}
          </button>

          {/* Parsed packages review list */}
          {morningReport && (
            <div className="space-y-4 pt-2 border-t border-slate-100 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Listado de Paquetes ({morningReport.packages.length})
                  </h4>
                  <p className="text-[10px] text-slate-400">Revisa, edita y ajusta los detalles antes de subir a Airtable.</p>
                </div>
                
                <button
                  onClick={() => setIsAddingPackage(!isAddingPackage)}
                  className="px-2 py-1 text-xs font-semibold bg-slate-100 text-blue-600 rounded-lg hover:bg-slate-200 flex items-center gap-1 transition"
                  id="toggle-add-package"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Añadir
                </button>
              </div>

              {/* Add Custom Package Inline Form */}
              {isAddingPackage && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-blue-600">Añadir Paquete Manualmente</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Calle (ej. Almeria)"
                      value={newPackage.street || ""}
                      onChange={(e) => setNewPackage({ ...newPackage, street: e.target.value })}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Número (ej. 56 o S/N)"
                      value={newPackage.number || ""}
                      onChange={(e) => setNewPackage({ ...newPackage, number: e.target.value })}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Cantidad"
                      value={newPackage.quantity || 1}
                      onChange={(e) => setNewPackage({ ...newPackage, quantity: parseInt(e.target.value, 10) })}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none"
                    />
                    <select
                      value={newPackage.status || "Entregado"}
                      onChange={(e) => setNewPackage({ ...newPackage, status: e.target.value as any })}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 outline-none"
                    >
                      <option value="Entregado">Entregado</option>
                      <option value="Incidencia">Incidencia</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 text-xs pt-1">
                    <button
                      onClick={() => setIsAddingPackage(false)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddPackage}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold transition"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              )}

              {/* Editable Package Grid */}
              <div className="max-h-[350px] overflow-y-auto border border-slate-200 rounded-xl bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Calle</th>
                      <th className="p-3">Nº</th>
                      <th className="p-3 text-center w-16">Cant</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {morningReport.packages.map((pkg, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-3">
                          <input
                            type="text"
                            value={pkg.street}
                            onChange={(e) => handleUpdatePackageField(idx, "street", e.target.value)}
                            className="bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-slate-50 px-1 py-0.5 text-slate-800 outline-none rounded w-full"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={pkg.number}
                            onChange={(e) => handleUpdatePackageField(idx, "number", e.target.value)}
                            className="bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-slate-50 px-1 py-0.5 text-slate-800 outline-none rounded w-20"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            value={pkg.quantity}
                            onChange={(e) => handleUpdatePackageField(idx, "quantity", parseInt(e.target.value, 10))}
                            className="bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-slate-50 px-1 py-0.5 text-center text-slate-800 outline-none rounded w-10"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleUpdatePackageField(idx, "status", pkg.status === "Entregado" ? "Incidencia" : "Entregado")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pkg.status === "Entregado" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"
                            }`}
                          >
                            {pkg.status}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeletePackage(idx)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sync controls */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleSyncMorningToAirtable}
                  disabled={morningSyncStatus.type === "saving"}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl py-3 flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/15 active:scale-[0.99] cursor-pointer"
                  id="sync-morning-airtable-btn"
                >
                  {morningSyncStatus.type === "saving" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Sincronizando con Airtable...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-white" />
                      <span>Sincronizar {morningReport.packages.length} Entregas en Airtable</span>
                    </>
                  )}
                </button>

                {morningSyncStatus.message && (
                  <div
                    className={`p-3.5 border rounded-xl text-xs flex items-start gap-2.5 leading-relaxed ${
                      morningSyncStatus.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    {morningSyncStatus.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{morningSyncStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PANEL DE TARDE (RESUMEN) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden" id="afternoon-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Reporte de Tarde (Cierre del Día)
            </h3>
            <span className="text-xs text-slate-500">Pega tu mensaje vespertino</span>
          </div>

          <textarea
            value={afternoonText}
            onChange={(e) => setAfternoonText(e.target.value)}
            placeholder="Pega el mensaje de WhatsApp de la tarde aquí...&#10;Ejemplo:&#10;Claudio&#10;08918&#10;17/07/2025&#10;Recibidos:30&#10;*Incidencias:1&#10;Entregados:29"
            rows={8}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-4 text-xs font-mono text-slate-850 placeholder-slate-400 outline-none resize-none transition"
            id="afternoon-textarea"
          />

          <button
            onClick={handleParseAfternoon}
            disabled={loadingAfternoon || !afternoonText.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/40 text-white font-semibold text-xs rounded-xl py-3 flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/10 cursor-pointer disabled:cursor-not-allowed"
            id="parse-afternoon-btn"
          >
            {loadingAfternoon ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Procesando resumen con IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Procesar Resumen de la Tarde</span>
              </>
            )}
          </button>

          {/* Parsed summary review form */}
          {afternoonReport && (
            <div className="space-y-4 pt-2 border-t border-slate-100 mt-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Resumen Diario Extraído
                </h4>
                <p className="text-[10px] text-slate-400">Verifica los valores correspondientes al reporte general de tu día.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-800">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Código Postal</span>
                  <input
                    type="text"
                    value={afternoonReport.postalCode}
                    onChange={(e) => setAfternoonReport({ ...afternoonReport, postalCode: e.target.value })}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Fecha Reporte</span>
                  <input
                    type="text"
                    value={afternoonReport.date}
                    onChange={(e) => setAfternoonReport({ ...afternoonReport, date: e.target.value })}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Recibidos</span>
                  <input
                    type="number"
                    value={afternoonReport.received}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setAfternoonReport({ ...afternoonReport, received: val });
                    }}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Entregados</span>
                  <input
                    type="number"
                    value={afternoonReport.delivered}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      const earnings = Number((val * 0.70).toFixed(2));
                      setAfternoonReport({ ...afternoonReport, delivered: val, earnings });
                    }}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Incidencias</span>
                  <input
                    type="number"
                    value={afternoonReport.incidents}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setAfternoonReport({ ...afternoonReport, incidents: val });
                    }}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Generado (€)</span>
                  <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-blue-600 flex items-center justify-between">
                    <span>{afternoonReport.earnings.toFixed(2)}€</span>
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Sync controls */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleSyncAfternoonToAirtable}
                  disabled={afternoonSyncStatus.type === "saving"}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl py-3 flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/15 active:scale-[0.99] cursor-pointer"
                  id="sync-afternoon-airtable-btn"
                >
                  {afternoonSyncStatus.type === "saving" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Sincronizando con Airtable...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-white" />
                      <span>Sincronizar Resumen Diario en Airtable</span>
                    </>
                  )}
                </button>

                {afternoonSyncStatus.message && (
                  <div
                    className={`p-3.5 border rounded-xl text-xs flex items-start gap-2.5 leading-relaxed ${
                      afternoonSyncStatus.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    {afternoonSyncStatus.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{afternoonSyncStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
