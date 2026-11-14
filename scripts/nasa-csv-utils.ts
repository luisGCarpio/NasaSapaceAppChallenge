import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** Parses CSV text supporting BOM, RFC-4180 quotes, and uneven trailing columns. */
export function parseCsv(rawText: string): ParsedCsv {
  const clean = rawText.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length === 1 && cells[0].trim() === '') continue;
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = (cells[c] ?? '').trim();
    }
    rows.push(row);
  }
  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Finds first matching column value using normalized case-insensitive key aliases. */
export function pickCol(row: Record<string, string>, aliases: string[]): string {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const target = alias.toLowerCase();
    for (const [k, v] of entries) {
      if (k.toLowerCase().trim() === target && v !== undefined && v !== '') return v;
    }
  }
  for (const alias of aliases) {
    const target = alias.toLowerCase();
    for (const [k, v] of entries) {
      if (k.toLowerCase().includes(target) && v !== undefined && v !== '') return v;
    }
  }
  return '';
}

/** Parses numeric clinical fields and extracts optional `(L)`/`(H)` flags. */
export function parseClinicalNumber(raw: string): { value: number | undefined; flag: string | null } {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed || /^(na|n\/a|null|negative|trace|\.+|-+)$/i.test(trimmed)) {
    return { value: undefined, flag: null };
  }
  const flagMatch = trimmed.match(/\(([LHlh])\)/);
  const numMatch = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (!numMatch) return { value: undefined, flag: null };
  const n = Number(numMatch[0]);
  if (!Number.isFinite(n)) return { value: undefined, flag: null };
  return { value: n, flag: flagMatch ? `Lab Flag: ${flagMatch[1].toUpperCase()}` : null };
}

/** Parses HH:MM (or decimal hours) into decimal hours. */
export function parseDurationHours(raw: string): number | undefined {
  const s = String(raw ?? '').trim();
  if (!s || /^(na|n\/a|null)$/i.test(s)) return undefined;
  const hhmm = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (hhmm) {
    const h = Number(hhmm[1]);
    const m = Number(hhmm[2]);
    const sec = Number(hhmm[3] ?? 0);
    if (m >= 60 || sec >= 60) return undefined;
    return Number((h + m / 60 + sec / 3600).toFixed(2));
  }
  const num = Number(s);
  return Number.isFinite(num) && num >= 0 && num <= 24 ? Number(num.toFixed(2)) : undefined;
}

export function sha256Of(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function normalizePhaseOrder(phaseRaw: string, brDayRaw: string, timeMin = 0): {
  phase: string;
  relativeDay: number;
  sortOrder: number;
} {
  const phase = phaseRaw.trim().toUpperCase();
  const parsedDay = Number(String(brDayRaw ?? '').replace(/[^\d.-]/g, ''));
  const day = Number.isFinite(parsedDay) ? parsedDay : 0;

  if (phase.includes('PRE')) {
    const rel = day > 0 ? -Math.abs(day) : day;
    return { phase: 'PRE_TEST', relativeDay: rel, sortOrder: (1000 + rel) * 1000 + timeMin };
  }
  if (phase.includes('POST') || phase.startsWith('R+')) {
    const rel = Math.abs(day);
    return { phase: 'POST_TEST', relativeDay: rel, sortOrder: (2000 + rel) * 1000 + timeMin };
  }
  if (phase.startsWith('L-')) {
    const rel = -Math.abs(day);
    return { phase: 'FLIGHT_PRE', relativeDay: rel, sortOrder: (1000 + rel) * 1000 + timeMin };
  }
  const rel = Math.abs(day);
  return { phase: phase || 'IN_TEST', relativeDay: rel, sortOrder: (1500 + rel) * 1000 + timeMin };
}

export async function downloadWithCache(
  url: string,
  cachePath: string,
  force = false
): Promise<{ text: string; bytes: number; sha256: string }> {
  if (!force) {
    try {
      const existing = await fs.readFile(cachePath, 'utf8');
      if (existing.length > 0 && !existing.startsWith('{"success":false')) {
        return { text: existing, bytes: Buffer.byteLength(existing, 'utf8'), sha256: sha256Of(existing) };
      }
    } catch {
      // Fall through to live download
    }
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  const text = await res.text();
  if (text.startsWith('{"success":false')) {
    throw new Error(`API error body from ${url}: ${text.slice(0, 120)}`);
  }
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, text, 'utf8');
  return { text, bytes: Buffer.byteLength(text, 'utf8'), sha256: sha256Of(text) };
}
