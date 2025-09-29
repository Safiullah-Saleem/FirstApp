const { Sequelize } = require("sequelize");
require("dotenv").config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: console.log,
  }
);

// Test connection function
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connection established successfully.");

    // Sync database
    await sequelize.sync();
    console.log("✅ Database synced successfully.");
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
  }
};

module.exports = { sequelize, testConnection };
