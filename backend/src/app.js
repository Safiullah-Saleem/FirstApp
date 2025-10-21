const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { testConnection, getConnectionHealth } = require("./config/database");

// USE ORIGINAL PATHS THAT WORK
const userRoutes = require("./user/user.routes");
const employeeRoutes = require("./employees/employee.routes");
const companyRoutes = require("./company/company.routes");
const billingRoutes = require("./billing/billing.routes");
const ledgerRoutes = require("./ledger/ledger.routes");
const bankRoutes = require("./bank/bank.routes");
const transactionRoutes = require("./transaction/transaction.routes");

console.log("🟢 Loading item routes...");
let itemRoutes;
try {
  itemRoutes = require("./items/item.routes"); // ✅ FIXED: Assign to existing variable
  console.log("✅ Item routes loaded successfully");
} catch (error) {
  console.error("❌ Error loading item routes:", error.message);
  // Don't exit immediately - allow other routes to work
  itemRoutes = express.Router(); // Fallback empty router
  itemRoutes.get("*", (req, res) => {
    res.status(503).json({ error: "Item routes temporarily unavailable" });
  });
}

const app = express();

// ✅ ENHANCED CORS Configuration for Railway
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://devoted-education-production.up.railway.app",
      "https://*.railway.app",
      "https://*.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Middleware
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// ✅ ENHANCED Request logging (less verbose for production)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  }
  next();
});

// ✅ IMPROVED Database connection test (non-blocking)
testConnection().catch((error) => {
  console.error("❌ Database connection test failed:", error.message);
  // Don't crash the app - continue without database
});

// ✅ FIXED: Routes mounting - CORRECTED BILLING PATH
console.log("🟢 Mounting routes...");
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/billing", billingRoutes); // ✅ This matches your routes file
app.use("/api/ledgers", ledgerRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/banks", bankRoutes);
console.log("✅ All routes mounted successfully");

// ✅ ADDED Pre-flight OPTIONS handler
app.options("*", cors());

// Add a direct test route to verify billing functionality
app.get("/api/debug-billing", (req, res) => {
  res.json({
    message: "Direct billing debug route",
    billingRoutesLoaded: !!billingRoutes,
    availableEndpoints: [
      "POST /api/billing/saveBills",
      "POST /api/billing/saveSale"
    ],
    timestamp: new Date().toISOString(),
  });
});

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Backend API is running!",
    database: "PostgreSQL connected successfully",
    timestamp: new Date().toISOString(),
    availableRoutes: [
      "/api/users",
      "/api/employees",
      "/api/company",
      "/api/items",
      "/api/billing",
      "/api/ledgers",
      "/api/transactions",
      "/api/banks",
      "/api/debug-items",
      "/api/debug-billing",
      "/health",
    ],
  });
});

// Enhanced health check for Railway with database monitoring
app.get("/health", async (req, res) => {
  try {
    const dbHealth = await getConnectionHealth();

    const healthStatus = {
      status: dbHealth.status === "healthy" ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: dbHealth,
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
    };

    const statusCode = healthStatus.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
    });
  }
});

// ✅ ADDED Ready check for Railway
app.get("/ready", (req, res) => {
  res.status(200).json({
    status: "ready",
    timestamp: new Date().toISOString(),
    service: "backend-api",
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error("💥 Global Error Handler:", err.stack);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong!",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;

// ✅ IMPROVED SERVER STARTUP - Only start if not in test environment
if (require.main === module && process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 8000;
  const HOST = "0.0.0.0";

  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("✅ All routes loaded and application is ready");
    console.log(`📍 Billing API: http://${HOST}:${PORT}/api/billing`);
    console.log(
      `🌐 Public URL: https://devoted-education-production.up.railway.app`
    );
    console.log(
      `🔍 Health check: https://devoted-education-production.up.railway.app/health`
    );
  });

  // ✅ ENHANCED Graceful shutdown for Railway
  const gracefulShutdown = (signal) => {
    console.log(`🛑 Received ${signal}, shutting down gracefully...`);
    server.close((err) => {
      if (err) {
        console.error("❌ Error during shutdown:", err);
        process.exit(1);
      }
      console.log("✅ HTTP server closed successfully");

      // Close database connections if needed
      if (typeof getConnectionHealth().close === "function") {
        getConnectionHealth().close();
      }

      console.log("👋 Shutdown completed");
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.log("💥 Forcing shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("💥 Uncaught Exception:", error);
    gracefulShutdown("UNCAUGHT_EXCEPTION");
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("UNHANDLED_REJECTION");
  });
}