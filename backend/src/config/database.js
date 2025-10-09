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
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      // Ensure auto-commit is enabled
      autocommit: true,
    },
  }
);

// Test connection function
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connection established successfully.");

    // Drop legacy global unique constraints if they exist (migrating to composite uniques)
    try {
      await sequelize.query('ALTER TABLE "items" DROP CONSTRAINT IF EXISTS items_itemId_key;');
      await sequelize.query('ALTER TABLE "items" DROP CONSTRAINT IF EXISTS items_barCode_key;');
      console.log("Dropped legacy unique constraints on items.itemId/barCode (if existed).");
    } catch (e) {
      console.warn("Warning dropping legacy constraints:", e.message);
    }

    // Sync models and indexes (safe mode to avoid conflicts)
    await sequelize.sync({ force: false, alter: false });
    console.log("Database tables verified and ready.");
  } catch (error) {
    console.error("Database connection error:", error.message);
  }
};

module.exports = { sequelize, testConnection };
