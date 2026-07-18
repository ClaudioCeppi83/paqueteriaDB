import React, { useState } from "react";
import { X, Save, Database, Shield, CheckCircle, AlertTriangle, Key, Mail, RefreshCw } from "lucide-react";
import { AirtableSettings, GoogleAuthSettings } from "../types";

interface SettingsModalProps {
  onClose: () => void;
  airtableSettings: AirtableSettings;
  googleSettings: GoogleAuthSettings;
  onSaveAirtable: (settings: AirtableSettings) => void;
  onSaveGoogle: (settings: GoogleAuthSettings) => void;
}

export default function SettingsModal({
  onClose,
  airtableSettings,
  googleSettings,
  onSaveAirtable,
  onSaveGoogle,
}: SettingsModalProps) {
  const [pat, setPat] = useState(airtableSettings.pat);
  const [baseId, setBaseId] = useState(airtableSettings.baseId);
  const [deliveriesTable, setDeliveriesTable] = useState(airtableSettings.deliveriesTable || "Entregas");
  const [summariesTable, setSummariesTable] = useState(airtableSettings.summariesTable || "Resúmenes");

  const [clientId, setClientId] = useState(googleSettings.clientId);
  const [authorizedEmail, setAuthorizedEmail] = useState(googleSettings.authorizedEmail || "erceppi@gmail.com");

  const [testing, setTesting] = useState<string | null>(null); // "deliveries" | "summaries" | null
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSaveAll = () => {
    onSaveAirtable({
      pat,
      baseId,
      deliveriesTable,
      summariesTable,
    });
    onSaveGoogle({
      clientId,
      authorizedEmail,
    });
    onClose();
  };

  const testConnection = async (tableType: "deliveries" | "summaries") => {
    const table = tableType === "deliveries" ? deliveriesTable : summariesTable;
    if (!pat || !baseId || !table) {
      setTestResult({
        type: "error",
        message: "Completa el Personal Access Token (PAT), Base ID y el nombre de la tabla primero.",
      });
      return;
    }

    setTesting(tableType);
    setTestResult(null);

    try {
      const response = await fetch("/api/airtable/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pat, baseId, table }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          type: "success",
          message: `¡Conexión exitosa! La tabla "${table}" es válida en Airtable.`,
        });
      } else {
        setTestResult({
          type: "error",
          message: data.error || "No se pudo establecer conexión con Airtable.",
        });
      }
    } catch (err: any) {
      setTestResult({
        type: "error",
        message: err.message || "Error al conectar con el proxy del servidor.",
      });
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans" id="settings-backdrop">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Configuración del Sistema</h2>
              <p className="text-xs text-slate-500">Administra tus claves de Airtable y seguridad de Google.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition"
            id="close-settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 bg-white">
          
          {/* Airtable Segment */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4" />
              Sincronización con Airtable
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  Personal Access Token (PAT) de Airtable
                  <span className="text-slate-400 text-[10px] font-normal">(Empieza con pat...)</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={pat}
                    onChange={(e) => setPat(e.target.value)}
                    placeholder="patXXXXXXXX.XXXXXXXXXXXXXXXXX..."
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm outline-none font-mono text-blue-600 transition"
                    id="airtable-pat-input"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Airtable Base ID</label>
                <input
                  type="text"
                  value={baseId}
                  onChange={(e) => setBaseId(e.target.value)}
                  placeholder="appXXXXXXXXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm outline-none font-mono text-slate-700 transition"
                  id="airtable-base-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Tabla de Paquetes (Entregas)</label>
                <input
                  type="text"
                  value={deliveriesTable}
                  onChange={(e) => setDeliveriesTable(e.target.value)}
                  placeholder="Entregas"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm outline-none text-slate-700 transition"
                  id="airtable-deliveries-table-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Tabla de Resumen Diario</label>
                <input
                  type="text"
                  value={summariesTable}
                  onChange={(e) => setSummariesTable(e.target.value)}
                  placeholder="Resúmenes"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm outline-none text-slate-700 transition"
                  id="airtable-summaries-table-input"
                />
              </div>
              
              {/* Test buttons */}
              <div className="md:col-span-2 flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => testConnection("deliveries")}
                  disabled={testing !== null}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  id="test-deliveries-connection"
                >
                  {testing === "deliveries" ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Probar Tabla Entregas
                </button>
                <button
                  type="button"
                  onClick={() => testConnection("summaries")}
                  disabled={testing !== null}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  id="test-summaries-connection"
                >
                  {testing === "summaries" ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Probar Tabla Resumen
                </button>
              </div>
            </div>
          </div>

          {/* Airtable Schema Hint Card */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-xs text-slate-600 space-y-2 leading-relaxed">
            <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" />
              Estructura sugerida en Airtable para Claudio
            </h4>
            <p>
              Crea dos tablas en tu base de Airtable para guardar los datos automáticamente:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1.5">
              <li>
                <strong>Tabla de Entregas</strong>: Columnas: <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">Fecha</code> (Tipo Fecha), <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">Calle</code> (Línea simple), <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">Numero</code> (Línea simple), <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">Cantidad</code> (Número), <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">Estado</code> (Texto), <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">Sector</code> (Texto).
              </li>
              <li>
                <strong>Tabla de Resumen</strong>: Columnas: <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">Fecha</code> (Tipo Fecha), <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">CodigoPostal</code> (Línea simple), <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">Recibidos</code> (Número), <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">Entregados</code> (Número), <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">Incidencias</code> (Número), <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">GeneradoEuro</code> (Moneda), <code className="text-blue-700 font-semibold bg-blue-100/50 px-1 py-0.5 rounded">RolRepartidor</code> (Línea simple).
              </li>
            </ul>
          </div>

          {/* Google Sign-In Secrets Segment */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Seguridad y Google Login
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  Google Client ID (Para usar login real de Google)
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="1234567890-abc123xyz.apps.googleusercontent.com"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm outline-none font-mono text-xs text-slate-700 transition"
                  id="google-client-id-input"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  Correo Electrónico Autorizado (Gmail de Claudio)
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                </label>
                <input
                  type="email"
                  value={authorizedEmail}
                  onChange={(e) => setAuthorizedEmail(e.target.value)}
                  placeholder="erceppi@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm outline-none text-slate-700 transition"
                  id="authorized-email-input"
                />
              </div>
            </div>
          </div>

          {/* Test results display */}
          {testResult && (
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border text-xs leading-relaxed ${
                testResult.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {testResult.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="break-words">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer"
            id="cancel-settings"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveAll}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-600/15 transition active:scale-[0.98] cursor-pointer"
            id="save-settings-submit"
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
