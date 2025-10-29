#!/usr/bin/env node

/**
 * Database Connection Test Script for Heroku
 * 
 * This script tests the database connection configuration
 * and provides detailed debugging information.
 * 
 * Usage: node test-db-connection.js
 */

require('dotenv').config();
const { testConnection, getConnectionHealth, validateConnectionParams, connectWithRetry } = require('./src/config/database');

async function runDatabaseTests() {
  console.log('🧪 Starting Heroku Database Connection Tests...\n');
  
  // Test 1: Environment Variables
  console.log('📋 Test 1: Environment Variables');
  console.log('================================');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`DEBUG_DB: ${process.env.DEBUG_DB || 'false'}`);
  console.log(`DB_POOL_MAX: ${process.env.DB_POOL_MAX || '5 (default)'}`);
  console.log(`DB_POOL_MIN: ${process.env.DB_POOL_MIN || '0 (default)'}`);
  
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
      
      // Check if it looks like Heroku format
      if (url.hostname.includes('compute-1.amazonaws.com') || url.hostname.includes('amazonaws.com') || url.hostname.includes('ec2')) {
        console.log(`  ☁️  Heroku/Amazon RDS format detected ✅`);
      } else {
        console.log(`  ⚠️  Non-Heroku format detected`);
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
  
  // Test 3: Connection Test with Heroku Retry Logic
  console.log('🔌 Test 3: Database Connection with Heroku Retry Logic');
  console.log('======================================================');
  try {
    await connectWithRetry(async () => {
      await testConnection();
    }, 5, 3000); // 5 retries with 3s base delay for Heroku
    console.log('✅ Connection test passed with retry logic');
    
    // Additional Heroku-specific connection test
    const { sequelize } = require('./src/config/database');
    
    // Test SSL status with retry
    try {
      const [sslResults] = await connectWithRetry(async () => {
        return await sequelize.query('SELECT ssl_is_used() as ssl_enabled');
      }, 3, 2000);
      console.log(`🔒 SSL enabled: ${sslResults[0].ssl_enabled ? 'Yes ✅' : 'No ❌'}`);
    } catch (sslError) {
      console.log(`🔒 SSL test failed after retries: ${sslError.message}`);
    }
    
    // Test response time with retry
    const perfStart = Date.now();
    await connectWithRetry(async () => {
      await sequelize.query('SELECT 1 as test');
    }, 3, 1000);
    const perfEnd = Date.now();
    const responseTime = perfEnd - perfStart;
    console.log(`⚡ Response time: ${responseTime}ms ${responseTime < 100 ? '✅' : responseTime < 500 ? '⚠️' : '❌'}`);
    
    // Test Heroku-specific network diagnostics
    console.log('🌐 Heroku Network Diagnostics:');
    try {
      const [networkResults] = await connectWithRetry(async () => {
        return await sequelize.query(`
          SELECT 
            inet_server_addr() as server_ip,
            inet_server_port() as server_port,
            current_database() as database_name,
            current_user as current_user,
            version() as postgres_version
        `);
      }, 3, 1000);
      
      const network = networkResults[0];
      console.log(`   Server IP: ${network.server_ip || 'N/A'}`);
      console.log(`   Server Port: ${network.server_port || 'N/A'}`);
      console.log(`   Database: ${network.database_name}`);
      console.log(`   User: ${network.current_user}`);
      console.log(`   PostgreSQL: ${network.postgres_version.split(' ')[0]} ${network.postgres_version.split(' ')[1]}`);
    } catch (networkError) {
      console.log(`   Network diagnostics failed: ${networkError.message}`);
    }
    
    console.log('');
  } catch (error) {
    console.error('❌ Connection test failed after retries:', error.message);
    console.error(`   Error Type: ${error.constructor.name}`);
    console.error(`   Error Code: ${error.code || 'N/A'}`);
    
    // Enhanced Heroku-specific error diagnostics
    if (error.message.includes('SSL')) {
      console.error('   🔒 SSL Error - Check Heroku SSL configuration');
      console.error('      Heroku requires SSL for PostgreSQL connections');
    }
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.error('   ⏱️  Timeout Error - Heroku database may be busy');
      console.error('      Wait 30-60 seconds and try again');
    }
    if (error.message.includes('ENOTFOUND')) {
      console.error('   🌐 DNS Error - Check Heroku DATABASE_URL hostname');
      console.error('      Verify DATABASE_URL format: postgres://user:pass@host:port/db');
    }
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   🚫 Connection Refused - Heroku database service may be down');
      console.error('      Check Heroku dashboard for service status');
    }
    console.log('');
  }
  
  // Test 4: Health Check with Heroku Retry Logic
  console.log('💚 Test 4: Health Check with Heroku Retry Logic');
  console.log('===============================================');
  try {
    const health = await connectWithRetry(async () => {
      return await getConnectionHealth();
    }, 3, 2000); // 3 retries with 2s base delay
    
    console.log('Health Status:', health.status);
    if (health.pool) {
      console.log('Pool Status:', health.pool);
      console.log(`   Active connections: ${health.pool.size}/${health.pool.max}`);
      console.log(`   Available connections: ${health.pool.available}`);
    }
    if (health.error) {
      console.log('Error:', health.error);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Health check failed after retries:', error.message);
    console.log('');
  }
  
  console.log('🎉 Database connection tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('1. If all tests passed, your Heroku database is properly configured ✅');
  console.log('2. If tests failed, check the Heroku dashboard for database status');
  console.log('3. Verify your DATABASE_URL is correctly set in Heroku config vars');
  console.log('4. Check Heroku logs for any connection errors');
  console.log('5. Run migration: npm run migrate');
  console.log('6. Test your application endpoints');
  
  console.log('\n🔧 Heroku Troubleshooting Checklist:');
  console.log('====================================');
  console.log('✅ Check Heroku dashboard for database addon status');
  console.log('✅ Verify DATABASE_URL is correctly set in Heroku config vars');
  console.log('✅ Ensure Heroku Postgres addon is provisioned');
  console.log('✅ Check Heroku logs for detailed error information');
  console.log('✅ Verify SSL configuration is properly set');
  console.log('✅ Monitor connection usage in Heroku dashboard');
  console.log('✅ Check Heroku Postgres plan limits');
  
  console.log('\n🚀 Heroku-Specific Solutions:');
  console.log('=============================');
  console.log('1. SSL Certificate Handling:');
  console.log('   - SSL required for Heroku PostgreSQL');
  console.log('   - rejectUnauthorized: false to handle cert issues');
  console.log('   - Heroku manages SSL certificates automatically');
  console.log('');
  console.log('2. Connection Pool Optimization:');
  console.log('   - Standard max connections: 20 (Essential 0 plan)');
  console.log('   - Increased acquire timeout to 30s');
  console.log('   - Enhanced connection validation');
  console.log('');
  console.log('3. Retry Strategy:');
  console.log('   - 5 retry attempts with exponential backoff');
  console.log('   - 3s base delay, doubling each retry');
  console.log('   - Handles ETIMEDOUT, ECONNRESET, SSL errors');
  console.log('');
  console.log('4. Heroku Postgres Plans:');
  console.log('   - Essential 0: 20 connections, $5/month');
  console.log('   - Essential 1: 120 connections, $25/month');
  console.log('   - Standard 0: 400 connections, $50/month');
  
  console.log('\n📞 If issues persist:');
  console.log('===================');
  console.log('- Check Heroku status page for service outages');
  console.log('- Review Heroku Postgres documentation');
  console.log('- Consider upgrading Heroku Postgres plan if hitting limits');
  console.log('- Contact Heroku support for persistent issues');
  
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