// src/features/profile/edit/profileEdit.search.ts

export const STOP_WORDS = new Set(["of", "the", "and", "at", "for", "in", "on", "a", "an", "to", "with", "&"]);

export function normalizeSearchText(input: string) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string) {
  const base = normalizeSearchText(input);
  if (!base) return [];
  return base.split(" ").map((t) => t.trim()).filter(Boolean);
}

export function makeAcronymFromTokens(tokens: string[]) {
  const letters = tokens
    .filter((t) => t && !STOP_WORDS.has(t))
    .map((t) => t[0])
    .filter(Boolean);
  return letters.join("");
}

export function cityAliases(city: string) {
  const c = normalizeSearchText(city);
  const out: string[] = [];
  if (!c) return out;
  if (c === "los angeles") out.push("la");
  if (c === "new york") out.push("nyc");
  if (c === "saint louis") out.push("st louis", "stl");
  if (c === "saint paul") out.push("st paul");
  return out;
}