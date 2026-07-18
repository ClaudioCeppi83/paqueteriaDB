// Client-side parsing utility for WhatsApp messages
// These are light client-side fallbacks to parse text formats locally in the browser.

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
