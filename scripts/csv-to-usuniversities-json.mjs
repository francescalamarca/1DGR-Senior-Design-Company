import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- paths ----
const CSV_PATH = path.resolve(__dirname, "../src/data/usuniversities.csv");
const OUT_PATH = path.resolve(__dirname, "../src/data/usuniversities.json");

// ---- FIPS → State name ----
const FIPS_TO_STATE = {
  "01": "Alabama",
  "02": "Alaska",
  "04": "Arizona",
  "05": "Arkansas",
  "06": "California",
  "08": "Colorado",
  "09": "Connecticut",
  "10": "Delaware",
  "11": "District of Columbia",
  "12": "Florida",
  "13": "Georgia",
  "15": "Hawaii",
  "16": "Idaho",
  "17": "Illinois",
  "18": "Indiana",
  "19": "Iowa",
  "20": "Kansas",
  "21": "Kentucky",
  "22": "Louisiana",
  "23": "Maine",
  "24": "Maryland",
  "25": "Massachusetts",
  "26": "Michigan",
  "27": "Minnesota",
  "28": "Mississippi",
  "29": "Missouri",
  "30": "Montana",
  "31": "Nebraska",
  "32": "Nevada",
  "33": "New Hampshire",
  "34": "New Jersey",
  "35": "New Mexico",
  "36": "New York",
  "37": "North Carolina",
  "38": "North Dakota",
  "39": "Ohio",
  "40": "Oklahoma",
  "41": "Oregon",
  "42": "Pennsylvania",
  "44": "Rhode Island",
  "45": "South Carolina",
  "46": "South Dakota",
  "47": "Tennessee",
  "48": "Texas",
  "49": "Utah",
  "50": "Vermont",
  "51": "Virginia",
  "53": "Washington",
  "54": "West Virginia",
  "55": "Wisconsin",
  "56": "Wyoming",
};

// ---- simple CSV parser (handles quoted commas) ----
function parseCSV(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if (char === "\n" && !inQuotes) {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(h) {
  return String(h ?? "").trim();
}

function findHeaderIndex(headers, candidates) {
  for (const name of candidates) {
    const i = headers.findIndex((h) => normalizeHeader(h) === name);
    if (i !== -1) return i;
  }
  return -1;
}

// ✅ numeric fips cleanup (handles "29", "29.0", " 29 ", etc.)
function normalizeFips(raw) {
  let f = String(raw ?? "").trim();
  if (!f) return "";

  f = f.replace(/\.0$/, ""); // "29.0" -> "29"
  f = f.replace(/[^\d]/g, ""); // keep only digits
  if (!f) return "";

  const n = parseInt(f, 10);
  if (!Number.isFinite(n)) return "";
  return String(n).padStart(2, "0");
}

// ✅ state value can be FULL NAME (like "Alabama") OR a FIPS code
function normalizeState(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  // If it contains any letters, assume it is already a name (ex: "Alabama")
  if (/[A-Za-z]/.test(s)) return s;

  // Otherwise treat as FIPS-ish numeric
  const fips = normalizeFips(s);
  return FIPS_TO_STATE[fips] || "";
}

// ---- run ----
if (!fs.existsSync(CSV_PATH)) {
  console.error("CSV not found at:", CSV_PATH);
  process.exit(1);
}

const csvText = fs.readFileSync(CSV_PATH, "utf8");
const rows = parseCSV(csvText);

const headersRaw = rows.shift() || [];
const headers = headersRaw.map(normalizeHeader);

// ✅ safer header matching
const IDX = {
  unitid: findHeaderIndex(headers, ["unitid", "HD2024.UNITID for merged schools"]),
  name: findHeaderIndex(headers, ["institution name"]),
  city: findHeaderIndex(headers, ["HD2024.City location of institution", "City", "city"]),
  stateOrFips: findHeaderIndex(headers, ["HD2024.FIPS state code", "FIPS state code"]),
};

// ✅ fail loudly if required columns are missing
const required = ["unitid", "name", "city", "stateOrFips"];
for (const key of required) {
  if (IDX[key] === -1) {
    console.error("Headers found:", headers);
    throw new Error(`Missing required CSV column for "${key}"`);
  }
}

const universities = rows
  .map((row, i) => {
    const unitid = String(row[IDX.unitid] || "").trim();
    const name = String(row[IDX.name] || "").trim();
    const city = String(row[IDX.city] || "").trim();
    const state = normalizeState(row[IDX.stateOrFips]);

    if (!name) return null;

    // ✅ build label without empty commas
    const labelParts = [name, city, state, "USA"].map((x) => String(x || "").trim()).filter(Boolean);
    const label = labelParts.join(", ");

    return {
      id: unitid || `${i}`,
      unitid,
      name,
      city,
      state,
      country: "USA",
      label,
      nameLower: name.toLowerCase(),
      cityLower: city.toLowerCase(),
      stateLower: state.toLowerCase(),
      labelLower: label.toLowerCase(),
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(OUT_PATH, JSON.stringify(universities, null, 2), "utf8");

console.log(`✅ Converted ${universities.length} universities`);
console.log("➡ Output:", OUT_PATH);