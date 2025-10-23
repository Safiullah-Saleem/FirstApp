// migrate-with-model.js
const Purchase = require('./src/billing/purchase.model'); // Adjust path as needed
const { sequelize } = require('./src/config/database');

async function migrateWithModel() {
  try {
    console.log("🔄 Starting migration using Purchase model...");
    
    // Test connection
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Sync the Purchase model to create the table
    await Purchase.sync({ force: false }); // force: false prevents dropping existing table
    console.log("✅ Purchase table synced successfully");

    // Check if sample data exists
    const existingPurchases = await Purchase.count({
      where: { 
        ledger_id: '92abf1fd-b16a-4661-8791-5814fc29b11e' 
      }
    });

    if (existingPurchases === 0) {
      console.log("📝 Inserting sample purchase data...");
      
      // Create sample purchases using the model
      await Purchase.bulkCreate([
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
      ]);
      
      console.log("✅ Sample purchase data inserted using model");
    } else {
      console.log(`✅ Sample data already exists: ${existingPurchases} purchases found`);
    }

    console.log("🎉 Migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  migrateWithModel()
    .then(() => {
      console.log("✅ Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = migrateWithModel;
