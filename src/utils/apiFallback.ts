// Client-side fallback utility for static hosting environments (like Vercel)
// This file implements pure browser-based parsing and direct Airtable API requests

import { MorningReport, AfternoonReport } from "../types";

// 1. Safe Fetch Wrapper to handle client fallbacks transparently
export async function safeFetch<T>(
  url: string,
  options: RequestInit,
  fallbackFn: () => Promise<T>
): Promise<T> {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type");
    
    if (response.ok && contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return data as T;
    }
    
    // If response was not JSON, or not OK (like a 404 on Vercel), fall back
    console.warn(`Server API route "${url}" returned non-JSON or error status. Falling back to client-side implementation.`);
    return await fallbackFn();
  } catch (error) {
    console.warn(`Network error or failure calling server API "${url}". Falling back to client-side implementation.`, error);
    return await fallbackFn();
  }
}

// 2. Client-side Morning Parser (same logic as server fallback)
export function clientParseMorning(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  let currentStreet = "";
  const packages: any[] = [];
  let messageTotal = 0;

  for (const line of lines) {
    if (line.toLowerCase().startsWith("total:")) {
      const match = line.match(/\d+/);
      if (match) messageTotal = parseInt(match[0], 10);
      continue;
    }

    if (line.toLowerCase() === "claudio") {
      continue;
    }

    if (line.endsWith(":")) {
      currentStreet = line.slice(0, -1).trim();
      continue;
    }

    if (currentStreet) {
      let quantity = 1;
      let number = line;
      const xMatch = line.match(/^(.*?)\s+x(\d+)\s*$/i);
      if (xMatch) {
        number = xMatch[1].trim();
        quantity = parseInt(xMatch[2], 10);
      }

      packages.push({
        street: currentStreet,
        number: number,
        quantity: quantity,
      });
    }
  }

  const totalCount = packages.reduce((sum, p) => sum + p.quantity, 0);

  return {
    packages,
    totalCount,
    messageTotal: messageTotal || totalCount,
  };
}

// 3. Client-side Afternoon Parser (same logic as server fallback)
export function clientParseAfternoon(text: string) {
  let postalCode = "";
  let date = "";
  let received = 0;
  let incidents = 0;
  let delivered = 0;

  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  for (const line of lines) {
    if (/^\d{5}$/.test(line)) {
      postalCode = line;
      continue;
    }
    const dateMatch = line.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    if (dateMatch) {
      date = line;
      continue;
    }
    if (line.toLowerCase().includes("recibidos")) {
      const match = line.match(/\d+/);
      if (match) received = parseInt(match[0], 10);
    }
    if (line.toLowerCase().includes("incidencias")) {
      const match = line.match(/\d+/);
      if (match) incidents = parseInt(match[0], 10);
    }
    if (line.toLowerCase().includes("entregados")) {
      const match = line.match(/\d+/);
      if (match) delivered = parseInt(match[0], 10);
    }
  }

  return {
    postalCode,
    date,
    received,
    incidents,
    delivered,
    earnings: Number((delivered * 0.7).toFixed(2)),
  };
}

// 4. Airtable: Direct browser-to-Airtable client request helper for testing connection
export async function clientAirtableTestConnection(pat: string, baseId: string, table: string) {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?maxRecords=1`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error de Airtable: ${errText}`);
  }

  return { status: "ok", message: "Conexión exitosa con Airtable (vía cliente)" };
}

// 5. Airtable: Direct browser-to-Airtable client request helper for fetching records
export async function clientAirtableGetRecords(pat: string, baseId: string, table: string, maxRecords: number = 20) {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?maxRecords=${maxRecords}&sort%5B0%5D%5Bfield%5D=Fecha&sort%5B0%5D%5Bdirection%5D=desc`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error de Airtable: ${errText}`);
  }

  const resData = await response.json();
  return { records: resData.records };
}

// 6. Airtable: Direct browser-to-Airtable client request helper for saving deliveries
export async function clientAirtableSaveDeliveries(pat: string, baseId: string, table: string, records: any[]) {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;
  
  // Airtable supports up to 10 records per batch
  const chunks = [];
  for (let i = 0; i < records.length; i += 10) {
    chunks.push(records.slice(i, i + 10));
  }

  const savedRecords = [];
  for (const chunk of chunks) {
    const payload = {
      records: chunk.map((r: any) => ({
        fields: {
          Fecha: r.date || new Date().toISOString().split("T")[0],
          Calle: r.street,
          Numero: r.number,
          Cantidad: Number(r.quantity),
          Estado: r.status || "Entregado",
          Sector: "Badalona"
        },
      })),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error de Airtable al guardar entregas: ${errText}`);
    }

    const resData: any = await response.json();
    savedRecords.push(...resData.records);
  }

  return { status: "ok", count: savedRecords.length, records: savedRecords };
}

// 7. Airtable: Direct browser-to-Airtable client request helper for saving summary
export async function clientAirtableSaveSummary(pat: string, baseId: string, table: string, summary: any) {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;
  const payload = {
    records: [
      {
        fields: {
          Fecha: summary.date || new Date().toISOString().split("T")[0],
          CodigoPostal: summary.postalCode || "08918",
          Recibidos: Number(summary.received),
          Entregados: Number(summary.delivered),
          Incidencias: Number(summary.incidents),
          GeneradoEuro: Number(summary.earnings),
          RolRepartidor: "Claudio"
        },
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error de Airtable al guardar resumen: ${errText}`);
  }

  const resData: any = await response.json();
  return { status: "ok", record: resData.records[0] };
}
