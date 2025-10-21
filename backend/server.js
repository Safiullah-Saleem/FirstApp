require("dotenv").config();

// Enhanced startup diagnostics with timing
console.log("🔧 Starting Backend Diagnostics...");
const startupStartTime = Date.now();
let lastLogTime = startupStartTime;

function logStep(stepName) {
  const now = Date.now();
  const totalElapsed = now - startupStartTime;
  const stepElapsed = now - lastLogTime;
  console.log(`⏱️ [${totalElapsed}ms +${stepElapsed}ms] ${stepName}`);
  lastLogTime = now;
}

logStep("Starting diagnostics");
console.log(`📊 NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
console.log(`🔑 DATABASE_URL: ${process.env.DATABASE_URL ? "Set" : "Not Set"}`);
console.log(`🌐 PORT: ${process.env.PORT || 8000}`);

logStep("Loading app module");

// ✅ TEMPORARILY DISABLE NEW ROUTES IN APP.JS
// Create a simple app if main app fails
let app;
try {
  app = require("./src/app");
  console.log("✅ Main app loaded successfully");
} catch (error) {
  console.error("❌ Error loading main app, using fallback:", error.message);
  
  // Fallback simple express app
  const express = require("express");
  app = express();
  
  // Basic middleware
  app.use(require("cors")());
  app.use(require("body-parser").json());
  
  // Basic routes
  app.get("/", (req, res) => {
    res.json({
      status: "backend-running",
      message: "Server is working! (Fallback Mode)",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      service: "backend",
      note: "Main app failed to load, using fallback"
    });
  });
}

const PORT = process.env.PORT || 8000;

// Add health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    backend: "running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mode: "fallback"
  });
});

// Add a test API endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend API is working!",
    data: { service: "backend", status: "operational" },
    mode: "fallback"
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

logStep("Starting server listener");

// ✅ CRITICAL: Use '0.0.0.0' for container environments
app.listen(PORT, "0.0.0.0", () => {
  const totalStartupTime = Date.now() - startupStartTime;
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Public URL: https://devoted-education-production.up.railway.app`);
  console.log(`⏱️ Total startup time: ${totalStartupTime}ms`);
  console.log(`✅ Available Endpoints:`);
  console.log(`   GET / - Root endpoint`);
  console.log(`   GET /health - Health check`);
  console.log(`   GET /api/test - Test endpoint`);
  
  // Critical: Log if startup took too long
  if (totalStartupTime > 10000) { // 10 seconds
    console.log(`⚠️ WARNING: Startup took ${totalStartupTime}ms (>10s) - Potential performance issue`);
  }
});

// Also add this to track module loading time
logStep("Server setup complete");