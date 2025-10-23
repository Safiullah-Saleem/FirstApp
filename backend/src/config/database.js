const { Sequelize } = require("sequelize");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

let sequelize;

// Enhanced connection parameter validation for Railway
const validateConnectionParams = () => {
  const errors = [];
  
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      
      // Validate Railway DATABASE_URL format: postgresql://user:password@host:port/database
      if (!url.protocol || !url.hostname || !url.port || !url.pathname) {
        errors.push("Invalid DATABASE_URL format - missing required components");
      }
      
      // Check for Railway-specific protocol
      if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
        errors.push(`Invalid protocol: ${url.protocol}. Expected 'postgresql:' or 'postgres:'`);
      }
      
      // Validate port is numeric
      if (isNaN(parseInt(url.port))) {
        errors.push(`Invalid port: ${url.port}. Must be a number`);
      }
      
      // Validate database name exists
      const dbName = url.pathname.slice(1); // Remove leading slash
      if (!dbName) {
        errors.push("Database name is missing from DATABASE_URL");
      }
      
      console.log(`🔍 DATABASE_URL validation: ${url.protocol}//${url.hostname}:${url.port}${url.pathname}`);
      
    } catch (error) {
      errors.push(`DATABASE_URL is not a valid URL: ${error.message}`);
    }
  } else {
    const requiredParams = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT'];
    requiredParams.forEach(param => {
      if (!process.env[param]) {
        errors.push(`Missing required environment variable: ${param}`);
      }
    });
  }
  
  if (errors.length > 0) {
    console.error("❌ Database configuration errors:");
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error("Database configuration validation failed");
  }
  
  console.log("✅ Database connection parameters validated successfully");
};

// Enhanced logging function for Railway debugging
const getLoggingFunction = () => {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_DB === 'true') {
    return (msg) => {
      const timestamp = new Date().toISOString();
      console.log(`🗄️  [DB] [${timestamp}] ${msg}`);
    };
  }
  
  // In production, log only errors and important events
  if (process.env.NODE_ENV === 'production') {
    return (msg) => {
      if (msg.includes('ERROR') || msg.includes('error') || msg.includes('failed')) {
        const timestamp = new Date().toISOString();
        console.error(`🗄️  [DB] [${timestamp}] ${msg}`);
      }
    };
  }
  
  return false;
};

// Enhanced Railway-optimized connection pool configuration
const getPoolConfig = () => {
  const poolConfig = {
    max: parseInt(process.env.DB_POOL_MAX) || 3, // Reduced for Railway stability (Railway has connection limits)
    min: parseInt(process.env.DB_POOL_MIN) || 0, // Start with 0 for Railway efficiency
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 20000, // Reduced to 20s for Railway
    idle: parseInt(process.env.DB_POOL_IDLE) || 5000, // Reduced idle time
    evict: parseInt(process.env.DB_POOL_EVICT) || 1000,
    // Additional Railway-specific pool options
    handleDisconnects: true,
    validate: (client) => {
      // Validate connection before use
      return client && !client._ending && !client._destroyed;
    },
    // Railway-specific optimizations
    createTimeoutMillis: 20000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
    propagateCreateError: false,
  };
  
  // Log pool configuration for debugging
  console.log(`📊 Pool Configuration: max=${poolConfig.max}, min=${poolConfig.min}, acquire=${poolConfig.acquire}ms`);
  
  return poolConfig;
};

// Enhanced Railway-specific SSL configuration
const getSSLConfig = () => {
  // Check if using Railway (DATABASE_URL set) or production
  const requiresSSL = process.env.DATABASE_URL || process.env.NODE_ENV === 'production';
  
  if (requiresSSL) {
    // Railway PostgreSQL requires SSL connections
    const sslConfig = {
      require: true, // ✅ Required by Railway
      rejectUnauthorized: false, // ✅ Prevents SSL certificate errors on Railway
      // Additional Railway-specific SSL options
      sslmode: 'require',
      ssl: true,
      // Enhanced SSL configuration for Railway
      checkServerIdentity: () => true, // Function that always returns true
      secureProtocol: 'TLSv1_2_method',
    };
    
    // Log SSL configuration for debugging
    console.log(`🔒 SSL Configuration: require=${sslConfig.require}, rejectUnauthorized=${sslConfig.rejectUnauthorized}, sslmode=${sslConfig.sslmode}`);
    
    return sslConfig;
  } else {
    // Local development - disable SSL
    console.log(`🔒 SSL Configuration: disabled for local development`);
    return false;
  }
};

// Initialize database connection
const initializeDatabase = () => {
  try {
    validateConnectionParams();
    
    const poolConfig = getPoolConfig();
    const sslConfig = getSSLConfig();
    const logging = getLoggingFunction();
    
    console.log("🔧 Initializing database connection...");
    console.log(`📊 Pool config: max=${poolConfig.max}, min=${poolConfig.min}`);
    if (sslConfig) {
      console.log(`🔒 SSL: required=${sslConfig.require}, rejectUnauthorized=${sslConfig.rejectUnauthorized}`);
    } else {
      console.log(`🔒 SSL: disabled`);
    }
    
    if (process.env.DATABASE_URL) {
      // Railway DATABASE_URL format: postgresql://user:password@host:port/database
      console.log("🚀 Using Railway DATABASE_URL for connection");
      
      sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: "postgres",
        dialectOptions: {
          ssl: sslConfig,
          // Railway-specific connection options
          connectTimeout: 20000, // Reduced to 20s for Railway
          requestTimeout: 20000, // Reduced to 20s for Railway
          // Additional Railway optimizations
          keepAlive: true,
          keepAliveInitialDelayMillis: 0,
          // Enhanced timeout handling for Railway
          statement_timeout: 20000,
          idle_in_transaction_session_timeout: 20000,
          // Railway-specific connection parameters
          application_name: 'railway-app',
          // Additional Railway optimizations
          binary: false,
          parseInputDatesAsUTC: true,
        },
        logging: logging,
        pool: poolConfig,
        // Enhanced Railway-specific connection options
        retry: {
          max: 5, // Increased retry attempts for Railway
          match: [
            /ConnectionError/,
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/,
            /timeout/,
            /ECONNRESET/,
            /ENOTFOUND/,
            /ETIMEDOUT/,
            /ECONNREFUSED/,
            /SSL/,
            /certificate/,
          ],
          backoffBase: 1000,
          backoffExponent: 1.5,
        },
        // Railway-specific query options
        define: {
          timestamps: true,
          underscored: true,
        },
        // Additional Railway optimizations
        benchmark: false,
        queryType: 'SELECT',
        isolationLevel: 'READ_COMMITTED',
      });
    } else {
      // Individual environment variables fallback
      console.log("🚀 Using individual environment variables for connection");
      
      sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          dialect: "postgres",
          dialectOptions: {
            ssl: sslConfig,
            connectTimeout: 20000,
            requestTimeout: 20000,
            statement_timeout: 20000,
            idle_in_transaction_session_timeout: 20000,
            application_name: 'local-app',
            binary: false,
            parseInputDatesAsUTC: true,
          },
          logging: logging,
          pool: poolConfig,
          retry: {
            max: 5,
            match: [
              /ConnectionError/,
              /SequelizeConnectionError/,
              /SequelizeConnectionRefusedError/,
              /SequelizeHostNotFoundError/,
              /SequelizeHostNotReachableError/,
              /SequelizeInvalidConnectionError/,
              /SequelizeConnectionTimedOutError/,
              /timeout/,
              /ECONNRESET/,
              /ENOTFOUND/,
              /ETIMEDOUT/,
              /ECONNREFUSED/,
              /SSL/,
              /certificate/,
            ],
            backoffBase: 1000,
            backoffExponent: 1.5,
          },
          define: {
            timestamps: true,
            underscored: true,
          },
        }
      );
    }
    
    console.log("✅ Database connection initialized successfully");
    return sequelize;
    
  } catch (error) {
    console.error("❌ Failed to initialize database connection:", error.message);
    throw error;
  }
};

// Initialize the connection
sequelize = initializeDatabase();

// Enhanced test connection function with detailed Railway debugging
const testConnection = async () => {
  try {
    console.log("🔍 Testing database connection...");
    
    // Test basic connection
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connection established successfully.");
    
    // Test database sync
    await sequelize.sync({ alter: false });
    console.log("✅ Database tables verified and ready.");
    
    // Test pool status
    const pool = sequelize.connectionManager.pool;
    console.log(`📊 Connection pool status: ${pool.size} active, ${pool.available} available`);
    
    // Test a simple query
    const [results] = await sequelize.query('SELECT NOW() as current_time');
    console.log(`⏰ Database time: ${results[0].current_time}`);
    
    console.log("🎉 Database connection test completed successfully!");
    
  } catch (error) {
    console.error("❌ Database connection error:");
    console.error(`   Error Type: ${error.constructor.name}`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Error Code: ${error.code || 'N/A'}`);
    
    // Railway-specific error handling
    if (error.message.includes('SSL')) {
      console.error("🔒 SSL Error detected - check Railway SSL configuration");
    }
    if (error.message.includes('timeout')) {
      console.error("⏱️  Timeout Error - check Railway connection limits");
    }
    if (error.message.includes('ENOTFOUND')) {
      console.error("🌐 DNS Error - check Railway DATABASE_URL hostname");
    }
    
    throw error;
  }
};

// Connection health check function for Railway monitoring
const getConnectionHealth = async () => {
  try {
    const pool = sequelize.connectionManager.pool;
    const [results] = await sequelize.query('SELECT 1 as health_check');
    
    return {
      status: 'healthy',
      pool: {
        size: pool.size,
        available: pool.available,
        max: pool.max,
        min: pool.min
      },
      database: {
        connected: true,
        response_time: Date.now()
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Graceful shutdown function for Railway
const closeConnection = async () => {
  try {
    console.log("🔄 Closing database connection...");
    await sequelize.close();
    console.log("✅ Database connection closed successfully");
  } catch (error) {
    console.error("❌ Error closing database connection:", error.message);
  }
};

// Handle Railway shutdown signals
process.on('SIGTERM', closeConnection);
process.on('SIGINT', closeConnection);

module.exports = { 
  sequelize, 
  testConnection, 
  getConnectionHealth, 
  closeConnection,
  validateConnectionParams 
};
