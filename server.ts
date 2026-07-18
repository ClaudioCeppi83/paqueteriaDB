import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// Fallback Morning Parser
function fallbackParseMorning(text: string) {
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

// Fallback Afternoon Parser
function fallbackParseAfternoon(text: string) {
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

// Parsing API endpoint using Gemini API or local fallback
app.post("/api/parse", async (req, res) => {
  const { text, type } = req.body;

  if (!text) {
    return res.status(400).json({ error: "El texto es obligatorio" });
  }

  const ai = getGeminiClient();

  if (!ai) {
    console.log("Gemini API Key not configured or invalid, using robust local JS fallback parser.");
    if (type === "morning") {
      return res.json({ source: "fallback", data: fallbackParseMorning(text) });
    } else {
      return res.json({ source: "fallback", data: fallbackParseAfternoon(text) });
    }
  }

  try {
    if (type === "morning") {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analiza el siguiente mensaje de WhatsApp matutino de un repartidor. Extrae las calles, números de casa (como "S/N" o números como "56", "29") y la cantidad de paquetes para cada dirección.
Si una dirección tiene multiplicador (como "29 x2" o "5 x2"), la cantidad es 2 (o el número indicado). De lo contrario, la cantidad es 1.
Ignora el nombre del repartidor ("Claudio") y cualquier saludo.
Debes devolver un objeto JSON estricto con el siguiente esquema:
{
  "packages": [
    { "street": "Nombre de la Calle", "number": "Número (ej. 56 o S/N)", "quantity": 1 }
  ],
  "totalCount": número (suma de todas las cantidades),
  "messageTotal": número (el total que se declara al final del mensaje como "Total: 30", si existe)
}

Mensaje de WhatsApp:
"""
${text}
"""`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              packages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    street: { type: Type.STRING },
                    number: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                  },
                  required: ["street", "number", "quantity"],
                },
              },
              totalCount: { type: Type.INTEGER },
              messageTotal: { type: Type.INTEGER },
            },
            required: ["packages", "totalCount", "messageTotal"],
          },
        },
      });

      const parsedData = JSON.parse(response.text.trim());
      return res.json({ source: "gemini", data: parsedData });
    } else {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analiza el siguiente mensaje de WhatsApp vespertino de un repartidor. Extrae el código postal, la fecha, la cantidad de paquetes recibidos, entregados e incidencias.
Debes devolver un objeto JSON estricto con el siguiente esquema:
{
  "postalCode": "código postal (ej. 08918)",
  "date": "fecha en formato DD/MM/YYYY (ej. 17/07/2025)",
  "received": número (bajo "Recibidos"),
  "incidents": número (bajo "Incidencias"),
  "delivered": número (bajo "Entregados"),
  "earnings": número (calcula entregados * 0.70, con dos decimales)
}

Mensaje de WhatsApp:
"""
${text}
"""`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              postalCode: { type: Type.STRING },
              date: { type: Type.STRING },
              received: { type: Type.INTEGER },
              incidents: { type: Type.INTEGER },
              delivered: { type: Type.INTEGER },
              earnings: { type: Type.NUMBER },
            },
            required: ["postalCode", "date", "received", "incidents", "delivered", "earnings"],
          },
        },
      });

      const parsedData = JSON.parse(response.text.trim());
      return res.json({ source: "gemini", data: parsedData });
    }
  } catch (error: any) {
    console.error("Gemini Parsing Error:", error);
    // Graceful fallback on error
    if (type === "morning") {
      return res.json({ source: "fallback-after-error", data: fallbackParseMorning(text) });
    } else {
      return res.json({ source: "fallback-after-error", data: fallbackParseAfternoon(text) });
    }
  }
});

// Configure Vite or Static Assets serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
