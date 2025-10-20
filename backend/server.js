require("dotenv").config();
const app = require("./src/app");
const { closeConnection } = require("./src/config/database");

const PORT = process.env.PORT || 8000;
const HOST = "0.0.0.0";

console.log("🚀 Starting server...");
console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);

const server = app.listen(PORT, HOST, () => {
  console.log(`🎯 Server running on http://${HOST}:${PORT}`);
  console.log("✅ All routes loaded and application is ready");
  console.log(`🌐 Public URL: https://devoted-education-production.up.railway.app`);
  console.log(`🔍 Health check: https://devoted-education-production.up.railway.app/health`);
  console.log(`📋 Available APIs: Users, Employees, Company, Items, Billing, Ledgers, Transactions, Banks, Cash, Sales`);
});

// ✅ ENHANCED Graceful shutdown for Railway
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  server.close(async (err) => {
    if (err) {
      console.error("❌ Error during server shutdown:", err);
      process.exit(1);
    }
    
    console.log("✅ HTTP server closed successfully");
    
    // Close database connection
    try {
      await closeConnection();
      console.log("✅ Database connection closed successfully");
    } catch (dbError) {
      console.error("❌ Error closing database connection:", dbError.message);
    }
    
    console.log("👋 Shutdown completed successfully");
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log("💥 Forcing shutdown after timeout");
    process.exit(1);
  }, 10000);
};

// Handle process signals
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

// Handle Railway-specific shutdown signals
process.on("beforeExit", async () => {
  console.log("🔚 Process is about to exit, cleaning up...");
  await closeConnection();
});

// Export for testing
module.exports = server;