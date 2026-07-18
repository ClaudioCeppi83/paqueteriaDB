import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  RefreshCw, 
  FileText, 
  Check, 
  X, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { listSpreadsheetsInDrive, createSpreadsheet } from "../utils/googleSheets";

interface SheetsSelectorModalProps {
  accessToken: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (spreadsheetId: string, name: string, isNew: boolean) => void;
}

export default function SheetsSelectorModal({
  accessToken,
  isOpen,
  onClose,
  onSelect,
}: SheetsSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<"select" | "create">("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [spreadsheets, setSpreadsheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New file creation state
  const [newFileName, setNewFileName] = useState("Registro de Reparto");
  const [creating, setCreating] = useState(false);

  // Load spreadsheets from Google Drive
  const loadFiles = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const files = await listSpreadsheetsInDrive(accessToken);
      setSpreadsheets(files);
    } catch (err: any) {
      console.error(err);
      setError("No se pudieron cargar los archivos de Google Drive. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      loadFiles();
    }
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  // Filter spreadsheets based on search input
  const filteredSheets = spreadsheets.filter((sheet) =>
    sheet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle creating a new spreadsheet
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const result = await createSpreadsheet(
        accessToken, 
        newFileName.trim(), 
        "Entregas", 
        "Resumen"
      );
      onSelect(result.spreadsheetId, newFileName.trim(), true);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("No se pudo crear el archivo de Google Sheets. Asegúrate de tener permisos suficientes.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" id="sheets-selector-backdrop">
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
        id="sheets-selector-container"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Vincular Google Sheets</h3>
              <p className="text-[11px] text-slate-500">Elige un libro existente o crea uno nuevo en tu Drive.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab triggers */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab("select")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === "select"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Elegir archivo existente
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === "create"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Crear nuevo archivo
          </button>
        </div>

        {/* Inner Content scroll area */}
        <div className="p-5 overflow-y-auto flex-1 min-h-[300px] flex flex-col">
          {error && (
            <div className="mb-4 text-xs text-rose-800 bg-rose-50 border border-rose-100 p-3 rounded-xl flex gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "select" ? (
            <div className="space-y-4 flex flex-col flex-1">
              {/* Search input */}
              <div className="relative shrink-0">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar archivos en Google Drive..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-medium"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Refresh Button */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 shrink-0">
                <span>Mostrando hojas de cálculo de tu Google Drive</span>
                <button
                  onClick={loadFiles}
                  disabled={loading}
                  className="flex items-center gap-1 hover:text-blue-600 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                  Actualizar lista
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[300px] border border-slate-100 rounded-xl divide-y divide-slate-50">
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <span className="text-xs text-slate-500 mt-2">Cargando tus libros de Google Sheets...</span>
                  </div>
                ) : filteredSheets.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    {searchQuery 
                      ? "No se encontraron libros que coincidan con la búsqueda." 
                      : "No se encontraron hojas de cálculo en tu cuenta de Google Drive."}
                  </div>
                ) : (
                  filteredSheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => {
                        onSelect(sheet.id, sheet.name, false);
                        onClose();
                      }}
                      className="w-full text-left p-3.5 hover:bg-slate-50 transition flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition">
                            {sheet.name}
                          </p>
                          {sheet.modifiedTime && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Modificado: {new Date(sheet.modifiedTime).toLocaleDateString("es-ES", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition shrink-0">
                        Seleccionar
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateFile} className="space-y-4 flex flex-col justify-center flex-1 py-4">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Nombre de la Hoja de Cálculo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    required
                    placeholder="Ej. Registro de Reparto - Claudio"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition"
                    disabled={creating}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Crearemos un nuevo libro en la raíz de tu Google Drive con este nombre. Automáticamente incluiremos las pestañas <strong className="text-slate-700">Entregas</strong> y <strong className="text-slate-700">Resumen</strong> con todas las columnas configuradas.
                </p>
              </div>

              <div className="pt-4 mt-auto">
                <button
                  type="submit"
                  disabled={creating || !newFileName.trim()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/10 active:scale-[0.99] cursor-pointer"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creando archivo en Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Crear y Vincular Archivo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
