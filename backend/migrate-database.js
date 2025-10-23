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
const { sequelize, testConnection, getConnectionHealth } = require('./src/config/database');

// Enhanced migration function with Railway-specific error handling
async function migrateWithModel() {
  const startTime = Date.now();
  
  try {
    console.log("🚀 Starting Railway Database Migration...");
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
    console.log('');
    
    // Step 1: Test database connection with comprehensive checks
    console.log("🔍 Step 1: Testing database connection...");
    await testConnection();
    console.log("✅ Database connection verified");
    console.log('');
    
    // Step 2: Check connection health
    console.log("💚 Step 2: Checking connection health...");
    const health = await getConnectionHealth();
    if (health.status !== 'healthy') {
      throw new Error(`Database health check failed: ${health.error}`);
    }
    console.log("✅ Database health check passed");
    console.log(`📊 Pool status: ${health.pool.size}/${health.pool.max} connections`);
    console.log('');
    
    // Step 3: Sync Purchase model with enhanced error handling
    console.log("🔄 Step 3: Syncing Purchase model...");
    try {
      await Purchase.sync({ 
        force: false, // Never force in production
        alter: process.env.NODE_ENV !== 'production' // Only alter in development
      });
      console.log("✅ Purchase table synced successfully");
    } catch (syncError) {
      console.error("❌ Table sync failed:", syncError.message);
      
      // Railway-specific error handling
      if (syncError.message.includes('SSL')) {
        throw new Error("SSL connection error - check Railway SSL configuration");
      }
      if (syncError.message.includes('timeout')) {
        throw new Error("Connection timeout - check Railway database status");
      }
      if (syncError.message.includes('permission')) {
        throw new Error("Permission denied - check database user permissions");
      }
      
      throw syncError;
    }
    console.log('');

    // Step 4: Check existing data and insert sample data if needed
    console.log("📊 Step 4: Checking existing data...");
    let existingPurchases = 0;
    
    try {
      existingPurchases = await Purchase.count({
        where: { 
          ledger_id: '92abf1fd-b16a-4661-8791-5814fc29b11e' 
        }
      });
      console.log(`📈 Found ${existingPurchases} existing purchases`);
    } catch (countError) {
      console.error("❌ Error counting existing purchases:", countError.message);
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
          quantity: 1
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
          quantity: 1
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
          quantity: 1
        }
      ];
      
      try {
        await Purchase.bulkCreate(sampleData, {
          validate: true, // Validate data before insertion
          individualHooks: false, // Disable hooks for bulk operations
          returning: false // Don't return inserted data for performance
        });
        console.log("✅ Sample purchase data inserted successfully");
      } catch (insertError) {
        console.error("❌ Error inserting sample data:", insertError.message);
        
        // Railway-specific error handling for data insertion
        if (insertError.message.includes('duplicate')) {
          console.log("ℹ️  Data already exists, skipping insertion");
        } else if (insertError.message.includes('constraint')) {
          throw new Error("Database constraint violation - check data format");
        } else if (insertError.message.includes('timeout')) {
          throw new Error("Insert operation timed out - check Railway database performance");
        } else {
          throw insertError;
        }
      }
    } else {
      console.log(`✅ Sample data already exists: ${existingPurchases} purchases found`);
    }
    console.log('');

    // Step 6: Final verification
    console.log("🔍 Step 6: Final verification...");
    try {
      const finalCount = await Purchase.count();
      console.log(`📊 Total purchases in database: ${finalCount}`);
      
      // Test a simple query to ensure everything works
      const testQuery = await Purchase.findOne({
        where: { company_code: '2370' },
        attributes: ['id', 'name', 'total_price']
      });
      
      if (testQuery) {
        console.log(`✅ Test query successful: Found purchase "${testQuery.name}"`);
      } else {
        console.log("⚠️  No test data found, but migration completed");
      }
    } catch (verifyError) {
      console.error("❌ Final verification failed:", verifyError.message);
      throw new Error(`Migration verification failed: ${verifyError.message}`);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('');
    console.log("🎉 Migration completed successfully!");
    console.log(`⏱️  Total time: ${duration} seconds`);
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
    }
    
    if (error.message.includes('timeout')) {
      console.error('');
      console.error("⏱️  Timeout Error Diagnostics:");
      console.error("  - Check Railway database status");
      console.error("  - Verify connection pool settings");
      console.error("  - Check Railway service limits");
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('');
      console.error("🌐 Connection Error Diagnostics:");
      console.error("  - Verify Railway DATABASE_URL hostname");
      console.error("  - Check Railway database service status");
      console.error("  - Ensure database is not sleeping");
    }
    
    throw error;
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
      console.error('');
      console.error("📞 For Railway-specific issues:");
      console.error("  - Check Railway dashboard for service status");
      console.error("  - Review Railway logs in the dashboard");
      console.error("  - Verify environment variables are set correctly");
      console.error('');
      process.exit(1);
    });
}

module.exports = migrateWithModel;
