import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Database, 
  LogOut, 
  Settings, 
  Truck, 
  Package, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Info,
  Calendar,
  RefreshCw,
  Compass,
  BarChart2,
  FileSpreadsheet
} from "lucide-react";
import { GoogleSheetsSettings, GoogleAuthSettings, UserSession, MorningReport, AfternoonReport, ParsedPackage } from "./types";
import GoogleSignIn from "./components/GoogleSignIn";
import SettingsModal from "./components/SettingsModal";
import DeliveryParser from "./components/DeliveryParser";
import DeliveryStats from "./components/DeliveryStats";
import RouteOptimizer from "./components/RouteOptimizer";
import SheetsSelectorModal from "./components/SheetsSelectorModal";
import { getRecentSummaryLogs, findOrCreateAppSpreadsheet } from "./utils/googleSheets";

export default function App() {
  // Navigation / Tabs state
  const [activeTab, setActiveTab] = useState<"register" | "optimize">("register");

  // Session State loaded from LocalStorage
  const [session, setSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem("delivery_app_session");
    return saved ? JSON.parse(saved) : { email: "", name: "", picture: "", loggedIn: false, method: "local" };
  });

  // Google Sheets Credentials saved securely in user's browser localStorage
  const [googleSheetsSettings, setGoogleSheetsSettings] = useState<GoogleSheetsSettings>(() => {
    const saved = localStorage.getItem("delivery_sheets_settings");
    return saved ? JSON.parse(saved) : { spreadsheetId: "", deliveriesSheet: "Entregas", summariesSheet: "Resumen" };
  });

  // Google OAuth Credentials
  const [googleSettings, setGoogleSettings] = useState<GoogleAuthSettings>(() => {
    const saved = localStorage.getItem("delivery_google_settings");
    return saved ? JSON.parse(saved) : { clientId: "", authorizedEmail: "erceppi@gmail.com" };
  });

  // Parse state
  const [morningReport, setMorningReport] = useState<MorningReport | null>(null);
  const [afternoonReport, setAfternoonReport] = useState<AfternoonReport | null>(null);

  // Modal display State
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Recent logs state
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Sync state changes with local storage
  useEffect(() => {
    localStorage.setItem("delivery_app_session", JSON.stringify(session));
  }, [session]);

  const handleSaveGoogleSheets = (settings: GoogleSheetsSettings) => {
    setGoogleSheetsSettings(settings);
    localStorage.setItem("delivery_sheets_settings", JSON.stringify(settings));
  };

  const handleSaveGoogle = (settings: GoogleAuthSettings) => {
    setGoogleSettings(settings);
    localStorage.setItem("delivery_google_settings", JSON.stringify(settings));
  };

  const [showSheetsSelector, setShowSheetsSelector] = useState(false);
  const [autoProvisionSuccess, setAutoProvisionSuccess] = useState<string | null>(null);
  const [isAutoProvisioning, setIsAutoProvisioning] = useState(false);
  const [autoProvisionError, setAutoProvisionError] = useState<string | null>(null);

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem("delivery_gemini_api_key") || "";
  });

  const handleSaveGeminiApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem("delivery_gemini_api_key", key);
  };

  // Automatically search or create Google Sheets when the user logs in
  useEffect(() => {
    async function runAutoProvision() {
      if (session.loggedIn && session.accessToken && !googleSheetsSettings.spreadsheetId && !isAutoProvisioning) {
        setIsAutoProvisioning(true);
        setAutoProvisionError(null);
        setAutoProvisionSuccess(null);
        try {
          const result = await findOrCreateAppSpreadsheet(session.accessToken, "Entregas", "Resumen");
          const newSettings: GoogleSheetsSettings = {
            spreadsheetId: result.spreadsheetId,
            deliveriesSheet: "Entregas",
            summariesSheet: "Resumen"
          };
          setGoogleSheetsSettings(newSettings);
          localStorage.setItem("delivery_sheets_settings", JSON.stringify(newSettings));
          setAutoProvisionSuccess(
            result.isNew 
              ? `¡Creado nuevo libro "${result.name}" en tu Google Drive y vinculado con éxito!`
              : `¡Vinculado al libro "${result.name}" existente en Google Drive con éxito!`
          );
        } catch (err: any) {
          console.error("Error auto provisioning:", err);
          setAutoProvisionError(err.message || "Error al buscar o crear la hoja de cálculo.");
        } finally {
          setIsAutoProvisioning(false);
        }
      }
    }
    runAutoProvision();
  }, [session.loggedIn, session.accessToken, googleSheetsSettings.spreadsheetId]);

  const handleLogout = () => {
    setSession({ email: "", name: "", picture: "", loggedIn: false, method: "local" });
    localStorage.removeItem("delivery_app_session");
  };

  // Fetch recent records from Google Sheets to show in App History
  const fetchRecentRecords = async () => {
    if (!session.accessToken || !googleSheetsSettings.spreadsheetId || !googleSheetsSettings.summariesSheet) {
      return;
    }
    setLoadingLogs(true);
    setLogsError(null);

    try {
      const records = await getRecentSummaryLogs(
        session.accessToken,
        googleSheetsSettings.spreadsheetId,
        googleSheetsSettings.summariesSheet,
        5
      );
      setRecentLogs(records);
    } catch (err: any) {
      setLogsError(err.message || "Error al conectar con Google Sheets.");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (session.loggedIn && session.accessToken && googleSheetsSettings.spreadsheetId) {
      fetchRecentRecords();
    }
  }, [session.loggedIn, session.accessToken, googleSheetsSettings]);

  if (!session.loggedIn) {
    return (
      <GoogleSignIn
        onLogin={setSession}
        clientId={googleSettings.clientId}
        authorizedEmail={googleSettings.authorizedEmail}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Background Grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40 pointer-events-none"></div>

      {/* Modern Header Nav Bar */}
      <header className="relative border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/10">
              <Truck className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 block">
                Delivery Rport <span className="text-blue-600">Software</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sector Badalona</span>
            </div>
          </div>

          {/* User Info & Options */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-xl">
              <img
                src={session.picture}
                alt={session.name}
                className="w-5 h-5 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="text-xs font-semibold text-slate-700">{session.name}</span>
              <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-200 font-bold px-1.5 py-0.5 rounded uppercase">
                {session.method}
              </span>
            </div>

            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="Instrucciones y Ayuda"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="Ajustes de conexión"
              id="open-settings-btn"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition"
              title="Cerrar sesión"
              id="logout-btn"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Dashboard Space */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8 z-10">
        
        {/* Help Panel */}
        {showHelp && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm text-xs text-slate-600 leading-relaxed">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Guía de Uso Rápido - Delivery Rport Software
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-slate-800 font-bold"
              >
                Cerrar
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-mono text-[10px]">1</span>
                  Pegar el Mensaje Matutino
                </div>
                <p>
                  Pega el texto de WhatsApp que recibes con el listado de calles y paquetes de la mañana. La IA extraerá automáticamente cada dirección, el número de casa y la cantidad. Podrás corregir cualquier error en la tabla editable antes de sincronizar.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-mono text-[10px]">2</span>
                  Pegar el Reporte de la Tarde
                </div>
                <p>
                  Pega el mensaje con el resumen del cierre del día (Recibidos, Entregados, Incidencias). El software calculará automáticamente tus ingresos diarios multiplicando el total de entregados por <strong>0,70 euros</strong>.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-mono text-[10px]">3</span>
                  Sincronizar con Airtable
                </div>
                <p>
                  Haz clic en sincronizar en cada uno de los paneles para guardar los datos de manera persistente en tus respectivas tablas de Airtable. Tus claves y tokens se guardan de forma local y segura en el navegador.
                </p>
              </div>
            </div>
          </div>
        )}



        {autoProvisionSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm text-emerald-800">¡Configuración completada!</p>
                <p className="mt-0.5 text-slate-600">{autoProvisionSuccess}</p>
              </div>
            </div>
            <button 
              onClick={() => setAutoProvisionSuccess(null)}
              className="text-xs text-emerald-600 hover:underline font-bold cursor-pointer"
            >
              Entendido
            </button>
          </div>
        )}

        {/* Auto-provisioning loading state */}
        {isAutoProvisioning && (
          <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl flex items-center gap-4 animate-pulse">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            <div className="text-xs text-blue-900">
              <p className="font-bold text-sm text-blue-950">Configurando tu espacio de Google Drive y Sheets automáticamente...</p>
              <p className="mt-0.5 text-slate-600">Buscando o creando el libro "Registro de Reparto - erceppiDEV" de forma transparente.</p>
            </div>
          </div>
        )}

        {autoProvisionError && (
          <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-rose-900">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold text-sm text-rose-800">No se pudo autoconfigurar Google Sheets</p>
                <p className="mt-0.5 text-slate-600">{autoProvisionError}</p>
              </div>
            </div>
            <button 
              onClick={() => setAutoProvisionError(null)}
              className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
            >
              Descartar
            </button>
          </div>
        )}

        {/* Warning if Google Sheets is not configured */}
        {!googleSheetsSettings.spreadsheetId && !isAutoProvisioning && (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 text-xs text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-800">¡Conexión a Google Sheets requerida!</p>
                <p className="mt-1 text-slate-600">
                  Para guardar de manera permanente tus paquetes y resúmenes diarios, puedes elegir un archivo existente de tu Google Drive o crear uno nuevo con un solo clic.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
              <button
                onClick={() => setShowSheetsSelector(true)}
                className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer"
                id="link-drive-btn"
              >
                Vincular desde Drive
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex-1 md:flex-none px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                id="configure-sheets-prompt-btn"
              >
                ID Manual
              </button>
            </div>
          </div>
        )}

        {/* Info bar when Google Sheets is connected */}
        {googleSheetsSettings.spreadsheetId && (
          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm text-xs" id="connected-sheet-bar">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-800">Hoja de cálculo vinculada</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[280px] sm:max-w-md md:max-w-xl">
                  Spreadsheet ID: {googleSheetsSettings.spreadsheetId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <a
                href={`https://docs.google.com/spreadsheets/d/${googleSheetsSettings.spreadsheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none text-center px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs transition"
              >
                Abrir en Sheets
              </a>
              {session.loggedIn && (
                <button
                  onClick={() => setShowSheetsSelector(true)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cambiar archivo
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Badges / Key Stats */}
        <DeliveryStats morningReport={morningReport} afternoonReport={afternoonReport} />

        {/* Modern Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6 pt-2" id="dashboard-tabs">
          <button
            onClick={() => setActiveTab("register")}
            className={`pb-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "register"
                ? "border-blue-600 text-blue-600 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-800"
            }`}
            id="tab-register-btn"
          >
            <Package className="w-4 h-4" />
            Registro Diario e Historial
          </button>
          <button
            onClick={() => setActiveTab("optimize")}
            className={`pb-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition cursor-pointer relative ${
              activeTab === "optimize"
                ? "border-blue-600 text-blue-600 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-800"
            }`}
            id="tab-optimize-btn"
          >
            <Compass className="w-4 h-4" />
            Optimización de Ruta y Análisis
            {morningReport && morningReport.packages.length > 0 && (
              <span className="absolute -top-1 -right-3 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                {morningReport.packages.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "register" ? (
          <>
            {/* Core Parsers Panels */}
            <DeliveryParser
              googleSheetsSettings={googleSheetsSettings}
              accessToken={session.accessToken}
              morningReport={morningReport}
              afternoonReport={afternoonReport}
              onMorningParsed={setMorningReport}
              onAfternoonParsed={setAfternoonReport}
              setMorningReport={setMorningReport}
              setAfternoonReport={setAfternoonReport}
              geminiApiKey={geminiApiKey}
            />

            {/* Recent History / Google Sheets log viewer */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm" id="history-panel">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-400" />
                  Historial de Resúmenes en Google Sheets
                </h3>
                <button
                  onClick={fetchRecentRecords}
                  disabled={loadingLogs || !session.accessToken || !googleSheetsSettings.spreadsheetId}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1.5 transition disabled:text-slate-400"
                  id="refresh-history-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
                  Sincronizar Historial
                </button>
              </div>

              {!googleSheetsSettings.spreadsheetId ? (
                <div className="text-xs text-slate-500 py-6 text-center">
                  Configura tu Spreadsheet de Google Sheets para visualizar aquí tus últimas entregas guardadas.
                </div>
              ) : !session.accessToken ? (
                <div className="text-xs text-slate-500 py-6 text-center">
                  Inicia sesión con Google para cargar el historial de resúmenes directamente.
                </div>
              ) : loadingLogs ? (
                <div className="text-xs text-slate-500 py-6 text-center flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Cargando reportes históricos desde Google Sheets...</span>
                </div>
              ) : logsError ? (
                <div className="py-6 max-w-xl mx-auto">
                  <div className="text-xs text-rose-800 bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3 text-left leading-relaxed">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="whitespace-pre-line font-medium">
                      {logsError}
                    </div>
                  </div>
                </div>
              ) : recentLogs.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center">
                  No se han encontrado registros en tu tabla de resúmenes. Realiza tu primer envío arriba para comenzar el historial.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-100">
                        <th className="p-3">Fecha</th>
                        <th className="p-3">C.P.</th>
                        <th className="p-3 text-center">Recibidos</th>
                        <th className="p-3 text-center">Entregados</th>
                        <th className="p-3 text-center">Incidencias</th>
                        <th className="p-3 text-right">Ganado</th>
                        <th className="p-3 text-right">Repartidor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentLogs.map((record) => {
                        const fields = record.fields;
                        return (
                          <tr key={record.id} className="hover:bg-slate-50 transition">
                            <td className="p-3 font-medium text-slate-800">{fields.Fecha}</td>
                            <td className="p-3 font-mono text-slate-500">{fields.CodigoPostal || "08918"}</td>
                            <td className="p-3 text-center text-slate-700">{fields.Recibidos}</td>
                            <td className="p-3 text-center text-emerald-600 font-semibold">{fields.Entregados}</td>
                            <td className="p-3 text-center text-rose-600">{fields.Incidencias}</td>
                            <td className="p-3 text-right text-blue-600 font-bold">{fields.GeneradoEuro ? `${fields.GeneradoEuro.toFixed(2)}€` : "0.00€"}</td>
                            <td className="p-3 text-right text-slate-500 text-[10px]">{fields.RolRepartidor || "Claudio"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <RouteOptimizer
            morningReport={morningReport}
            recentLogs={recentLogs}
            googleSheetsSettings={googleSheetsSettings}
            accessToken={session.accessToken}
            onUpdatePackages={(pkgs) => setMorningReport(prev => prev ? { ...prev, packages: pkgs } : null)}
          />
        )}

      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          googleSheetsSettings={googleSheetsSettings}
          googleSettings={googleSettings}
          onSaveGoogleSheets={handleSaveGoogleSheets}
          onSaveGoogle={handleSaveGoogle}
          accessToken={session.accessToken}
          geminiApiKey={geminiApiKey}
          onSaveGeminiApiKey={handleSaveGeminiApiKey}
        />
      )}

      {/* Sheets Selector Modal */}
      <SheetsSelectorModal
        isOpen={showSheetsSelector}
        accessToken={session.accessToken || ""}
        onClose={() => setShowSheetsSelector(false)}
        onSelect={(spreadsheetId, name, isNew) => {
          const newSettings: GoogleSheetsSettings = {
            spreadsheetId,
            deliveriesSheet: "Entregas",
            summariesSheet: "Resumen"
          };
          setGoogleSheetsSettings(newSettings);
          localStorage.setItem("delivery_sheets_settings", JSON.stringify(newSettings));
          setAutoProvisionSuccess(
            isNew 
              ? `¡Creado nuevo libro "${name}" en Google Drive y vinculado con éxito!`
              : `¡Vinculado al libro "${name}" existente en Google Drive!`
          );
        }}
      />

      {/* Simple Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="flex justify-center items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-slate-400" />
          <span>Delivery Rport Software • Diseñado para erceppiDEV</span>
        </div>
      </footer>
    </div>
  );
}
