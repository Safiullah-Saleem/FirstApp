const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { testConnection } = require("./config/database");

// USE ORIGINAL PATHS THAT WORK
const userRoutes = require("./user/user.routes");
const employeeRoutes = require("./employees/employee.routes");
const companyRoutes = require("./company/company.routes");
const billingRoutes = require("./billing/billing.routes");
const ledgerRoutes = require("./ledger/ledger.routes");
const transactionRoutes = require("./transaction/transaction.routes");

console.log("🟢 Loading item routes...");
try {
  const itemRoutes = require("./items/item.routes");
  console.log("✅ Item routes loaded successfully");
} catch (error) {
  console.error("❌ Error loading item routes:", error.message);
  process.exit(1);
}
const itemRoutes = require("./items/item.routes");

const app = express();

// Middleware
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors());

// Request logging
app.use((req, res, next) => {
  console.log("=== INCOMING REQUEST ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Path:", req.path);
  console.log("Content-Type:", req.headers["content-type"]);
  console.log("Body:", req.body);
  console.log("=== END REQUEST LOG ===");
  next();
});

// Test database connection
testConnection();

// Routes
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/ledgers", ledgerRoutes);
app.use("/api/transactions", transactionRoutes);

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
    availableRoutes: [
      "/api/users",
      "/api/employees",
      "/api/company",
      "/api/items",
      "/api/billing",
      "/api/ledgers",
      "/api/transactions",
      "/api/debug-items",
    ],
  });
});

// Health check for Railway
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  console.log("❌ 404 - Route not found for:", req.method, req.originalUrl);
  res.status(404).json({ error: "Route not found" });
});

module.exports = app;

// ✅ SERVER STARTUP CODE - ADDED FOR RAILWAY
const PORT = process.env.PORT || 8000;
const HOST = "0.0.0.0";

// Only start the server if this file is run directly (not when required)
if (require.main === module) {
  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("✅ Application is ready to receive requests");
    console.log(
      `🌐 Public URL: https://devoted-education-production.up.railway.app`
    );
  });

  // Graceful shutdown handling for Railway
  process.on("SIGTERM", () => {
    console.log("🛑 Received SIGTERM, shutting down gracefully...");
    server.close(() => {
      console.log("✅ Server closed successfully");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("🛑 Received SIGINT, shutting down gracefully...");
    server.close(() => {
      console.log("✅ Server closed successfully");
      process.exit(0);
    });
  });
}
