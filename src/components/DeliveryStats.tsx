import React from "react";
import { Package, CheckCircle2, AlertCircle, Euro, ShieldAlert, TrendingUp } from "lucide-react";
import { MorningReport, AfternoonReport } from "../types";

interface DeliveryStatsProps {
  morningReport: MorningReport | null;
  afternoonReport: AfternoonReport | null;
}

export default function DeliveryStats({ morningReport, afternoonReport }: DeliveryStatsProps) {
  const morningTotal = morningReport ? morningReport.totalCount : 0;
  const morningDeclares = morningReport ? morningReport.messageTotal : 0;

  const afternoonReceived = afternoonReport ? afternoonReport.received : 0;
  const afternoonDelivered = afternoonReport ? afternoonReport.delivered : 0;
  const afternoonIncidents = afternoonReport ? afternoonReport.incidents : 0;
  const calculatedEarnings = afternoonReport ? afternoonReport.earnings : (afternoonDelivered * 0.70);

  // Checks for mismatches to help Claudio double check his work
  const hasMismatch = morningTotal > 0 && afternoonReceived > 0 && morningTotal !== afternoonReceived;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans" id="stats-grid">
      {/* 1. Recibidos Mañana / Total */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-300 transition duration-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Paquetes Mañana</span>
          <div className="p-2 bg-slate-100 text-blue-600 rounded-xl">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-slate-900">{morningTotal}</span>
          <span className="text-xs text-slate-500 font-medium">unidades</span>
        </div>
        {morningDeclares > 0 && morningTotal !== morningDeclares && (
          <div className="text-[10px] text-amber-600 mt-2 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>Nota: WhatsApp declara {morningDeclares}</span>
          </div>
        )}
        <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-xl group-hover:scale-150 transition duration-500"></div>
      </div>

      {/* 2. Entregados Tarde */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-300 transition duration-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Total Entregados</span>
          <div className="p-2 bg-slate-100 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-emerald-600">{afternoonDelivered}</span>
          <span className="text-xs text-slate-500 font-medium">de {afternoonReceived || morningTotal || "?"}</span>
        </div>
        {afternoonReport && (
          <div className="text-[10px] text-slate-400 mt-2 font-medium">
            Fecha reporte: {afternoonReport.date}
          </div>
        )}
        <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full blur-xl group-hover:scale-150 transition duration-500"></div>
      </div>

      {/* 3. Incidencias */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-300 transition duration-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Incidencias</span>
          <div className="p-2 bg-slate-100 text-rose-600 rounded-xl">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className={`text-3xl font-black ${afternoonIncidents > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {afternoonIncidents}
          </span>
          <span className="text-xs text-slate-500 font-medium">paquetes</span>
        </div>
        {hasMismatch && (
          <div className="text-[10px] text-rose-600 mt-2 font-semibold flex items-center gap-1 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Mañana/Tarde no coinciden</span>
          </div>
        )}
        <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tr from-rose-500/5 to-transparent rounded-full blur-xl group-hover:scale-150 transition duration-500"></div>
      </div>

      {/* 4. Ganancia del Día (High-contrast Blue Card) */}
      <div className="bg-blue-600 border border-blue-750 p-5 rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden group hover:bg-blue-700/95 transition duration-300 col-span-2 md:col-span-1 text-white">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-100 tracking-wide uppercase">Dinero Generado</span>
          <div className="p-2 bg-blue-500 text-white rounded-xl">
            <Euro className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4 flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white">{calculatedEarnings.toFixed(2)}€</span>
          </div>
          <span className="text-[10px] text-blue-200 mt-1 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-200" />
            <span>0,70€ por paquete entregado</span>
          </span>
        </div>
        <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-xl group-hover:scale-150 transition duration-500"></div>
      </div>
    </div>
  );
}
