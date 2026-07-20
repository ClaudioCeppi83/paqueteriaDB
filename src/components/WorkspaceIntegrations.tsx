import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  StickyNote,
  Plus,
  Trash2,
  Share2,
  Check,
  Loader2,
  AlertCircle,
  HelpCircle,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  Layers,
  MapPin,
  Calendar,
  Sparkles
} from "lucide-react";
import { MorningReport, ParsedPackage, GoogleSheetsSettings } from "../types";
import {
  listTaskLists,
  createTaskList,
  listTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  GoogleTaskList,
  GoogleTask
} from "../utils/workspaceServices";

interface WorkspaceIntegrationsProps {
  accessToken: string;
  morningReport: MorningReport | null;
  onSelectSpreadsheet?: (spreadsheetId: string, name: string) => void;
  onLogout?: () => void;
}

interface LocalKeepNote {
  id: string;
  title: string;
  content: string;
  color: string; // Tailwind bg class
  pinned: boolean;
  createdAt: string;
}

const STICKY_COLORS = [
  { name: "Amarillo", bg: "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900", dot: "bg-amber-400" },
  { name: "Verde", bg: "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900", dot: "bg-emerald-400" },
  { name: "Azul", bg: "bg-sky-50 hover:bg-sky-100/80 border-sky-200 text-sky-900", dot: "bg-sky-400" },
  { name: "Rosa", bg: "bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-900", dot: "bg-rose-400" },
  { name: "Púrpura", bg: "bg-purple-50 hover:bg-purple-100/80 border-purple-200 text-purple-900", dot: "bg-purple-400" },
];

export default function WorkspaceIntegrations({
  accessToken,
  morningReport,
  onSelectSpreadsheet,
  onLogout,
}: WorkspaceIntegrationsProps) {
  // Navigation tabs inside integrations workspace
  const [activeSubTab, setActiveSubTab] = useState<"tasks" | "keep" | "picker">("tasks");

  // Google Tasks states
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [syncingReport, setSyncingReport] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Local Keep Sticky Notes states
  const [keepNotes, setKeepNotes] = useState<LocalKeepNote[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedColor, setSelectedColor] = useState(STICKY_COLORS[0].bg);

  // Load Google Picker
  const [pickerLoading, setPickerLoading] = useState(false);

  // 1. Initial Loading of Task Lists & Local Keep Notes
  useEffect(() => {
    if (accessToken) {
      loadTaskLists();
    }
    const savedNotes = localStorage.getItem("delivery_keep_notes");
    if (savedNotes) {
      try {
        setKeepNotes(JSON.parse(savedNotes));
      } catch (err) {
        console.error("Error parsing local keep notes:", err);
      }
    } else {
      // Default placeholder notes to guide the user
      const defaultNotes: LocalKeepNote[] = [
        {
          id: "default-1",
          title: "🔑 Código Portal Calle Sant Josep",
          content: "El código para el portal del número 29 es #2049. Si no abre, llamar a conserjería.",
          color: "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900",
          pinned: true,
          createdAt: new Date().toLocaleDateString("es-ES"),
        },
        {
          id: "default-2",
          title: "📌 Recordatorio Matutino",
          content: "Revisar precintos de la furgoneta antes de salir del almacén de Badalona.",
          color: "bg-sky-50 hover:bg-sky-100/80 border-sky-200 text-sky-900",
          pinned: false,
          createdAt: new Date().toLocaleDateString("es-ES"),
        }
      ];
      setKeepNotes(defaultNotes);
      localStorage.setItem("delivery_keep_notes", JSON.stringify(defaultNotes));
    }
  }, [accessToken]);

  // Load Tasks when selected list changes
  useEffect(() => {
    if (accessToken && selectedListId) {
      loadTasks(selectedListId);
    } else {
      setTasks([]);
    }
  }, [selectedListId, accessToken]);

  const loadTaskLists = async () => {
    setLoadingLists(true);
    setError(null);
    try {
      const lists = await listTaskLists(accessToken);
      setTaskLists(lists);
      if (lists.length > 0) {
        // Try to pre-select "My Tasks" or the first list
        const defaultList = lists.find((l) => l.title.toLowerCase().includes("default")) || lists[0];
        setSelectedListId(defaultList.id);
      }
    } catch (err: any) {
      console.error(err);
      setError("No se pudieron cargar las listas de tareas de Google Tasks.");
    } finally {
      setLoadingLists(false);
    }
  };

  const loadTasks = async (listId: string) => {
    setLoadingTasks(true);
    setError(null);
    try {
      const items = await listTasks(accessToken, listId);
      setTasks(items);
    } catch (err: any) {
      console.error(err);
      setError("No se pudieron cargar las tareas correspondientes a esta lista.");
    } finally {
      setLoadingTasks(false);
    }
  };

  // Create a brand new task list (e.g. for today's deliveries)
  const handleCreateTodayList = async () => {
    setError(null);
    setSuccessMsg(null);
    const dateStr = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    const listTitle = `Repartos Badalona - ${dateStr}`;

    setLoadingLists(true);
    try {
      const newList = await createTaskList(accessToken, listTitle);
      setTaskLists((prev) => [newList, ...prev]);
      setSelectedListId(newList.id);
      setSuccessMsg(`¡Creada con éxito la lista de Google Tasks "${listTitle}"!`);
    } catch (err: any) {
      setError(err.message || "Error al crear la nueva lista de tareas.");
    } finally {
      setLoadingLists(false);
    }
  };

  // Create individual task manually
  const handleAddTaskManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedListId) return;

    setError(null);
    try {
      const created = await createTask(accessToken, selectedListId, {
        title: newTaskTitle.trim(),
        notes: "Añadido manualmente desde Delivery Rport Software",
      });
      setTasks((prev) => [created, ...prev]);
      setNewTaskTitle("");
    } catch (err: any) {
      setError("No se pudo agregar la tarea a Google Tasks.");
    }
  };

  // Toggle Google Task status (check / uncheck)
  const handleToggleTask = async (task: GoogleTask) => {
    if (!selectedListId) return;

    const nextStatus = task.status === "completed" ? "needsAction" : "completed";
    
    // Optimistic UI Update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await updateTaskStatus(accessToken, selectedListId, task.id, nextStatus);
    } catch (err) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      setError("Error al actualizar el estado de la tarea en Google Tasks.");
    }
  };

  // Delete Google Task
  const handleDeleteTask = async (taskId: string) => {
    if (!selectedListId) return;
    const confirmed = window.confirm("¿Seguro que deseas eliminar esta tarea de Google Tasks?");
    if (!confirmed) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await deleteTask(accessToken, selectedListId, taskId);
    } catch (err) {
      loadTasks(selectedListId);
      setError("Error al intentar eliminar la tarea.");
    }
  };

  // Synchronize ALL parsed morning packages as tasks in selected Google Tasks list
  const handleSyncPackagesToTasks = async () => {
    if (!morningReport || morningReport.packages.length === 0) {
      setError("No hay ningún parte matutino cargado para sincronizar.");
      return;
    }
    if (!selectedListId) {
      setError("Por favor, selecciona o crea primero una lista de Google Tasks.");
      return;
    }

    const confirmed = window.confirm(
      `¿Deseas exportar las ${morningReport.packages.length} calles/paquetes del parte de hoy a la lista de Google Tasks seleccionada?`
    );
    if (!confirmed) return;

    setSyncingReport(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Group unique stops
      const stopsMap: Record<string, { street: string; numbers: string[]; qty: number }> = {};
      morningReport.packages.forEach((pkg) => {
        const key = pkg.street.toLowerCase().trim();
        if (!stopsMap[key]) {
          stopsMap[key] = { street: pkg.street, numbers: [], qty: 0 };
        }
        if (!stopsMap[key].numbers.includes(pkg.number)) {
          stopsMap[key].numbers.push(pkg.number);
        }
        stopsMap[key].qty += pkg.quantity;
      });

      const uniqueStops = Object.values(stopsMap);
      const todayISO = new Date().toISOString().split("T")[0] + "T23:59:59Z";

      // Loop and create each as a task
      for (const stop of uniqueStops) {
        await createTask(accessToken, selectedListId, {
          title: `[Reparto] ${stop.street} - Números: ${stop.numbers.join(", ")}`,
          notes: `Calle: ${stop.street}\nNúmeros: ${stop.numbers.join(", ")}\nCantidad de paquetes: ${stop.qty} unidades.\n\nGenerado automáticamente por Delivery Rport Software.`,
          due: todayISO
        });
      }

      await loadTasks(selectedListId);
      setSuccessMsg(`¡Sincronizadas con éxito ${uniqueStops.length} calles de reparto como tareas individuales en Google Tasks!`);
    } catch (err: any) {
      setError("Error al sincronizar las direcciones de reparto con Google Tasks.");
    } finally {
      setSyncingReport(false);
    }
  };

  // --- LOCAL KEEP NOTES SERVICES ---
  const handleAddKeepNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim()) return;

    const newNote: LocalKeepNote = {
      id: `note-${Date.now()}`,
      title: noteTitle.trim() || "Nota sin título",
      content: noteContent.trim(),
      color: selectedColor,
      pinned: false,
      createdAt: new Date().toLocaleDateString("es-ES"),
    };

    const updated = [newNote, ...keepNotes];
    setKeepNotes(updated);
    localStorage.setItem("delivery_keep_notes", JSON.stringify(updated));

    setNoteTitle("");
    setNoteContent("");
  };

  const handleDeleteKeepNote = (id: string) => {
    const updated = keepNotes.filter((n) => n.id !== id);
    setKeepNotes(updated);
    localStorage.setItem("delivery_keep_notes", JSON.stringify(updated));
  };

  const handleTogglePinKeepNote = (id: string) => {
    const updated = keepNotes.map((n) =>
      n.id === id ? { ...n, pinned: !n.pinned } : n
    );
    // Sort pinned notes to the top
    const sorted = [...updated].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
    setKeepNotes(sorted);
    localStorage.setItem("delivery_keep_notes", JSON.stringify(sorted));
  };

  // Export Keep Note to Google Tasks list
  const handleExportNoteToTasks = async (note: LocalKeepNote) => {
    if (!selectedListId) {
      setError("Selecciona una lista de Google Tasks primero en la pestaña de Tareas.");
      return;
    }
    try {
      await createTask(accessToken, selectedListId, {
        title: note.title,
        notes: `${note.content}\n\n[Exportado de Notas Keep - Delivery Rport]`,
      });
      setSuccessMsg(`¡Nota "${note.title}" exportada como tarea a Google Tasks con éxito!`);
      // Auto switch back to tasks tab to see it
      setTimeout(() => {
        setActiveSubTab("tasks");
        loadTasks(selectedListId);
      }, 1000);
    } catch (err) {
      setError("No se pudo exportar la nota a Google Tasks.");
    }
  };

  // --- GOOGLE PICKER API LAUNCHER ---
  const launchGooglePicker = () => {
    setPickerLoading(true);
    setError(null);

    // Make sure gapi is loaded
    if (!(window as any).gapi) {
      setError("El cargador de Google API (gapi) no está disponible en este momento. Inténtalo de nuevo.");
      setPickerLoading(false);
      return;
    }

    const gapi = (window as any).gapi;

    gapi.load("picker", {
      callback: () => {
        try {
          // Find or calculate the top-most parent frame origin
          const pickerOrigin =
            window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
              ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
              : window.location.origin;

          // Build a Google Picker view filtered to Google Spreadsheets
          const view = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.SPREADSHEETS);
          
          const picker = new (window as any).google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(accessToken)
            .setOrigin(pickerOrigin)
            .setCallback((data: any) => {
              if (data.action === (window as any).google.picker.Action.PICKED) {
                const doc = data.docs[0];
                if (doc && onSelectSpreadsheet) {
                  onSelectSpreadsheet(doc.id, doc.name);
                  setSuccessMsg(`¡Vinculado correctamente al libro "${doc.name}" desde Google Picker!`);
                }
              }
            })
            .build();

          picker.setVisible(true);
        } catch (err: any) {
          console.error("Error creating Google Picker:", err);
          setError("Error al instanciar el Google Picker. Asegúrate de otorgar los permisos necesarios.");
        } finally {
          setPickerLoading(false);
        }
      }
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="workspace-integrations-root">
      
      {/* Tab bar header */}
      <div className="bg-slate-50 border-b border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Workspace Integrado</h3>
            <p className="text-[11px] text-slate-500">Gestión de Tareas, Notas rápidas de Keep y Selección Inteligente de Archivos.</p>
          </div>
        </div>

        {/* Sub Navigation controls */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl self-start sm:self-auto gap-1">
          <button
            onClick={() => setActiveSubTab("tasks")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "tasks"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Google Tasks
          </button>
          <button
            onClick={() => setActiveSubTab("keep")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "keep"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            Keep Notas
          </button>
          <button
            onClick={() => setActiveSubTab("picker")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "picker"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Google Picker
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Messages */}
        {error && (
          <div className="mb-4 text-xs text-rose-800 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center justify-between gap-3 leading-relaxed animate-fade-in">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                {error.includes("UNAUTHORIZED") 
                  ? "Tu sesión de Google ha expirado o no tiene permisos suficientes. Por favor, vuelve a iniciar sesión para reconectar." 
                  : error}
              </span>
            </div>
            {error.includes("UNAUTHORIZED") && onLogout && (
              <button
                onClick={onLogout}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition shrink-0 cursor-pointer"
              >
                Volver a Conectar
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex gap-2 leading-relaxed animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* --- GOOGLE TASKS SUB-TAB --- */}
        {activeSubTab === "tasks" && (
          <div className="space-y-6" id="workspace-tasks-panel">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Task list selection and controls */}
              <div className="md:col-span-1 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Lista de Google Tasks activa:
                  </label>
                  {loadingLists ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cargando tus listas...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 outline-none transition font-semibold"
                    >
                      <option value="">Selecciona una lista</option>
                      {taskLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleCreateTodayList}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Lista para Hoy
                  </button>
                </div>

                {/* Direct Sync morning report packages */}
                {morningReport && morningReport.packages.length > 0 && (
                  <div className="border border-blue-100 bg-blue-50/50 rounded-2xl p-4 space-y-3.5">
                    <div>
                      <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                        Sincronizar Parte Matutino
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                        Tienes <strong>{morningReport.packages.length} paquetes</strong> listos para hoy. Conviértelos en tareas organizadas con descripciones y calles.
                      </p>
                    </div>

                    <button
                      onClick={handleSyncPackagesToTasks}
                      disabled={syncingReport || !selectedListId}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/10 cursor-pointer"
                    >
                      {syncingReport ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sincronizando...</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-4 h-4" />
                          <span>Exportar como Tareas</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Individual active tasks list inside list */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-extrabold text-slate-800">
                    Tareas de la Lista ({tasks.length})
                  </span>
                  <button
                    onClick={() => selectedListId && loadTasks(selectedListId)}
                    className="text-[10px] text-blue-600 hover:underline font-bold"
                  >
                    Actualizar Tareas
                  </button>
                </div>

                {/* Form to append tasks directly */}
                <form onSubmit={handleAddTaskManually} className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Escribe una tarea para el reparto diario..."
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim() || !selectedListId}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Agregar
                  </button>
                </form>

                {/* List scroll container */}
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-50 min-h-[220px] max-h-[350px] overflow-y-auto">
                  {loadingTasks ? (
                    <div className="h-full py-16 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-xs text-slate-400 mt-2">Leyendo Google Tasks...</span>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400">
                      No hay tareas pendientes en esta lista. ¡Crea una nueva o sincroniza tus repartos!
                    </div>
                  ) : (
                    tasks.map((task) => {
                      const isDone = task.status === "completed";
                      return (
                        <div
                          key={task.id}
                          className="p-3 hover:bg-slate-50/60 transition flex items-start justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleTask(task)}
                              className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition shrink-0 cursor-pointer ${
                                isDone
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-300 hover:border-blue-500"
                              }`}
                            >
                              {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                            <div className="min-w-0">
                              <p className={`text-xs font-bold leading-snug ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>
                                {task.title}
                              </p>
                              {task.notes && (
                                <p className="text-[10px] text-slate-400 mt-0.5 whitespace-pre-line leading-relaxed truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:text-clip">
                                  {task.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded opacity-0 group-hover:opacity-100 transition shrink-0 cursor-pointer"
                            title="Eliminar de Google Tasks"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- GOOGLE KEEP NOTEPAD SUB-TAB --- */}
        {activeSubTab === "keep" && (
          <div className="space-y-6" id="workspace-keep-panel">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Creator Form */}
              <div className="md:col-span-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Nueva Nota Adicional (Keep)
                </h4>

                <form onSubmit={handleAddKeepNote} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Título de la nota..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none font-bold text-slate-800 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      rows={4}
                      placeholder="Contenido de la nota (Ej. indicaciones de portales, números telefónicos, etc.)..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-slate-600 leading-relaxed transition resize-none"
                    />
                  </div>

                  {/* Note color selectors */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-500 block">Color de la Tarjeta</span>
                    <div className="flex gap-1.5">
                      {STICKY_COLORS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setSelectedColor(c.bg)}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition cursor-pointer ${c.dot} ${
                            selectedColor === c.bg ? "ring-2 ring-blue-600 ring-offset-2 border-slate-300" : "border-transparent"
                          }`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!noteTitle.trim() && !noteContent.trim()}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-200 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Guardar Nota
                  </button>
                </form>
              </div>

              {/* Keep Notes List Grid */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-extrabold text-slate-800">
                    Tablero de Notas rápidas ({keepNotes.length})
                  </span>
                  <p className="text-[10px] text-slate-400">Guarda datos críticos del reparto diario.</p>
                </div>

                {keepNotes.length === 0 ? (
                  <div className="py-20 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <StickyNote className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5] mb-2" />
                    No hay notas creadas aún. ¡Escribe una a la izquierda!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {keepNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`border rounded-2xl p-4 flex flex-col justify-between min-h-[140px] transition shadow-sm ${note.color}`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="text-xs font-black leading-snug">{note.title}</h5>
                            <button
                              onClick={() => handleTogglePinKeepNote(note.id)}
                              className={`p-0.5 rounded text-[10px] transition cursor-pointer ${
                                note.pinned ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                              }`}
                              title={note.pinned ? "Desanclar nota" : "Anclar nota"}
                            >
                              📌
                            </button>
                          </div>
                          <p className="text-[11px] leading-relaxed whitespace-pre-line">
                            {note.content}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-200/50 pt-2.5 mt-4 shrink-0">
                          <span className="text-[9px] font-mono font-bold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {note.createdAt}
                          </span>

                          <div className="flex gap-1.5 opacity-80 hover:opacity-100 transition">
                            <button
                              onClick={() => handleExportNoteToTasks(note)}
                              disabled={!selectedListId}
                              className="p-1 hover:bg-white/80 rounded text-slate-600 transition cursor-pointer"
                              title="Exportar a Google Tasks"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteKeepNote(note.id)}
                              className="p-1 hover:bg-white/80 rounded text-rose-600 transition cursor-pointer"
                              title="Eliminar Nota"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- GOOGLE PICKER API SUB-TAB --- */}
        {activeSubTab === "picker" && (
          <div className="space-y-5 py-6 text-center max-w-lg mx-auto" id="workspace-picker-panel">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <FileSpreadsheet className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-black text-slate-900">
                Selector Inteligente de Hojas de Cálculo
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                Utiliza el **Google Picker** nativo oficial para navegar de forma segura por tu Google Drive y vincular el archivo de reparto que desees, sin salir de la aplicación.
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={launchGooglePicker}
                disabled={pickerLoading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/15 mx-auto cursor-pointer"
              >
                {pickerLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cargando Google Picker...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Abrir Google Picker</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-left text-[11px] leading-relaxed text-slate-500 mt-6 flex gap-2.5">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-700">Seguridad Garantizada</p>
                <p className="mt-0.5">
                  Google Picker se ejecuta de manera nativa en tu navegador directamente desde los servidores de Google. Solo otorga acceso de lectura al archivo específico que selecciones.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
