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
  RefreshCw
} from "lucide-react";
import { AirtableSettings, GoogleAuthSettings, UserSession, MorningReport, AfternoonReport } from "./types";
import GoogleSignIn from "./components/GoogleSignIn";
import SettingsModal from "./components/SettingsModal";
import DeliveryParser from "./components/DeliveryParser";
import DeliveryStats from "./components/DeliveryStats";
import { safeFetch, clientAirtableGetRecords } from "./utils/apiFallback";

export default function App() {
  // Session State loaded from LocalStorage
  const [session, setSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem("delivery_app_session");
    return saved ? JSON.parse(saved) : { email: "", name: "", picture: "", loggedIn: false, method: "local" };
  });

  // Airtable Credentials saved securely in user's browser localStorage
  const [airtableSettings, setAirtableSettings] = useState<AirtableSettings>(() => {
    const saved = localStorage.getItem("delivery_airtable_settings");
    return saved ? JSON.parse(saved) : { pat: "", baseId: "", deliveriesTable: "Entregas", summariesTable: "Resúmenes" };
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

  const handleSaveAirtable = (settings: AirtableSettings) => {
    setAirtableSettings(settings);
    localStorage.setItem("delivery_airtable_settings", JSON.stringify(settings));
  };

  const handleSaveGoogle = (settings: GoogleAuthSettings) => {
    setGoogleSettings(settings);
    localStorage.setItem("delivery_google_settings", JSON.stringify(settings));
  };

  const handleLogout = () => {
    setSession({ email: "", name: "", picture: "", loggedIn: false, method: "local" });
    localStorage.removeItem("delivery_app_session");
  };

  // Fetch recent records from Airtable to show in App History
  const fetchRecentRecords = async () => {
    if (!airtableSettings.pat || !airtableSettings.baseId || !airtableSettings.summariesTable) {
      return;
    }
    setLoadingLogs(true);
    setLogsError(null);

    try {
      const data = await safeFetch<{ records: any[] }>(
        "/api/airtable/get-records",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pat: airtableSettings.pat,
            baseId: airtableSettings.baseId,
            table: airtableSettings.summariesTable,
            maxRecords: 5,
          }),
        },
        () => clientAirtableGetRecords(
          airtableSettings.pat,
          airtableSettings.baseId,
          airtableSettings.summariesTable,
          5
        )
      );

      if (data && data.records) {
        setRecentLogs(data.records);
      } else {
        setLogsError("No se pudieron recuperar los últimos registros.");
      }
    } catch (err: any) {
      setLogsError(err.message || "Error al conectar con Airtable.");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (session.loggedIn && airtableSettings.pat && airtableSettings.baseId) {
      fetchRecentRecords();
    }
  }, [session.loggedIn, airtableSettings]);

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

        {/* Warning if Airtable is not configured */}
        {(!airtableSettings.pat || !airtableSettings.baseId) && (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 text-xs text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-800">¡Conexión a Airtable requerida!</p>
                <p className="mt-1 text-slate-600">
                  Para guardar de manera permanente tus paquetes y resúmenes diarios, configura tu Personal Access Token (PAT) y Base ID de Airtable.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shrink-0 shadow-md"
              id="configure-airtable-prompt-btn"
            >
              Configurar Airtable
            </button>
          </div>
        )}

        {/* Dynamic Badges / Key Stats */}
        <DeliveryStats morningReport={morningReport} afternoonReport={afternoonReport} />

        {/* Core Parsers Panels */}
        <DeliveryParser
          airtableSettings={airtableSettings}
          morningReport={morningReport}
          afternoonReport={afternoonReport}
          onMorningParsed={setMorningReport}
          onAfternoonParsed={setAfternoonReport}
          setMorningReport={setMorningReport}
          setAfternoonReport={setAfternoonReport}
        />

        {/* Recent History / Airtable log viewer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm" id="history-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              Historial de Resúmenes en Airtable
            </h3>
            <button
              onClick={fetchRecentRecords}
              disabled={loadingLogs || !airtableSettings.pat || !airtableSettings.baseId}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1.5 transition disabled:text-slate-400"
              id="refresh-history-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
              Sincronizar Historial
            </button>
          </div>

          {!airtableSettings.pat || !airtableSettings.baseId ? (
            <div className="text-xs text-slate-500 py-6 text-center">
              Configura tus credenciales de Airtable para visualizar aquí tus últimas entregas guardadas.
            </div>
          ) : loadingLogs ? (
            <div className="text-xs text-slate-500 py-6 text-center flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Cargando reportes históricos desde Airtable...</span>
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

      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          airtableSettings={airtableSettings}
          googleSettings={googleSettings}
          onSaveAirtable={handleSaveAirtable}
          onSaveGoogle={handleSaveGoogle}
        />
      )}

      {/* Simple Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="flex justify-center items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-slate-400" />
          <span>Delivery Rport Software • Diseñado para Claudio • Badalona, España</span>
        </div>
      </footer>
    </div>
  );
}
