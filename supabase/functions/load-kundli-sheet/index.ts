import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractSheetMeta(sheetUrl: string): { sheetId: string; gid: string } {
  const url = new URL(sheetUrl);
  const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error("Invalid Google Sheet URL");
  }
  const sheetId = match[1];
  const gid = url.searchParams.get("gid") || "0";
  return { sheetId, gid };
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const next = csv[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function normalizeKey(key: string): string {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const sheetUrl = String(body.sheetUrl || "").trim();
    if (!sheetUrl) {
      return new Response(
        JSON.stringify({ error: "sheetUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { sheetId, gid } = extractSheetMeta(sheetUrl);
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    const response = await fetch(exportUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "KundliBulkImporter/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet CSV: ${response.status}`);
    }

    const csv = await response.text();
    const grid = parseCsv(csv);
    if (grid.length === 0) {
      throw new Error("Sheet is empty");
    }

    const header = grid[0].map((h) => String(h || "").trim());
    const normalizedHeader = header.map((h) => normalizeKey(h));

    const rows = grid
      .slice(1)
      .map((values, index) => {
        const raw: Record<string, string> = {};
        const normalized: Record<string, string> = {};
        for (let i = 0; i < header.length; i++) {
          // Strip surrounding double-quote characters that some Google Sheet cells
          // embed as literal data (e.g. cell contains "23:59" with quotes).
          const value = String(values[i] ?? "").trim().replace(/^"+|"+$/g, "").trim();
          const rawKey = header[i] || `column_${i + 1}`;
          const normalizedKey = normalizedHeader[i] || `column_${i + 1}`;
          raw[rawKey] = value;
          normalized[normalizedKey] = value;
        }
        return {
          rowNumber: index + 2,
          raw,
          normalized,
        };
      })
      .filter((row) => Object.values(row.normalized).some((v) => String(v || "").trim().length > 0));

    return new Response(
      JSON.stringify({
        sheetId,
        gid,
        headers: header,
        normalizedHeaders: normalizedHeader,
        totalRows: rows.length,
        rows,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ [LOAD-KUNDLI-SHEET] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
