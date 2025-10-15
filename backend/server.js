require("dotenv").config();

// Enhanced startup diagnostics
console.log("🔧 Starting Backend Diagnostics...");
console.log(`📊 NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
console.log(`🔑 DATABASE_URL: ${process.env.DATABASE_URL ? "Set" : "Not Set"}`);
console.log(`🌐 PORT: ${process.env.PORT || 8000}`);

const app = require("./src/app");

const PORT = process.env.PORT || 8000;

// Add basic root route if not in app.js
app.get("/", (req, res) => {
  res.json({
    status: "backend-running",
    message: "Server is working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    service: "backend",
  });
});

// Add health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    backend: "running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Add a test API endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend API is working!",
    data: { service: "backend", status: "operational" },
  });
});

// Enhanced error handling
app.use((error, req, res, next) => {
  console.error("💥 Server Error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use("*", (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// ✅ CRITICAL: Use '0.0.0.0' for container environments
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🌐 Public URL: https://devoted-education-production.up.railway.app`
  );
  console.log(`✅ Available Endpoints:`);
  console.log(`   GET / - Root endpoint`);
  console.log(`   GET /health - Health check`);
  console.log(`   GET /api/test - Test endpoint`);
});
