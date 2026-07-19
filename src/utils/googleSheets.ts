/**
 * Google Sheets & Drive API Integration Utilities
 */

import { ParsedPackage, AfternoonReport } from "../types";

// Standard column headers for the sheets
export const DELIVERIES_HEADERS = ["Fecha", "Calle", "Numero", "Cantidad", "Estado", "Sector"];
export const SUMMARIES_HEADERS = [
  "Fecha",
  "CodigoPostal",
  "Recibidos",
  "Entregados",
  "Incidencias",
  "GeneradoEuro",
  "RolRepartidor"
];

/**
 * Creates a brand new Google Spreadsheet in the user's Drive with predefined sheets and headers.
 */
export async function createSpreadsheet(
  accessToken: string,
  title: string,
  deliveriesSheetName: string = "Entregas",
  summariesSheetName: string = "Resumen"
): Promise<{ spreadsheetId: string; url: string }> {
  // 1. Create Spreadsheet
  const res = await fetch("https://sheets.googleapis.com/v1/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: deliveriesSheetName,
          },
        },
        {
          properties: {
            title: summariesSheetName,
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al crear la Hoja de Cálculo: ${errText}`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const url = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Initialize Headers for both sheets in a single batch update
  try {
    const headersRes = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: [
            {
              range: `${deliveriesSheetName}!A1:F1`,
              values: [DELIVERIES_HEADERS],
            },
            {
              range: `${summariesSheetName}!A1:G1`,
              values: [SUMMARIES_HEADERS],
            },
          ],
        }),
      }
    );

    if (!headersRes.ok) {
      console.warn("Could not write headers automatically:", await headersRes.text());
    }
  } catch (err) {
    console.error("Failed to write sheets headers:", err);
  }

  return { spreadsheetId, url };
}

/**
 * Ensures a specific sheet tab exists inside the spreadsheet. If not, creates it.
 */
export async function ensureSheetExists(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  // Get spreadsheet metadata to check sheet names
  const res = await fetch(`https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}?includeGridData=false`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al verificar la estructura de la Hoja: ${errText}`);
  }

  const metadata = await res.json();
  const exists = metadata.sheets?.some((s: any) => s.properties?.title === sheetName);

  if (!exists) {
    // Add the sheet
    const addRes = await fetch(`https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      }),
    });

    if (!addRes.ok) {
      const errText = await addRes.text();
      throw new Error(`Error al crear la pestaña "${sheetName}": ${errText}`);
    }
  }
}

/**
 * Appends rows to a specified sheet. If empty, writes the headers first.
 */
export async function appendRowsToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  rows: any[][]
): Promise<void> {
  // 1. Ensure sheet exists
  await ensureSheetExists(accessToken, spreadsheetId, sheetName);

  // 2. Check if the sheet is empty to decide if we append headers
  let isEmpty = false;
  try {
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:B2`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (checkRes.ok) {
      const data = await checkRes.json();
      if (!data.values || data.values.length === 0) {
        isEmpty = true;
      }
    }
  } catch (err) {
    console.error("Error reading sheet values:", err);
  }

  const finalValues = [];
  if (isEmpty) {
    finalValues.push(headers);
  }
  finalValues.push(...rows);

  // 3. Append the values
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:A:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: finalValues,
      }),
    }
  );

  if (!appendRes.ok) {
    const errText = await appendRes.text();
    throw new Error(`Error al escribir datos en Google Sheets: ${errText}`);
  }
}

/**
 * Fetches recent records from the daily summary sheet to display in the dashboard logs.
 */
export async function getRecentSummaryLogs(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  maxRecords: number = 5
): Promise<any[]> {
  try {
    const range = `${encodeURIComponent(sheetName)}!A1:G200`;
    const res = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error al leer el resumen: ${errText}`);
    }

    const data = await res.json();
    if (!data.values || data.values.length <= 1) {
      return [];
    }

    // Row layout: ["Fecha", "CodigoPostal", "Recibidos", "Entregados", "Incidencias", "GeneradoEuro", "RolRepartidor"]
    const rows = data.values.slice(1); // skip headers

    const records = rows.map((row: any, index: number) => {
      return {
        id: `sheets-row-${index + 2}`,
        fields: {
          Fecha: row[0] || "",
          CodigoPostal: row[1] || "",
          Recibidos: Number(row[2] || 0),
          Entregados: Number(row[3] || 0),
          Incidencias: Number(row[4] || 0),
          GeneradoEuro: Number(row[5] || 0),
          RolRepartidor: row[6] || "Claudio",
        },
      };
    });

    // Reverse to get the latest appended records first
    records.reverse();
    return records.slice(0, maxRecords);
  } catch (error) {
    console.error("Failed to fetch Google Sheets recent logs:", error);
    throw error;
  }
}

/**
 * Tests connection to a spreadsheet and tab sheet.
 */
export async function testSheetsConnection(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const range = `${encodeURIComponent(sheetName)}!A1:A1`;
  const res = await fetch(
    `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Fallo de conexión con Google Sheets: ${errText}`);
  }
}

/**
 * Lists the user's spreadsheets from Google Drive.
 */
export async function listSpreadsheetsInDrive(accessToken: string): Promise<any[]> {
  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=30`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al listar archivos de Google Drive: ${errText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Searches the user's Google Drive for a spreadsheet named "Registro de Reparto - erceppiDEV" or "Registro de Reparto - Claudio".
 * If found, returns its spreadsheetId and name. If not, automatically creates a new one with the appropriate tabs and headers.
 */
export async function findOrCreateAppSpreadsheet(
  accessToken: string,
  deliveriesSheetName: string = "Entregas",
  summariesSheetName: string = "Resumen"
): Promise<{ spreadsheetId: string; name: string; isNew: boolean }> {
  const fileNames = ["Registro de Reparto - erceppiDEV", "Registro de Reparto - Claudio", "Registro de Reparto"];
  
  for (const fileName of fileNames) {
    const query = encodeURIComponent(`name = '${fileName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          // Found existing file!
          return { spreadsheetId: data.files[0].id, name: data.files[0].name, isNew: false };
        }
      }
    } catch (err) {
      console.error(`Error searching for ${fileName} in Google Drive:`, err);
    }
  }

  // Not found, create a new one with the modern name!
  const newName = "Registro de Reparto - erceppiDEV";
  const created = await createSpreadsheet(accessToken, newName, deliveriesSheetName, summariesSheetName);
  return { spreadsheetId: created.spreadsheetId, name: newName, isNew: true };
}

