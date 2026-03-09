import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import { testConnection } from "./db-config.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Allow React Native to connect
app.use(express.json());

// Test database connection on startup
async function startServer() {
  try {
    await testConnection();

    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
      console.log(`Database: ${process.env.DB_NAME}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// API ROUTES

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running!" });
});

// Get company profile by ID
app.get("/api/companies/:id", async (req, res) => {
  try {
    const { executeQuery } = await import("./db-config.ts");
    const companyId = parseInt(req.params.id);

    console.log("Fetching company with ID:", companyId);

    const query = `
      SELECT 
        company_id,
        company_name,
        email_domain,
        website_url,
        logo_url,
        mission_statement,
        core_values,
        benefits_summary,
        num_employees,
        location_type,
        background_color,
        primary_color,
        is_verified
      FROM Companies
      WHERE company_id = ? AND is_active = TRUE
    `;

    const results = await executeQuery(query, [companyId]);

    console.log("Query results:", results);

    if (results.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json(results[0]);
  } catch (error: any) {
    console.error("Error fetching company:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Update company profile
app.put("/api/companies/:id", async (req, res) => {
  try {
    const { executeQuery } = await import("./db-config.ts");
    const companyId = parseInt(req.params.id);

    console.log("Updating company with ID:", companyId);
    console.log("Request body:", req.body);

    const {
      company_name,
      website_url,
      logo_url,
      mission_statement,
      core_values,
      benefits_summary,
      num_employees,
      location_type,
      background_color,
      primary_color,
    } = req.body;

    const query = `
      UPDATE Companies
      SET 
        company_name = ?,
        website_url = ?,
        logo_url = ?,
        mission_statement = ?,
        core_values = ?,
        benefits_summary = ?,
        num_employees = ?,
        location_type = ?,
        background_color = ?,
        primary_color = ?
      WHERE company_id = ?
    `;

    await executeQuery(query, [
      company_name,
      website_url,
      logo_url,
      mission_statement,
      core_values,
      benefits_summary,
      num_employees,
      location_type,
      background_color,
      primary_color,
      companyId,
    ]);

    console.log("Company updated successfully");

    res.json({ success: true, message: "Company profile updated" });
  } catch (error: any) {
    console.error("Error updating company:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Get all companies
app.get("/api/companies", async (req, res) => {
  try {
    const { executeQuery } = await import("./db-config.ts");

    console.log("Fetching all companies");

    const query = `
      SELECT 
        company_id,
        company_name,
        email_domain,
        website_url,
        logo_url,
        mission_statement,
        location_type,
        background_color,
        primary_color,
        is_verified
      FROM Companies
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `;

    const results = await executeQuery(query, []);

    console.log("Found companies:", results.length);

    res.json(results);
  } catch (error: any) {
    console.error("Error fetching companies:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

startServer();
