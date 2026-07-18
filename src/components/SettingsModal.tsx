import React, { useState } from "react";
import { X, Save, FileSpreadsheet, Shield, CheckCircle, AlertTriangle, Key, Mail, RefreshCw, PlusCircle, ExternalLink } from "lucide-react";
import { GoogleSheetsSettings, GoogleAuthSettings } from "../types";
import { createSpreadsheet, testSheetsConnection } from "../utils/googleSheets";

interface SettingsModalProps {
  onClose: () => void;
  googleSheetsSettings: GoogleSheetsSettings;
  googleSettings: GoogleAuthSettings;
  onSaveGoogleSheets: (settings: GoogleSheetsSettings) => void;
  onSaveGoogle: (settings: GoogleAuthSettings) => void;
  accessToken?: string;
}

export default function SettingsModal({
  onClose,
  googleSheetsSettings,
  googleSettings,
  onSaveGoogleSheets,
  onSaveGoogle,
  accessToken,
}: SettingsModalProps) {
  const [spreadsheetId, setSpreadsheetId] = useState(googleSheetsSettings.spreadsheetId || "");
  const [deliveriesSheet, setDeliveriesSheet] = useState(googleSheetsSettings.deliveriesSheet || "Entregas");
  const [summariesSheet, setSummariesSheet] = useState(googleSheetsSettings.summariesSheet || "Resumen");

  const [clientId, setClientId] = useState(googleSettings.clientId || "");
  const [authorizedEmail, setAuthorizedEmail] = useState(googleSettings.authorizedEmail || "erceppi@gmail.com");

  const [creatingSheet, setCreatingSheet] = useState(false);
  const [testing, setTesting] = useState<string | null>(null); // "deliveries" | "summaries" | null
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSaveAll = () => {
    onSaveGoogleSheets({
      spreadsheetId,
      deliveriesSheet,
      summariesSheet,
    });
    onSaveGoogle({
      clientId,
      authorizedEmail,
    });
    onClose();
  };

  const handleCreateNewSpreadsheet = async () => {
    if (!accessToken) {
      setTestResult({
        type: "error",
        message: "Debes iniciar sesión con Google para crear una Hoja de Cálculo automáticamente.",
      });
      return;
    }

    setCreatingSheet(true);
    setTestResult(null);

    try {
      const result = await createSpreadsheet(
        accessToken,
        "Registro de Reparto - Claudio",
        deliveriesSheet,
        summariesSheet
      );
      setSpreadsheetId(result.spreadsheetId);
      setTestResult({
        type: "success",
        message: `¡Hoja de cálculo creada con éxito en tu Google Drive! Se ha configurado el ID de inmediato.`,
      });
    } catch (err: any) {
      setTestResult({
        type: "error",
        message: err.message || "Error al crear la Hoja de Cálculo en Google Drive.",
      });
    } finally {
      setCreatingSheet(false);
    }
  };

  const testConnection = async (sheetType: "deliveries" | "summaries") => {
    const sheetName = sheetType === "deliveries" ? deliveriesSheet : summariesSheet;
    
    if (!accessToken) {
      setTestResult({
        type: "error",
        message: "Debes iniciar sesión con Google para probar la conexión con tus Hojas de Cálculo.",
      });
      return;
    }
    
    if (!spreadsheetId) {
      setTestResult({
        type: "error",
        message: "Completa el ID de Google Spreadsheet primero o haz clic en 'Crear Nueva Hoja'.",
      });
      return;
    }

    setTesting(sheetType);
    setTestResult(null);

    try {
      await testSheetsConnection(accessToken, spreadsheetId, sheetName);
      setTestResult({
        type: "success",
        message: `¡Conexión exitosa! La pestaña "${sheetName}" es accesible y válida en Google Sheets.`,
      });
    } catch (err: any) {
      setTestResult({
        type: "error",
        message: err.message || "No se pudo conectar con Google Sheets.",
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
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Configuración del Sistema</h2>
              <p className="text-xs text-slate-500">Administra tu base de datos de Google Sheets y seguridad.</p>
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
          
          {/* Google Sheets Segment */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Sincronización con Google Sheets
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                  <span>Google Spreadsheet ID (ID de la Hoja de Cálculo)</span>
                  {spreadsheetId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] font-normal"
                    >
                      Abrir Hoja <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="1xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-xs outline-none font-mono text-slate-750 transition"
                    id="sheets-spreadsheet-id-input"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewSpreadsheet}
                    disabled={creatingSheet || !accessToken}
                    className="bg-emerald-50 hover:bg-emerald-100 disabled:bg-slate-50 border border-emerald-200 disabled:border-slate-200 text-emerald-700 disabled:text-slate-400 font-semibold px-4.5 py-2.5 rounded-xl flex items-center gap-2 transition text-xs cursor-pointer disabled:cursor-not-allowed"
                    title={!accessToken ? "Inicia sesión con Google para usar esta función" : "Crea una hoja automáticamente en tu Google Drive"}
                  >
                    {creatingSheet ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> : <PlusCircle className="w-4 h-4" />}
                    Crear Nueva Hoja
                  </button>
                </div>
                {!accessToken && (
                  <p className="text-[10px] text-amber-600">
                    * Inicia sesión con Google para crear o probar la sincronización de manera automática.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Nombre de pestaña de Paquetes</label>
                <input
                  type="text"
                  value={deliveriesSheet}
                  onChange={(e) => setDeliveriesSheet(e.target.value)}
                  placeholder="Entregas"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm outline-none text-slate-700 transition"
                  id="sheets-deliveries-sheet-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Nombre de pestaña de Resumen Diario</label>
                <input
                  type="text"
                  value={summariesSheet}
                  onChange={(e) => setSummariesSheet(e.target.value)}
                  placeholder="Resumen"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm outline-none text-slate-700 transition"
                  id="sheets-summaries-sheet-input"
                />
              </div>
              
              {/* Test buttons */}
              <div className="md:col-span-2 flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => testConnection("deliveries")}
                  disabled={testing !== null || !accessToken}
                  className="bg-slate-100 hover:bg-slate-200 disabled:opacity-55 border border-slate-200 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  id="test-deliveries-sheet"
                >
                  {testing === "deliveries" ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Probar Pestaña Entregas
                </button>
                <button
                  type="button"
                  onClick={() => testConnection("summaries")}
                  disabled={testing !== null || !accessToken}
                  className="bg-slate-100 hover:bg-slate-200 disabled:opacity-55 border border-slate-200 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  id="test-summaries-sheet"
                >
                  {testing === "summaries" ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Probar Pestaña Resumen
                </button>
              </div>
            </div>
          </div>

          {/* Google Sheets Layout Info Card */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4 text-xs text-slate-600 space-y-2 leading-relaxed">
            <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Estructura Automática de Columnas
            </h4>
            <p>
              La aplicación creará y dará formato automáticamente a las pestañas y las columnas requeridas:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1.5">
              <li>
                <strong>Pestaña de Entregas</strong>: Columnas: <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">Fecha</code>, <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">Calle</code>, <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">Numero</code>, <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">Cantidad</code>, <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">Estado</code>, <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">Sector</code>.
              </li>
              <li>
                <strong>Pestaña de Resumen</strong>: Columnas: <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">Fecha</code>, <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">CodigoPostal</code>, <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">Recibidos</code>, <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">Entregados</code>, <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">Incidencias</code>, <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">GeneradoEuro</code>, <code className="text-emerald-700 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">RolRepartidor</code>.
              </li>
            </ul>
          </div>

          {/* Google Sign-In Secrets Segment */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Seguridad y Google Login
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  Google Client ID
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
              <span className="break-words leading-normal">{testResult.message}</span>
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
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/15 transition active:scale-[0.98] cursor-pointer"
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
