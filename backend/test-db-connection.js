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
const { testConnection, getConnectionHealth, validateConnectionParams, connectWithRetry } = require('./src/config/database');

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
  
  // Test 3: Connection Test with Railway Retry Logic
  console.log('🔌 Test 3: Database Connection with Railway Retry Logic');
  console.log('=======================================================');
  try {
    await connectWithRetry(async () => {
      await testConnection();
    }, 10, 3000); // 10 retries with 3s base delay for Railway free tier
    console.log('✅ Connection test passed with retry logic');
    
    // Additional Railway-specific connection test
    const { sequelize } = require('./src/config/database');
    
    // Test SSL status with retry
    try {
      const [sslResults] = await connectWithRetry(async () => {
        return await sequelize.query('SELECT ssl_is_used() as ssl_enabled');
      }, 5, 2000);
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
    
    // Test Railway-specific network diagnostics
    console.log('🌐 Railway Network Diagnostics:');
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
    
    // Enhanced Railway-specific error diagnostics
    if (error.message.includes('SSL')) {
      console.error('   🔒 SSL Error - Check Railway SSL configuration');
      console.error('      Try adding ?ssl=require to your DATABASE_URL');
    }
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.error('   ⏱️  Timeout Error - Railway database may be sleeping (free tier)');
      console.error('      Wait 30-60 seconds and try again');
    }
    if (error.message.includes('ENOTFOUND')) {
      console.error('   🌐 DNS Error - Check Railway DATABASE_URL hostname');
      console.error('      Verify DATABASE_URL format: postgresql://user:pass@host:port/db');
    }
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   🚫 Connection Refused - Railway database service may be down');
      console.error('      Check Railway dashboard for service status');
    }
    console.log('');
  }
  
  // Test 4: Health Check with Railway Retry Logic
  console.log('💚 Test 4: Health Check with Railway Retry Logic');
  console.log('================================================');
  try {
    const health = await connectWithRetry(async () => {
      return await getConnectionHealth();
    }, 5, 2000); // 5 retries with 2s base delay
    
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
  
  console.log('\n🚀 Railway-Specific Solutions for ETIMEDOUT:');
  console.log('============================================');
  console.log('1. Free Tier Sleep Issues:');
  console.log('   - Railway free tier databases sleep after inactivity');
  console.log('   - First connection after sleep takes 30-60 seconds');
  console.log('   - Solution: Wait longer or upgrade to paid plan');
  console.log('');
  console.log('2. Network Timeout Solutions:');
  console.log('   - Connection timeouts increased to 60s in config');
  console.log('   - Retry logic with exponential backoff implemented');
  console.log('   - TCP keep-alive enabled for persistent connections');
  console.log('');
  console.log('3. SSL Certificate Handling:');
  console.log('   - SSL required for Railway PostgreSQL');
  console.log('   - rejectUnauthorized: false to handle cert issues');
  console.log('   - Try adding ?ssl=require to DATABASE_URL if issues persist');
  console.log('');
  console.log('4. Connection Pool Optimization:');
  console.log('   - Reduced max connections to 3 (Railway limit)');
  console.log('   - Increased acquire timeout to 120s');
  console.log('   - Enhanced connection validation');
  console.log('');
  console.log('5. Retry Strategy:');
  console.log('   - 10 retry attempts with exponential backoff');
  console.log('   - 2s base delay, doubling each retry');
  console.log('   - Handles ETIMEDOUT, ECONNRESET, SSL errors');
  
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
