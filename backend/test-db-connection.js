#!/usr/bin/env node

/**
 * Database Connection Test Script for Railway
 * 
 * This script tests the database connection configuration
 * and provides detailed debugging information.
 * 
 * Usage: node test-db-connection.js
 */

require('dotenv').config();
const { testConnection, getConnectionHealth, validateConnectionParams } = require('./src/config/database');

async function runDatabaseTests() {
  console.log('🧪 Starting Railway Database Connection Tests...\n');
  
  // Test 1: Environment Variables
  console.log('📋 Test 1: Environment Variables');
  console.log('================================');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`DEBUG_DB: ${process.env.DEBUG_DB || 'false'}`);
  console.log(`DB_POOL_MAX: ${process.env.DB_POOL_MAX || '10 (default)'}`);
  console.log(`DB_POOL_MIN: ${process.env.DB_POOL_MIN || '2 (default)'}`);
  console.log('');
  
  // Test 2: Parameter Validation
  console.log('🔍 Test 2: Parameter Validation');
  console.log('================================');
  try {
    validateConnectionParams();
    console.log('✅ Parameter validation passed\n');
  } catch (error) {
    console.error('❌ Parameter validation failed:', error.message);
    console.log('');
  }
  
  // Test 3: Connection Test
  console.log('🔌 Test 3: Database Connection');
  console.log('==============================');
  try {
    await testConnection();
    console.log('✅ Connection test passed\n');
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('');
  }
  
  // Test 4: Health Check
  console.log('💚 Test 4: Health Check');
  console.log('========================');
  try {
    const health = await getConnectionHealth();
    console.log('Health Status:', health.status);
    if (health.pool) {
      console.log('Pool Status:', health.pool);
    }
    if (health.error) {
      console.log('Error:', health.error);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('');
  }
  
  console.log('🎉 Database connection tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('1. If all tests passed, your Railway database is properly configured');
  console.log('2. If tests failed, check the Railway dashboard for database status');
  console.log('3. Verify your DATABASE_URL is correctly set in Railway environment variables');
  console.log('4. Check Railway logs for any connection errors');
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the tests
runDatabaseTests().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
