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
  console.log(`DB_POOL_MAX: ${process.env.DB_POOL_MAX || '3 (Railway optimized)'}`);
  console.log(`DB_POOL_MIN: ${process.env.DB_POOL_MIN || '0 (Railway optimized)'}`);
  
  // Analyze DATABASE_URL if present
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      console.log(`DATABASE_URL Analysis:`);
      console.log(`  Protocol: ${url.protocol}`);
      console.log(`  Hostname: ${url.hostname}`);
      console.log(`  Port: ${url.port}`);
      console.log(`  Database: ${url.pathname.slice(1)}`);
      console.log(`  Username: ${url.username}`);
      console.log(`  Password: ${url.password ? '✅ Present' : '❌ Missing'}`);
      
      // Check if it looks like Railway format
      if (url.hostname.includes('proxy.rlwy.net') || url.hostname.includes('railway') || url.hostname.includes('centerbeam')) {
        console.log(`  🚀 Railway format detected ✅`);
      } else {
        console.log(`  ⚠️  Non-Railway format detected`);
      }
    } catch (error) {
      console.log(`  ❌ Invalid DATABASE_URL format: ${error.message}`);
    }
  }
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
    console.log('✅ Connection test passed');
    
    // Additional Railway-specific connection test
    const { sequelize } = require('./src/config/database');
    
    // Test SSL status
    try {
      const [sslResults] = await sequelize.query('SELECT ssl_is_used() as ssl_enabled');
      console.log(`🔒 SSL enabled: ${sslResults[0].ssl_enabled ? 'Yes ✅' : 'No ❌'}`);
    } catch (sslError) {
      console.log(`🔒 SSL test failed: ${sslError.message}`);
    }
    
    // Test response time
    const perfStart = Date.now();
    await sequelize.query('SELECT 1 as test');
    const perfEnd = Date.now();
    const responseTime = perfEnd - perfStart;
    console.log(`⚡ Response time: ${responseTime}ms ${responseTime < 100 ? '✅' : responseTime < 500 ? '⚠️' : '❌'}`);
    
    console.log('');
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error(`   Error Type: ${error.constructor.name}`);
    console.error(`   Error Code: ${error.code || 'N/A'}`);
    
    // Railway-specific error diagnostics
    if (error.message.includes('SSL')) {
      console.error('   🔒 SSL Error - Check Railway SSL configuration');
    }
    if (error.message.includes('timeout')) {
      console.error('   ⏱️  Timeout Error - Check Railway database status');
    }
    if (error.message.includes('ENOTFOUND')) {
      console.error('   🌐 DNS Error - Check Railway DATABASE_URL hostname');
    }
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   🚫 Connection Refused - Check Railway database service');
    }
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
  console.log('1. If all tests passed, your Railway database is properly configured ✅');
  console.log('2. If tests failed, check the Railway dashboard for database status');
  console.log('3. Verify your DATABASE_URL is correctly set in Railway environment variables');
  console.log('4. Check Railway logs for any connection errors');
  console.log('5. Run migration: npm run migrate');
  console.log('6. Test your application endpoints');
  
  console.log('\n🔧 Railway Troubleshooting Checklist:');
  console.log('=====================================');
  console.log('✅ Check Railway dashboard for database service status');
  console.log('✅ Verify DATABASE_URL is correctly set in Railway environment');
  console.log('✅ Ensure database is not sleeping (Railway free tier limitation)');
  console.log('✅ Check Railway logs for detailed error information');
  console.log('✅ Verify SSL configuration is properly set');
  console.log('✅ Monitor connection pool usage in Railway dashboard');
  console.log('✅ Check Railway service limits and quotas');
  
  console.log('\n📞 If issues persist:');
  console.log('===================');
  console.log('- Check Railway status page for service outages');
  console.log('- Review Railway documentation for PostgreSQL setup');
  console.log('- Consider upgrading Railway plan if hitting limits');
  console.log('- Contact Railway support for persistent issues');
  
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
