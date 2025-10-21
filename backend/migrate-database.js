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
    
    // Add ledger_id column to sales table if it doesn't exist
    await sequelize.query(`
      ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS ledger_id UUID DEFAULT NULL;
    `);

    console.log("✅ Added ledger_id column to sales table");

    // Note: purchases table doesn't exist yet, will be created when purchase model is used

    // Add indexes for performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
      CREATE INDEX IF NOT EXISTS idx_transactions_bank_id ON transactions(bank_id);
      CREATE INDEX IF NOT EXISTS idx_banks_company_code ON banks(company_code);
      CREATE INDEX IF NOT EXISTS idx_banks_name ON banks(name);
      CREATE INDEX IF NOT EXISTS idx_sales_ledger_id ON sales(ledger_id);
    `);
    
    console.log("✅ Added indexes for performance");

    // Check if cash_accounts table exists and has the correct structure
    const tableCheck = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'cash_accounts'
    `);

    const existingColumns = tableCheck[0].map(col => col.column_name);

    if (existingColumns.length === 0) {
      // Table doesn't exist, create it
      await sequelize.query(`
        CREATE TABLE cash_accounts (
          _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_code VARCHAR(255) NOT NULL,
          cash_name VARCHAR(255) NOT NULL DEFAULT 'cashInHand',
          balance DECIMAL(15,2) DEFAULT 0.00,
          date DATE DEFAULT CURRENT_DATE,
          description TEXT DEFAULT '',
          created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
          modified_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
        );
      `);
      console.log("✅ Created cash_accounts table");
    } else if (!existingColumns.includes('cash_name')) {
      // Table exists but is missing cash_name column, drop and recreate
      await sequelize.query(`DROP TABLE IF EXISTS cash_accounts CASCADE`);
      await sequelize.query(`
        CREATE TABLE cash_accounts (
          _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_code VARCHAR(255) NOT NULL,
          cash_name VARCHAR(255) NOT NULL DEFAULT 'cashInHand',
          balance DECIMAL(15,2) DEFAULT 0.00,
          date DATE DEFAULT CURRENT_DATE,
          description TEXT DEFAULT '',
          created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
          modified_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
        );
      `);
      console.log("✅ Recreated cash_accounts table with correct structure");
    } else {
      console.log("✅ cash_accounts table already exists with correct structure");
    }

    // Add indexes for cash_accounts table
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_cash_accounts_company_code ON cash_accounts(company_code);
      CREATE INDEX IF NOT EXISTS idx_cash_accounts_cash_name ON cash_accounts(cash_name);
    `);

    console.log("✅ Added indexes for cash_accounts table");

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
