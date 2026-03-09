import { testConnection } from "./db-config.ts";
async function test() {
  try {
    console.log("Attempting to connect to database...");
    await testConnection();
    console.log("SUCCESS! Database connection is working!");
    process.exit(0);
  } catch (error) {
    console.error("FAILED! Could not connect to database");
    console.error("Error:", error);
    process.exit(1);
  }
}

test();
