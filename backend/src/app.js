const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { testConnection } = require("./config/database");

// USE ORIGINAL PATHS THAT WORK
const userRoutes = require("./user/user.routes");
const employeeRoutes = require("./employees/employee.routes");
const companyRoutes = require("./company/company.routes");

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
      "/api/debug-items",
    ],
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
