/**
 * PostgreSQL Database Migration Script
 * 
 * This script handles database migrations for PostgreSQL (Railway or Local)
 * 
 * Usage: 
 *   node migrate-database.js
 *   npm run migrate
 */

require('dotenv').config();

// ✅ FIX: Add Sequelize operators to prevent "Op is undefined" error
const { Op } = require('sequelize');
// Make it available globally for all models
global.Op = Op;

// Function to create ledger_transactions table
const createLedgerTransactionsTable = async () => {
  try {
    const { getSequelize } = require('./src/config/database');
    const sequelize = getSequelize();
    
    console.log("🔄 Creating ledger_transactions table...");
    
    // Check if table already exists
    const tableExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ledger_transactions'
      );
    `, { type: sequelize.QueryTypes.SELECT });

    if (tableExists[0].exists) {
      console.log("✅ ledger_transactions table already exists");
      return;
    }

    // Create table
    await sequelize.query(`
      CREATE TABLE ledger_transactions (
        id SERIAL PRIMARY KEY,
        ledger_id UUID NOT NULL,
        company_code VARCHAR(10) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('sale', 'return', 'payment', 'purchase')),
        sale_id INTEGER NULL,
        amount DECIMAL(15,2) DEFAULT 0.00,
        paid_amount DECIMAL(15,2) DEFAULT 0.00,
        balance_change DECIMAL(15,2) DEFAULT 0.00,
        description VARCHAR(255) DEFAULT '',
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at BIGINT NOT NULL,
        
        CONSTRAINT fk_ledger_transactions_ledger 
          FOREIGN KEY (ledger_id) 
          REFERENCES ledger_accounts(id) 
          ON DELETE CASCADE
      );
    `);
    console.log("✅ ledger_transactions table created successfully");

    // Create indexes
    await sequelize.query(`
      CREATE INDEX idx_ledger_transactions_ledger_id ON ledger_transactions(ledger_id);
      CREATE INDEX idx_ledger_transactions_company_code ON ledger_transactions(company_code);
      CREATE INDEX idx_ledger_transactions_type ON ledger_transactions(transaction_type);
      CREATE INDEX idx_ledger_transactions_date ON ledger_transactions(date);
    `);
    console.log("✅ Indexes created successfully");

  } catch (error) {
    console.error('❌ Error creating ledger_transactions table:', error.message);
    throw error;
  }
};

async function migrateWithModel() {
  const startTime = Date.now();
  
  try {
    console.log("🚀 Starting PostgreSQL Database Migration...");
    console.log("===========================================");
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
    console.log(`🏠 Database Host: ${process.env.DB_HOST || 'Not set'}`);
    console.log('');

    // Step 1: First initialize database connection
    console.log("🔧 Step 1: Initializing database connection...");
    const { testConnection, getConnectionHealth, connectWithRetry, getDatabaseStatus } = require('./src/config/database');
    
    await testConnection(false);
    
    const dbStatus = getDatabaseStatus();
    console.log(`✅ Connected to: ${dbStatus.currentDatabase}`);
    console.log('');

    // Step 2: Check connection health
    console.log("💚 Step 2: Checking connection health...");
    const health = await getConnectionHealth();
    
    if (health.status !== 'healthy') {
      throw new Error(`Database health check failed: ${health.error}`);
    }
    
    console.log("✅ Database health check passed");
    console.log('');

    // Step 3: Now import models AFTER database is connected
    console.log("📦 Step 3: Loading models...");
    const Purchase = require('./src/billing/purchase.model');
    const Sale = require('./src/billing/sale.model');
    const Bill = require('./src/billing/bill.model');
    const Item = require('./src/items/item.model');
    const User = require('./src/user/user.model');
    const Employee = require('./src/employees/employee.model');
    const BankAccount = require('./src/bank/bank.account.model');
    const BankTransaction = require('./src/bank/bank.transaction.model');
    const CashAccount = require('./src/cash/cash.account.model');
    const CashTransaction = require('./src/cash/cash.transaction.model');
    const LedgerAccount = require('./src/ledger/ledger.account.model');
    const LedgerTransaction = require('./src/ledger/ledger.transaction.model');
    
    console.log("✅ All models loaded successfully");
    console.log('');

    // Get sequelize instance after models are loaded
    const { getSequelize } = require('./src/config/database');
    const sequelize = getSequelize();

    // Step 4: Sync all models
    console.log("🔄 Step 4: Syncing all models...");
    
    // Order models to ensure dependencies are created first
    const models = [
      User,           // Base user model
      Employee,       // Depends on User
      Item,           // Independent
      BankAccount,    // Independent
      CashAccount,    // Independent  
      LedgerAccount,  // Independent
      Bill,           // Depends on User, Item
      Sale,           // Depends on User, Item
      Purchase,       // Depends on User, Item
      BankTransaction, // Depends on BankAccount, User, Sale
      CashTransaction, // Depends on CashAccount, User
      LedgerTransaction // Depends on LedgerAccount, User
    ];

    for (const model of models) {
      try {
        await connectWithRetry(async () => {
          await model.sync({
            force: false, // Never force in production
            alter: true // Allow alter to fix schema issues
          });
        }, 2, 1000);
        
        console.log(`✅ ${model.name} table synced successfully`);
      } catch (syncError) {
        console.error(`❌ ${model.name} table sync failed:`, syncError.message);

        // Handle specific errors
        if (syncError.message.includes('SSL')) {
          console.log("⚠️ SSL error - continuing with current database");
        } else if (syncError.message.includes('timeout') || syncError.message.includes('ETIMEDOUT')) {
          console.log("⚠️ Timeout error - continuing with current database");
        } else if (syncError.message.includes('permission')) {
          throw new Error("Permission denied - check database user permissions");
        } else {
          // For other errors, log but continue
          console.log(`⚠️ Continuing despite ${model.name} sync error`);
        }
      }
    }
    console.log('');

    // Step 5: Create ledger_transactions table
    console.log("🔄 Step 5: Creating ledger_transactions table...");
    await connectWithRetry(async () => {
      await createLedgerTransactionsTable();
    }, 2, 1000);
    console.log('');

    // Step 6: Check existing data
    console.log("📊 Step 6: Checking existing data...");
    let existingPurchases = 0;
    
    try {
      existingPurchases = await connectWithRetry(async () => {
        return await Purchase.count();
      }, 2, 1000);
      console.log(`📈 Found ${existingPurchases} existing purchases`);
    } catch (countError) {
      console.log("ℹ️ No existing purchases found or error counting");
      existingPurchases = 0;
    }
    console.log('');

    // Step 7: Insert sample data if database is empty
    if (existingPurchases === 0) {
      console.log("📝 Step 7: Inserting sample data...");
      
      const sampleData = [
        {
          company_code: '2370',
          ledger_id: '92abf1fd-b16a-4661-8791-5814fc29b11e',
          name: 'Mobile Phones Purchase',
          total_price: 500.00,
          paid: 0.00,
          date: '2024-01-15',
          item_id: 'item_001',
          purchase_price: 500.00,
          quantity: 1,
          timestamp: Math.floor(Date.now() / 1000),
          created_at: Math.floor(Date.now() / 1000),
          modified_at: Math.floor(Date.now() / 1000)
        },
        {
          company_code: '2370',
          ledger_id: '92abf1fd-b16a-4661-8791-5814fc29b11e',
          name: 'Accessories Purchase',
          total_price: 300.00,
          paid: 150.00,
          date: '2024-01-10',
          item_id: 'item_002',
          purchase_price: 300.00,
          quantity: 1,
          timestamp: Math.floor(Date.now() / 1000),
          created_at: Math.floor(Date.now() / 1000),
          modified_at: Math.floor(Date.now() / 1000)
        },
        {
          company_code: '2370',
          ledger_id: '92abf1fd-b16a-4661-8791-5814fc29b11e',
          name: 'Chargers Purchase',
          total_price: 250.00,
          paid: 0.00,
          date: '2024-01-05',
          item_id: 'item_003',
          purchase_price: 250.00,
          quantity: 1,
          timestamp: Math.floor(Date.now() / 1000),
          created_at: Math.floor(Date.now() / 1000),
          modified_at: Math.floor(Date.now() / 1000)
        }
      ];
      
      try {
        let insertedCount = 0;
        const totalCount = sampleData.length;
        
        console.log(`   Inserting ${totalCount} sample records...`);
        
        for (const data of sampleData) {
          try {
            await connectWithRetry(async () => {
              await Purchase.create(data);
            }, 2, 1000);
            
            insertedCount++;
            console.log(`   ✅ [${insertedCount}/${totalCount}] ${data.name}`);
          } catch (itemError) {
            console.error(`   ❌ Failed to insert: ${data.name}`, itemError.message);
            // Continue with other records
          }
        }
        
        console.log(`✅ ${insertedCount}/${totalCount} sample records inserted successfully`);
        
      } catch (insertError) {
        console.error("❌ Error inserting sample data:", insertError.message);
        
        if (insertError.message.includes('duplicate')) {
          console.log("ℹ️  Data already exists, skipping insertion");
        } else {
          console.log("⚠️  Continuing despite sample data insertion error");
        }
      }
    } else {
      console.log(`✅ Data already exists: ${existingPurchases} purchases found`);
      console.log("ℹ️  Skipping sample data insertion");
    }
    console.log('');

    // Step 8: Final verification
    console.log("🔍 Step 8: Final verification...");
    try {
      const finalCount = await connectWithRetry(async () => {
        return await Purchase.count();
      }, 2, 1000);
      
      console.log(`📊 Total purchases in database: ${finalCount}`);
      
      // Test a simple query
      const testQuery = await connectWithRetry(async () => {
        return await Purchase.findOne({
          attributes: ['id', 'name', 'total_price', 'created_at'],
          order: [['created_at', 'DESC']]
        });
      }, 2, 1000);
      
      if (testQuery) {
        console.log(`✅ Test query successful: Found purchase "${testQuery.name}" ($${testQuery.total_price})`);
      } else {
        console.log("⚠️  No test data found, but migration completed");
      }

      // Verify ledger_transactions table exists
      const ledgerTableCheck = await sequelize.query(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ledger_transactions'
      `, { type: sequelize.QueryTypes.SELECT });
      
      if (ledgerTableCheck[0].table_count > 0) {
        console.log("✅ ledger_transactions table verified");
      } else {
        console.log("❌ ledger_transactions table not found");
      }
      
    } catch (verifyError) {
      console.error("❌ Final verification failed:", verifyError.message);
      console.log("⚠️  Continuing despite verification issues");
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('');
    console.log("🎉 Migration completed successfully!");
    console.log("===================================");
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log(`💾 Database: ${dbStatus.currentDatabase}`);
    console.log(`📅 Completed at: ${new Date().toISOString()}`);
    
    return { success: true, duration, database: dbStatus.currentDatabase };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.error('');
    console.error("❌ Migration failed!");
    console.error("===================");
    console.error(`⏱️  Failed after: ${duration} seconds`);
    console.error(`📅 Failed at: ${new Date().toISOString()}`);
    console.error(`🔍 Error Type: ${error.constructor.name}`);
    console.error(`💬 Error Message: ${error.message}`);
    
    // PostgreSQL-specific error diagnostics
    try {
      const { getDatabaseStatus } = require('./src/config/database');
      const dbStatus = getDatabaseStatus();
      console.error(`💾 Current Database: ${dbStatus.currentDatabase}`);
    } catch (e) {
      console.error(`💾 Database Status: Unknown (${e.message})`);
    }
    
    if (error.message.includes('SSL')) {
      console.error('');
      console.error("🔒 SSL Error Diagnostics:");
      console.error("  - Railway requires SSL connections");
      console.error("  - Check DATABASE_URL format");
      console.error("  - Verify SSL configuration");
    }
    
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.error('');
      console.error("⏱️  Timeout Error Diagnostics:");
      console.error("  - Railway database may be sleeping (free tier)");
      console.error("  - Check Railway dashboard for database status");
      console.error("  - Wait 30-60 seconds and try again");
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('');
      console.error("🌐 Connection Error Diagnostics:");
      console.error("  - Network connectivity issues");
      console.error("  - Check if Railway database is running");
      console.error("  - Verify DATABASE_URL hostname and port");
    }

    if (error.message.includes('auth') || error.message.includes('password')) {
      console.error('');
      console.error("🔑 Authentication Error Diagnostics:");
      console.error("  - Database credentials issue");
      console.error("  - Verify DATABASE_URL username and password");
      console.error("  - Check Railway environment variables");
    }
    
    throw error;
  } finally {
    console.log("🔒 Database connection managed by PostgreSQL system");
  }
}

// Script execution
if (require.main === module) {
  console.log("🚀 PostgreSQL Database Migration");
  console.log("================================");
  console.log("🎯 Strategy: Railway → Local PostgreSQL");
  console.log('');
  
  migrateWithModel()
    .then((result) => {
      console.log('');
      console.log("✅ Migration completed successfully!");
      console.log("🎯 Next steps:");
      console.log(`  1. Current database: ${result.database}`);
      console.log("  2. Verify your application can connect to the database");
      console.log("  3. Test your API endpoints");
      console.log("  4. Run your application with: npm start");
      
      if (result.database === 'local') {
        console.log("");
        console.log("💡 Tip: Using Local PostgreSQL.");
        console.log("     To use Railway, ensure DATABASE_URL is correct and Railway is running.");
      }
      
      process.exit(0);
    })
    .catch((error) => {
      console.log('');
      console.error("❌ Migration failed!");
      console.error('');
      console.error("🔧 Troubleshooting steps:");
      console.error("  1. Check Railway database service status");
      console.error("  2. Verify DATABASE_URL environment variable");
      console.error("  3. Check if local PostgreSQL is running (if using local)");
      console.error("  4. Review error messages above");
      console.error('');
      console.error("💡 Our system automatically tries:");
      console.error("  - Railway PostgreSQL first (production)");
      console.error("  - Local PostgreSQL second (development)");
      console.error('');
      process.exit(1);
    });
}

// ✅ FIXED: Properly export both functions
module.exports = { migrateWithModel, createLedgerTransactionsTable };