const { Sequelize } = require("sequelize");
require("dotenv").config();

let sequelize;

// Use full DATABASE_URL if available
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true, // ✅ Required by Railway
        rejectUnauthorized: false, // ✅ Prevents SSL errors
      },
    },
    logging: false,
  });
} else {
  // Otherwise use individual environment variables
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: "postgres",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
}

// Test connection function
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connection established successfully.");

    await sequelize.sync({ alter: false });
    console.log("✅ Database tables verified and ready.");
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
  }
};

module.exports = { sequelize, testConnection };
