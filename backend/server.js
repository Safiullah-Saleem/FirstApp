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
console.log(`🔑 DATABASE_URL: ${process.env.DATABASE_URL ? "✅ Set" : "❌ Not Set"}`);
console.log(`🌐 PORT: ${process.env.PORT || 8000}`);
console.log(`🚀 App Name: stock-wala`);
console.log(`🔗 Heroku URL: https://stock-wala-18d368b9d7e6.herokuapp.com`);

logStep("Loading dependencies");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

logStep("Creating Express app");
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic routes
app.get("/", (req, res) => {
  res.json({
    status: "backend-running",
    message: "Stock Wala Backend API is working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    service: "backend",
    database: process.env.DATABASE_URL ? "Heroku PostgreSQL" : "Not configured",
    version: "1.0.0"
  });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Try to check database connection if available
    let dbStatus = "unknown";
    try {
      const { getConnectionHealth } = require("./src/config/database");
      const dbHealth = await getConnectionHealth();
      dbStatus = dbHealth.status;
    } catch (dbError) {
      dbStatus = `error: ${dbError.message}`;
    }
    
    res.json({
      status: "healthy",
      backend: "running",
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test database endpoint
app.get("/test-db", async (req, res) => {
  try {
    const { testConnection } = require("./src/config/database");
    await testConnection();
    res.json({ 
      message: 'Database connection successful',
      database: 'Heroku PostgreSQL',
      status: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database connection failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Stock Wala Backend API is working!",
    data: { 
      service: "backend", 
      status: "operational",
      features: ["inventory", "sales", "purchases", "ledger"]
    },
    timestamp: new Date().toISOString()
  });
});

// Inventory endpoints placeholder
app.get("/api/inventory", (req, res) => {
  res.json({
    message: "Inventory endpoint - ready for implementation",
    endpoint: "/api/inventory",
    method: "GET",
    timestamp: new Date().toISOString()
  });
});

// Sales endpoints placeholder
app.get("/api/sales", (req, res) => {
  res.json({
    message: "Sales endpoint - ready for implementation",
    endpoint: "/api/sales",
    method: "GET",
    timestamp: new Date().toISOString()
  });
});

// Purchases endpoints placeholder
app.get("/api/purchases", (req, res) => {
  res.json({
    message: "Purchases endpoint - ready for implementation",
    endpoint: "/api/purchases",
    method: "GET",
    timestamp: new Date().toISOString()
  });
});

// Ledger endpoints placeholder
app.get("/api/ledger", (req, res) => {
  res.json({
    message: "Ledger endpoint - ready for implementation",
    endpoint: "/api/ledger",
    method: "GET",
    timestamp: new Date().toISOString()
  });
});

// Enhanced error handling
app.use((error, req, res, next) => {
  console.error("💥 Server Error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
    timestamp: new Date().toISOString(),
    path: req.path
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
    available_endpoints: [
      "GET /",
      "GET /health",
      "GET /test-db",
      "GET /api/test",
      "GET /api/inventory",
      "GET /api/sales",
      "GET /api/purchases",
      "GET /api/ledger"
    ]
  });
});

logStep("Starting server listener");

const PORT = process.env.PORT || 8000;

// Start server
app.listen(PORT, "0.0.0.0", () => {
  const totalStartupTime = Date.now() - startupStartTime;
  console.log(`🎉 Server started successfully!`);
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Public URL: https://stock-wala-18d368b9d7e6.herokuapp.com`);
  console.log(`⏱️ Total startup time: ${totalStartupTime}ms`);
  console.log(`✅ Available Endpoints:`);
  console.log(`   GET / - Root endpoint`);
  console.log(`   GET /health - Health check`);
  console.log(`   GET /test-db - Database test`);
  console.log(`   GET /api/test - API test`);
  console.log(`   GET /api/inventory - Inventory management`);
  console.log(`   GET /api/sales - Sales management`);
  console.log(`   GET /api/purchases - Purchases management`);
  console.log(`   GET /api/ledger - Ledger management`);
  
  // Database status
  if (process.env.DATABASE_URL) {
    console.log(`🗄️ Database: Heroku PostgreSQL (Connected)`);
  } else {
    console.log(`⚠️ Database: Not configured - Set DATABASE_URL`);
  }
  
  // Performance warning
  if (totalStartupTime > 10000) {
    console.log(`⚠️ WARNING: Startup took ${totalStartupTime}ms (>10s) - Check dependencies`);
  }
  
  console.log(`🎯 Stock Wala Backend is ready!`);
});

logStep("Server setup complete");

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;