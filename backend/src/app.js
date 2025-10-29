const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { testConnection, getConnectionHealth } = require("./config/database");

const app = express();

// ✅ Track database initialization status
let dbInitialized = false;
let routesMounted = false;

// ✅ FIXED CORS Configuration
app.use(
  cors({
    origin: [
      "https://stock-wala-03.web.app",  // ✅ No slash
      "http://localhost:5173",
      "https://stock-wala-18d368b9d7e6.herokuapp.com"  // ✅ Add Heroku URL
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// ✅ ADDED Referrer-Policy header for security
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

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

// ✅ Database readiness middleware - block requests until DB is ready
app.use((req, res, next) => {
  // Allow health check endpoints to work even if DB is not ready
  if (req.path === '/health' || req.path === '/ready') {
    return next();
  }
  
  if (!dbInitialized) {
    return res.status(503).json({
      error: "Database is initializing",
      message: "Please wait a moment and try again",
      timestamp: new Date().toISOString()
    });
  }
  
  next();
});

// ✅ IMPROVED Database connection test with readiness tracking
const initializeDatabaseAsync = async () => {
  let retryCount = 0;
  const maxRetries = 2; // Reduced since we have more robust retry logic in database.js
  const retryDelay = 5000; // 5 seconds - increased delay for sleeping databases

  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 Database connection attempt ${retryCount + 1}/${maxRetries}...`);
      await testConnection(false); // Don't sync yet, models aren't loaded
      console.log("✅ Database connection established successfully");

      // Load and associate models after database connection
      console.log("🔄 Loading models and setting up associations...");
      const models = require('./models/index.js');
      console.log("✅ Models loaded and associations set up successfully");

      // Sync database with models loaded - handle errors gracefully
      console.log("🔄 Syncing database...");
      const { sequelize } = require('./config/database');
      try {
        await sequelize.sync({ alter: false });
        console.log("✅ Database tables synced successfully");
      } catch (syncError) {
        console.warn("⚠️  Database sync warning:", syncError.message);
        console.log("ℹ️  Database tables might already exist or have schema differences");
        console.log("ℹ️  Continuing without sync - existing tables will be used");
      }

      // ✅ Mark database as initialized
      dbInitialized = true;
      console.log("🎉 Database is ready to handle requests!");

      // ✅ Mount routes only after DB and models are ready to avoid circular-load issues
      if (!routesMounted) {
        console.log("🟢 Mounting routes...");

        // Load routes lazily now that models exist
        const userRoutes = require("./user/user.routes");
        const employeeRoutes = require("./employees/employee.routes");
        const companyRoutes = require("./company/company.routes");
        const billingRoutes = require("./billing/billing.routes");
        const ledgerRoutes = require("./ledger/ledger.account.routes");
        const bankRoutes = require("./bank/bank.account.routes");
        const cashRoutes = require("./cash/cash.account.routes");

        let itemRoutes;
        try {
          console.log("🟢 Loading item routes...");
          itemRoutes = require("./items/item.routes");
          console.log("✅ Item routes loaded successfully");
        } catch (error) {
          console.error("❌ Error loading item routes:", error.message);
          itemRoutes = express.Router();
          itemRoutes.get("*", (req, res) => {
            res.status(503).json({ error: "Item routes temporarily unavailable" });
          });
        }

        app.use("/api/users", userRoutes);
        app.use("/api/employees", employeeRoutes);
        app.use("/api/company", companyRoutes);
        app.use("/api/items", itemRoutes);
        app.use("/api/billing", billingRoutes);
        app.use("/api/ledger", ledgerRoutes);
        app.use("/api/cash", cashRoutes);
        app.use("/api/bank", bankRoutes);

        routesMounted = true;
        console.log("✅ All routes mounted successfully");
      }

      return;
    } catch (error) {
      retryCount++;
      console.error(`❌ Database connection attempt ${retryCount} failed:`, error.message);

      if (retryCount < maxRetries) {
        const delay = retryDelay * retryCount; // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        console.log(`💡 Railway free tier databases may take 30-90 seconds to wake up`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error("❌ All database connection attempts failed - continuing without database");
        console.error("💡 The server will continue running, but database operations may fail");
        console.error("💡 Railway free tier databases may take up to 2 minutes to wake up");
        // Don't mark as initialized if failed
        dbInitialized = false;
      }
    }
  }
};

// Start database initialization in background (non-blocking)
initializeDatabaseAsync().catch((error) => {
  console.error("❌ Database initialization failed:", error.message);
  dbInitialized = false;
});

// Routes will be mounted after database initialization above

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
      "/api/ledger",
      "/api/transactions",
      "/api/banks"
    ]
  });
});

// Health monitoring
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
  if (dbInitialized) {
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
      service: "backend-api",
      database: "ready"
    });
  } else {
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
      service: "backend-api",
      database: "initializing"
    });
  }
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

// ✅ CRITICAL: Export ONLY the Express app (no server startup)
module.exports = app;