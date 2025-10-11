require("dotenv").config();
const app = require("./src/app");

const PORT = process.env.PORT || 8000;

// ✅ CRITICAL: Use '0.0.0.0' for container environments
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🌐 Public URL: https://devoted-education-production.up.railway.app`
  );
  console.log(
    `🗄️  Database: ${process.env.DB_NAME || "Connected via DATABASE_URL"}`
  );
});
