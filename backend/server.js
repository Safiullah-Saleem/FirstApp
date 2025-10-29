require("dotenv").config();

// Lightweight startup diagnostics
console.log("🔧 Starting Backend...");
const startupStartTime = Date.now();

console.log(`📊 NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
console.log(`🔑 DATABASE_URL: ${process.env.DATABASE_URL ? "Set" : "Not Set"}`);
console.log(`🌐 PORT: ${process.env.PORT || 8000}`);

// Strictly load the Express app. If this fails, crash so Heroku shows logs.
const app = require("./src/app");

const PORT = process.env.PORT || 8000;

// Bind to 0.0.0.0 for Heroku/container environments
app.listen(PORT, "0.0.0.0", () => {
  const totalStartupTime = Date.now() - startupStartTime;
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`⏱️ Startup time: ${totalStartupTime}ms`);
});