const { sequelize } = require("./src/config/database");

async function migrateDatabase() {
  try {
    console.log("🔄 Starting database migration...");
    
    // Add new columns to transactions table
    await sequelize.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bank_id BIGINT,
      ADD COLUMN IF NOT EXISTS cheque_number VARCHAR(255);
    `);
    
    console.log("✅ Added payment_method, bank_id, cheque_number columns to transactions table");
    
    // Create banks table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS banks (
        id BIGSERIAL PRIMARY KEY,
        company_code VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        account_number VARCHAR(255),
        branch VARCHAR(255),
        opening_balance DECIMAL(18,2) DEFAULT 0,
        balance DECIMAL(18,2) DEFAULT 0,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        modified_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
      );
    `);
    
    console.log("✅ Created banks table");
    
    // Add indexes for performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
      CREATE INDEX IF NOT EXISTS idx_transactions_bank_id ON transactions(bank_id);
      CREATE INDEX IF NOT EXISTS idx_banks_company_code ON banks(company_code);
      CREATE INDEX IF NOT EXISTS idx_banks_name ON banks(name);
    `);
    
    console.log("✅ Added indexes for performance");
    
    console.log("✅ Migration completed - no constraints added for simple text passing");
    
    console.log("🎉 Database migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log("✅ Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
}

module.exports = migrateDatabase;
