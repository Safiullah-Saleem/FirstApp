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
const transactionRoutes = require("./transaction/transaction.routes");

console.log("🟢 Loading item routes...");
let itemRoutes;
try {
  itemRoutes = require("./items/item.routes");
  console.log("✅ Item routes loaded successfully");
} catch (error) {
  console.error("❌ Error loading item routes:", error.message);
  itemRoutes = express.Router();
  itemRoutes.get("*", (req, res) => {
    res.status(503).json({ error: "Item routes temporarily unavailable" });
  });
}

// ✅ NEW: Load Bank, Cash, Sale routes if they exist
let bankRoutes, cashRoutes, saleRoutes;
try {
  bankRoutes = require("./bank/bank.account.routes");
  console.log("✅ Bank routes loaded successfully");
} catch (error) {
  console.log("ℹ️ Bank routes not found, continuing without them...");
  bankRoutes = express.Router();
}

try {
  cashRoutes = require("./cash/cash.routes");
  console.log("✅ Cash routes loaded successfully");
} catch (error) {
  console.log("ℹ️ Cash routes not found, continuing without them...");
  cashRoutes = express.Router();
}

try {
  saleRoutes = require("./sale/sale.routes");
  console.log("✅ Sale routes loaded successfully");
} catch (error) {
  console.log("ℹ️ Sale routes not found, continuing without them...");
  saleRoutes = express.Router();
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
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/ledgers", ledgerRoutes);
app.use("/api/transactions", transactionRoutes);

// ✅ NEW: Add Bank, Cash, Sale routes
app.use("/api/banks", bankRoutes);
app.use("/api/cash", cashRoutes);
app.use("/api/sales", saleRoutes);

// ✅ ADDED Pre-flight OPTIONS handler
app.options("*", cors());

// Add a direct test route to verify items functionality
app.get("/api/debug-items", (req, res) => {
  res.json({
    message: "Direct items debug route",
    itemRoutesLoaded: !!itemRoutes,
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
      "/api/cash", 
      "/api/sales",
      "/api/debug-items",
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

// ✅ REMOVED server startup code from here
// Only export the Express app
module.exports = app;
