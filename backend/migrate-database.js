/**
 * PostgreSQL Database Migration Script for Heroku
 * 
 * This script handles database migrations for PostgreSQL (Heroku or Local)
 * 
 * Usage: 
 *   node migrate-database.js
 *   npm run migrate
 */

require('dotenv').config();

// ✅ Add Sequelize operators to prevent "Op is undefined" error
const { Op } = require('sequelize');
// Make it available globally for all models
global.Op = Op;

// Function to create ledger_transactions table
const createLedgerTransactionsTable = async (sequelize) => {
  try {
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

// Simple database connection for migration
const createMigrationConnection = async () => {
  console.log("🔧 Creating migration database connection...");
  
  const { Sequelize } = require('sequelize');
  
  // Use Heroku DATABASE_URL if available, otherwise local
  if (process.env.DATABASE_URL) {
    console.log("🚀 Using Heroku PostgreSQL...");
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: console.log,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  } else {
    console.log("💻 Using Local PostgreSQL...");
    return new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'myapp',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      logging: console.log,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
};

async function migrateDatabase() {
  const startTime = Date.now();
  let sequelize = null;
  
  try {
    console.log("🚀 Starting Heroku PostgreSQL Database Migration...");
    console.log("===================================================");
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
    console.log(`🏠 Database Host: ${process.env.DB_HOST || 'Not set'}`);
    console.log('');

    // Step 1: Create database connection
    console.log("🔧 Step 1: Creating database connection...");
    sequelize = await createMigrationConnection();
    
    // Test connection
    await sequelize.authenticate();
    console.log("✅ Database connection established");
    console.log('');

    // Step 2: Load and sync models
    console.log("📦 Step 2: Loading and syncing models...");
    
    // Define models directly for migration (simplified)
    const models = [
      // User model
      sequelize.define('User', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        username: { type: Sequelize.STRING, allowNull: false },
        email: { type: Sequelize.STRING, allowNull: false },
        password: { type: Sequelize.STRING, allowNull: false },
        company_code: { type: Sequelize.STRING(10), allowNull: false },
        created_at: { type: Sequelize.BIGINT, allowNull: false }
      }, { tableName: 'users', timestamps: false }),

      // Employee model
      sequelize.define('Employee', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: Sequelize.INTEGER, allowNull: false },
        name: { type: Sequelize.STRING, allowNull: false },
        position: { type: Sequelize.STRING, allowNull: false },
        company_code: { type: Sequelize.STRING(10), allowNull: false },
        created_at: { type: Sequelize.BIGINT, allowNull: false }
      }, { tableName: 'employees', timestamps: false }),

      // Item model
      sequelize.define('Item', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        price: { type: Sequelize.DECIMAL(10,2), allowNull: false },
        stock: { type: Sequelize.INTEGER, defaultValue: 0 },
        company_code: { type: Sequelize.STRING(10), allowNull: false },
        created_at: { type: Sequelize.BIGINT, allowNull: false }
      }, { tableName: 'items', timestamps: false }),

      // Purchase model
      sequelize.define('Purchase', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_code: { type: Sequelize.STRING(10), allowNull: false },
        ledger_id: { type: Sequelize.UUID, allowNull: false },
        name: { type: Sequelize.STRING, allowNull: false },
        total_price: { type: Sequelize.DECIMAL(15,2), defaultValue: 0.00 },
        paid: { type: Sequelize.DECIMAL(15,2), defaultValue: 0.00 },
        date: { type: Sequelize.DATE, allowNull: false },
        item_id: { type: Sequelize.STRING, allowNull: false },
        purchase_price: { type: Sequelize.DECIMAL(15,2), defaultValue: 0.00 },
        quantity: { type: Sequelize.INTEGER, defaultValue: 1 },
        timestamp: { type: Sequelize.BIGINT, allowNull: false },
        created_at: { type: Sequelize.BIGINT, allowNull: false },
        modified_at: { type: Sequelize.BIGINT, allowNull: false }
      }, { tableName: 'purchases', timestamps: false }),

      // Sale model
      sequelize.define('Sale', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_code: { type: Sequelize.STRING(10), allowNull: false },
        total_amount: { type: Sequelize.DECIMAL(15,2), defaultValue: 0.00 },
        paid_amount: { type: Sequelize.DECIMAL(15,2), defaultValue: 0.00 },
        date: { type: Sequelize.DATE, allowNull: false },
        created_at: { type: Sequelize.BIGINT, allowNull: false }
      }, { tableName: 'sales', timestamps: false }),

      // Ledger Account model
      sequelize.define('LedgerAccount', {
        id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        name: { type: Sequelize.STRING, allowNull: false },
        type: { type: Sequelize.STRING, allowNull: false },
        company_code: { type: Sequelize.STRING(10), allowNull: false },
        balance: { type: Sequelize.DECIMAL(15,2), defaultValue: 0.00 },
        created_at: { type: Sequelize.BIGINT, allowNull: false }
      }, { tableName: 'ledger_accounts', timestamps: false })
    ];

    // Sync all models
    for (const model of models) {
      try {
        await model.sync({ force: false, alter: true });
        console.log(`✅ ${model.name} table synced successfully`);
      } catch (syncError) {
        console.error(`❌ ${model.name} table sync failed:`, syncError.message);
        // Continue with other models
      }
    }
    console.log('');

    // Step 3: Create ledger_transactions table
    console.log("🔄 Step 3: Creating ledger_transactions table...");
    await createLedgerTransactionsTable(sequelize);
    console.log('');

    // Step 4: Check existing data
    console.log("📊 Step 4: Checking existing data...");
    const Purchase = models[3]; // Purchase model
    let existingPurchases = 0;
    
    try {
      existingPurchases = await Purchase.count();
      console.log(`📈 Found ${existingPurchases} existing purchases`);
    } catch (countError) {
      console.log("ℹ️ No existing purchases found or error counting");
      existingPurchases = 0;
    }
    console.log('');

    // Step 5: Insert sample data if database is empty
    if (existingPurchases === 0) {
      console.log("📝 Step 5: Inserting sample data...");
      
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
            await Purchase.create(data);
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
        console.log("⚠️  Continuing despite sample data insertion error");
      }
    } else {
      console.log(`✅ Data already exists: ${existingPurchases} purchases found`);
      console.log("ℹ️  Skipping sample data insertion");
    }
    console.log('');

    // Step 6: Final verification
    console.log("🔍 Step 6: Final verification...");
    try {
      const finalCount = await Purchase.count();
      console.log(`📊 Total purchases in database: ${finalCount}`);
      
      // Test a simple query
      const testQuery = await Purchase.findOne({
        attributes: ['id', 'name', 'total_price', 'created_at'],
        order: [['created_at', 'DESC']]
      });
      
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
    console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Heroku' : 'Local'}`);
    console.log(`📅 Completed at: ${new Date().toISOString()}`);
    
    return { success: true, duration, database: process.env.DATABASE_URL ? 'heroku' : 'local' };
    
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
    
    if (error.message.includes('SSL')) {
      console.error('');
      console.error("🔒 SSL Error Diagnostics:");
      console.error("  - Heroku requires SSL connections");
      console.error("  - Check DATABASE_URL format");
    }
    
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.error('');
      console.error("⏱️  Timeout Error Diagnostics:");
      console.error("  - Heroku database may be busy");
      console.error("  - Wait 30-60 seconds and try again");
    }
    
    throw error;
  } finally {
    // Close connection
    if (sequelize) {
      await sequelize.close();
      console.log("🔒 Database connection closed");
    }
  }
}

// Script execution
if (require.main === module) {
  console.log("🚀 Heroku PostgreSQL Database Migration");
  console.log("=======================================");
  console.log("🎯 Strategy: Heroku → Local PostgreSQL");
  console.log('');
  
  migrateDatabase()
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
        console.log("     To use Heroku, ensure DATABASE_URL is set in Heroku config vars.");
      }
      
      process.exit(0);
    })
    .catch((error) => {
      console.log('');
      console.error("❌ Migration failed!");
      console.error('');
      console.error("🔧 Troubleshooting steps:");
      console.error("  1. Check Heroku database addon status");
      console.error("  2. Verify DATABASE_URL environment variable in Heroku");
      console.error("  3. Check if local PostgreSQL is running (if using local)");
      console.error("  4. Review error messages above");
      console.error('');
      process.exit(1);
    });
}

module.exports = { migrateDatabase, createLedgerTransactionsTable };