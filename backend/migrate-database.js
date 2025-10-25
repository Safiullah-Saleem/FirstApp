/**
 * Railway-Optimized Database Migration Script
 * 
 * This script handles database migrations with comprehensive error handling,
 * Railway-specific optimizations, and detailed logging for debugging.
 * 
 * Usage: 
 *   node migrate-database.js
 *   npm run migrate
 */

require('dotenv').config();
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
const { sequelize, testConnection, getConnectionHealth, connectWithRetry } = require('./src/config/database');

// Enhanced migration function with Railway-specific error handling
async function migrateWithModel() {
  const startTime = Date.now();
  const initialMemory = process.memoryUsage();
  
  try {
    console.log("🚀 Starting Railway Database Migration...");
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
    console.log(`🏠 Database Host: ${process.env.DB_HOST || 'Not set'}`);
    console.log('');

    // Step 1: Test database connection with comprehensive checks and retry logic
    console.log("🔍 Step 1: Testing database connection with Railway retry logic...");
    await connectWithRetry(async () => {
      await sequelize.authenticate();
      console.log("✅ PostgreSQL connection established successfully.");
    }, 10, 3000); // 10 retries with 3s base delay for Railway free tier
    console.log("✅ Database connection verified");
    console.log('');

    // Step 2: Check connection health with retry logic
    console.log("💚 Step 2: Checking connection health with retry logic...");
    const health = await connectWithRetry(async () => {
      const healthCheck = await getConnectionHealth();
      if (healthCheck.status !== 'healthy') {
        throw new Error(`Database health check failed: ${healthCheck.error}`);
      }
      return healthCheck;
    }, 5, 2000); // 5 retries with 2s base delay
    
    console.log("✅ Database health check passed");
    console.log(`📊 Pool status: ${health.pool.size}/${health.pool.max} connections`);
    console.log('');

    // Step 3: Sync all models with enhanced error handling and retry logic
    console.log("🔄 Step 3: Syncing all models with Railway retry logic...");
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

    // Sync all models in a single retry operation to avoid connection conflicts
    await connectWithRetry(async () => {
      for (const model of models) {
        try {
          await model.sync({
            force: false, // Never force in production
            alter: true // Allow alter to fix schema issues
          });
          console.log(`✅ ${model.name} table synced successfully`);
        } catch (syncError) {
          console.error(`❌ ${model.name} table sync failed:`, syncError.message);

          // Railway-specific error handling
          if (syncError.message.includes('SSL')) {
            throw new Error("SSL connection error - check Railway SSL configuration");
          }
          if (syncError.message.includes('timeout') || syncError.message.includes('ETIMEDOUT')) {
            throw new Error("Connection timeout - Railway database may be sleeping (free tier)");
          }
          if (syncError.message.includes('permission')) {
            throw new Error("Permission denied - check database user permissions");
          }

          throw syncError;
        }
      }
    }, 5, 2000); // 5 retries with 2s base delay for all models
    console.log('');

    // Step 4: Check existing data and insert sample data if needed
    console.log("📊 Step 4: Checking existing data...");
    let existingPurchases = 0;
    
    try {
      existingPurchases = await connectWithRetry(async () => {
        return await Purchase.count({
          where: { 
            ledger_id: '92abf1fd-b16a-4661-8791-5814fc29b11e' 
          }
        });
      }, 5, 2000); // 5 retries with 2s base delay
      console.log(`📈 Found ${existingPurchases} existing purchases for ledger`);
    } catch (countError) {
      console.error("❌ Error counting existing purchases after retries:", countError.message);
      throw new Error(`Failed to count existing data: ${countError.message}`);
    }
    console.log('');

    if (existingPurchases === 0) {
      console.log("📝 Step 5: Inserting sample purchase data...");
      
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
        // Insert all sample data in a single retry operation to avoid connection conflicts
        let insertedCount = 0;
        const totalCount = sampleData.length;
        
        console.log(`   Inserting ${totalCount} sample records...`);
        
        await connectWithRetry(async () => {
          for (const data of sampleData) {
            try {
              await Purchase.create(data);
              insertedCount++;
              console.log(`   ✅ [${insertedCount}/${totalCount}] ${data.name}`);
            } catch (itemError) {
              console.error(`   ❌ Failed to insert: ${data.name}`, itemError.message);
              // Continue with other records even if one fails
            }
          }
        }, 3, 1000); // 3 retries with 1s base delay for all records
        
        console.log(`✅ ${insertedCount}/${totalCount} sample records inserted successfully`);
        
      } catch (insertError) {
        console.error("❌ Error inserting sample data:", insertError.message);
        
        // Railway-specific error handling for data insertion
        if (insertError.message.includes('duplicate')) {
          console.log("ℹ️  Data already exists, skipping insertion");
        } else if (insertError.message.includes('constraint')) {
          throw new Error("Database constraint violation - check data format");
        } else if (insertError.message.includes('timeout') || insertError.message.includes('ETIMEDOUT')) {
          throw new Error("Insert operation timed out - Railway database may be sleeping (free tier)");
        } else {
          throw insertError;
        }
      }
    } else {
      console.log(`✅ Sample data already exists: ${existingPurchases} purchases found`);
      console.log("ℹ️  Skipping sample data insertion");
    }
    console.log('');

    // Step 6: Final verification with retry logic
    console.log("🔍 Step 6: Final verification with Railway retry logic...");
    try {
      // Perform all verification queries in a single retry operation
      const verificationResults = await connectWithRetry(async () => {
        const finalCount = await Purchase.count();
        console.log(`📊 Total purchases in database: ${finalCount}`);
        
        // Test a simple query to ensure everything works
        const testQuery = await Purchase.findOne({
          where: { company_code: '2370' },
          attributes: ['id', 'name', 'total_price', 'created_at'],
          order: [['created_at', 'DESC']]
        });
        
        if (testQuery) {
          console.log(`✅ Test query successful: Found purchase "${testQuery.name}" ($${testQuery.total_price})`);
        } else {
          console.log("⚠️  No test data found, but migration completed");
        }

        // Verify sample data structure
        const sampleCheck = await Purchase.findOne({
          where: { ledger_id: '92abf1fd-b16a-4661-8791-5814fc29b11e' },
          attributes: ['id', 'name', 'total_price', 'paid', 'date']
        });
        
        if (sampleCheck) {
          console.log(`✅ Sample data verified: "${sampleCheck.name}" from ${sampleCheck.date}`);
        }
        
        return { finalCount, testQuery, sampleCheck };
      }, 5, 2000); // 5 retries with 2s base delay
      
    } catch (verifyError) {
      console.error("❌ Final verification failed after retries:", verifyError.message);
      throw new Error(`Migration verification failed: ${verifyError.message}`);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const finalMemory = process.memoryUsage();
    const memoryUsed = ((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2);
    
    console.log('');
    console.log("🎉 Migration completed successfully!");
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log(`🧠 Memory used: ${memoryUsed} MB`);
    console.log(`📅 Completed at: ${new Date().toISOString()}`);
    
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.error('');
    console.error("❌ Migration failed!");
    console.error(`⏱️  Failed after: ${duration} seconds`);
    console.error(`📅 Failed at: ${new Date().toISOString()}`);
    console.error(`🔍 Error Type: ${error.constructor.name}`);
    console.error(`💬 Error Message: ${error.message}`);
    
    // Railway-specific error diagnostics
    if (error.message.includes('SSL')) {
      console.error('');
      console.error("🔒 SSL Error Diagnostics:");
      console.error("  - Check Railway DATABASE_URL format");
      console.error("  - Verify SSL configuration in database.js");
      console.error("  - Ensure Railway PostgreSQL is running");
      console.error("  - Try adding ?ssl=require to DATABASE_URL");
    }
    
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.error('');
      console.error("⏱️  Timeout Error Diagnostics:");
      console.error("  - Railway database may be sleeping (free tier limitation)");
      console.error("  - Wait 30-60 seconds and try again");
      console.error("  - Check Railway dashboard for database service status");
      console.error("  - Verify connection pool settings");
      console.error("  - Consider upgrading Railway plan if hitting limits");
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('');
      console.error("🌐 Connection Error Diagnostics:");
      console.error("  - Verify Railway DATABASE_URL hostname");
      console.error("  - Check Railway database service status");
      console.error("  - Ensure database is not sleeping");
      console.error("  - Check network connectivity to Railway");
    }

    if (error.message.includes('auth') || error.message.includes('password')) {
      console.error('');
      console.error("🔑 Authentication Error Diagnostics:");
      console.error("  - Verify DATABASE_URL credentials");
      console.error("  - Check Railway environment variables");
      console.error("  - Ensure database user has proper permissions");
    }
    
    throw error;
  } finally {
    // Always close the database connection
    try {
      await sequelize.close();
      console.log("🔒 Database connection closed gracefully");
    } catch (closeError) {
      console.log("⚠️  Error closing connection:", closeError.message);
    }
  }
}

// Enhanced script execution with Railway-specific error handling
if (require.main === module) {
  console.log("🚀 Railway Database Migration Script");
  console.log("=====================================");
  console.log('');
  
  migrateWithModel()
    .then(() => {
      console.log('');
      console.log("✅ Migration script completed successfully!");
      console.log("🎯 Next steps:");
      console.log("  1. Verify your application can connect to the database");
      console.log("  2. Test your API endpoints");
      console.log("  3. Check Railway logs for any issues");
      console.log("  4. Monitor database performance in Railway dashboard");
      console.log("  5. Run your application with: npm start");
      process.exit(0);
    })
    .catch((error) => {
      console.log('');
      console.error("❌ Migration script failed!");
      console.error('');
      console.error("🔧 Troubleshooting steps:");
      console.error("  1. Check Railway database service status");
      console.error("  2. Verify DATABASE_URL environment variable");
      console.error("  3. Check Railway logs for detailed error information");
      console.error("  4. Ensure database is not sleeping (Railway free tier)");
      console.error("  5. Verify SSL configuration");
      console.error("  6. Check database user permissions");
      console.error('');
      console.error("📞 For Railway-specific issues:");
      console.error("  - Check Railway dashboard for service status");
      console.error("  - Review Railway logs in the dashboard");
      console.error("  - Verify environment variables are set correctly");
      console.error("  - Restart Railway services if needed");
      console.error('');
      process.exit(1);
    });
}

module.exports = migrateWithModel;
