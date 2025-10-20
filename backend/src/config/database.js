const { Sequelize } = require("sequelize");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

let sequelize;

// Enhanced connection parameter validation for Railway
const validateConnectionParams = () => {
  const errors = [];
  
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      
      // Validate Railway DATABASE_URL format
      if (!url.protocol || !url.hostname || !url.pathname) {
        errors.push("Invalid DATABASE_URL format - missing required components");
      }
      
      // Check for PostgreSQL protocol
      if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
        errors.push(`Invalid protocol: ${url.protocol}. Expected 'postgresql:' or 'postgres:'`);
      }
      
      // Validate database name exists
      const dbName = url.pathname.slice(1);
      if (!dbName) {
        errors.push("Database name is missing from DATABASE_URL");
      }
      
      console.log(`🔍 DATABASE_URL parsed: ${url.protocol}//${url.hostname}:${url.port || '5432'}${url.pathname}`);
      
    } catch (error) {
      errors.push(`DATABASE_URL is not a valid URL: ${error.message}`);
    }
  } else {
    const requiredParams = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST'];
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

// Enhanced logging function
const getLoggingFunction = () => {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_DB === 'true') {
    return (msg) => {
      const timestamp = new Date().toISOString();
      // Don't log parameter binding for security
      if (!msg.includes('parameters') && !msg.includes('bind')) {
        console.log(`🗄️  [DB] [${timestamp}] ${msg}`);
      }
    };
  }
  return false;
};

// Railway-optimized connection pool configuration
const getPoolConfig = () => {
  const poolConfig = {
    max: parseInt(process.env.DB_POOL_MAX) || 5, // Increased max connections
    min: parseInt(process.env.DB_POOL_MIN) || 1,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 120000, // Increased to 2 minutes
    idle: parseInt(process.env.DB_POOL_IDLE) || 30000, // Increased idle time
    evict: parseInt(process.env.DB_POOL_EVICT) || 1000,
    handleDisconnects: true,
    validate: true, // Add connection validation
  };

  console.log(`📊 Pool Configuration: max=${poolConfig.max}, min=${poolConfig.min}, acquire=${poolConfig.acquire}ms`);

  return poolConfig;
};

// Railway-specific SSL configuration
const getSSLConfig = () => {
  const sslConfig = {
    require: true,
    rejectUnauthorized: false,
  };
  
  console.log(`🔒 SSL Configuration: require=${sslConfig.require}, rejectUnauthorized=${sslConfig.rejectUnauthorized}`);
  
  return sslConfig;
};

// Initialize database connection
const initializeDatabase = () => {
  try {
    validateConnectionParams();
    
    const poolConfig = getPoolConfig();
    const sslConfig = getSSLConfig();
    const logging = getLoggingFunction();
    
    console.log("🔧 Initializing database connection...");
    
    if (process.env.DATABASE_URL) {
      console.log("🚀 Using Railway DATABASE_URL for connection");
      
      sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: "postgres",
        dialectOptions: {
          ssl: sslConfig,
          connectTimeout: 120000, // Increased to 2 minutes
          requestTimeout: 120000,  // Increased to 2 minutes
          keepAlive: true,
          keepAliveInitialDelay: 30000,
          statement_timeout: 120000, // Added statement timeout
          query_timeout: 120000,     // Added query timeout
        },
        logging: logging,
        pool: poolConfig,
        retry: {
          max: 8, // Increased retry attempts
          timeout: 120000, // Increased retry timeout to 2 minutes
          backoffBase: 2000, // Increased base delay
          backoffExponent: 1.8, // Increased exponential backoff
          match: [
            /ConnectionError/,
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/,
            /TimeoutError/,
            /timeout/,
            /ECONNRESET/,
            /ENOTFOUND/,
            /ETIMEDOUT/,
            /EAI_AGAIN/,
            /ECONNREFUSED/,
            /EHOSTUNREACH/,
          ],
        },
        define: {
          timestamps: false,
          underscored: true,
          freezeTableName: true,
        },
        benchmark: process.env.NODE_ENV === 'development',
        query: {
          raw: false,
        },
      });
    } else {
      // Individual environment variables fallback
      sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT || 5432,
          dialect: "postgres",
          dialectOptions: {
            ssl: sslConfig,
            connectTimeout: 120000, // Increased to match Railway config
            requestTimeout: 120000,  // Increased to match Railway config
            statement_timeout: 120000,
            query_timeout: 120000,
          },
          logging: logging,
          pool: poolConfig,
          retry: {
            max: 8, // Increased to match Railway config
            timeout: 120000, // Added timeout
            backoffBase: 2000, // Added backoff
            backoffExponent: 1.8, // Added exponential backoff
            match: [
              /ConnectionError/,
              /SequelizeConnectionError/,
              /SequelizeConnectionRefusedError/,
              /SequelizeHostNotFoundError/,
              /SequelizeHostNotReachableError/,
              /SequelizeInvalidConnectionError/,
              /SequelizeConnectionTimedOutError/,
              /TimeoutError/,
              /timeout/,
              /ECONNRESET/,
              /ENOTFOUND/,
              /ETIMEDOUT/,
              /EAI_AGAIN/,
              /ECONNREFUSED/,
              /EHOSTUNREACH/,
            ],
          },
          define: {
            timestamps: false,
            underscored: true,
            freezeTableName: true,
          },
        }
      );
    }
    
    console.log("✅ Database connection initialized successfully");
    return sequelize;
    
  } catch (error) {
    console.error("❌ Failed to initialize database connection:", error.message);
    console.error("Stack trace:", error.stack);
    throw error;
  }
};

// Initialize the connection
sequelize = initializeDatabase();

// Enhanced test connection function
const testConnection = async () => {
  try {
    console.log("🔍 Testing database connection...");
    
    // Test basic connection
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connection established successfully.");
    
    // Test a simple query
    const [results] = await sequelize.query('SELECT version() as db_version, NOW() as current_time');
    console.log(`⏰ Database time: ${results[0].current_time}`);
    console.log(`📋 PostgreSQL version: ${results[0].db_version}`);
    
    console.log("🎉 Database connection test completed successfully!");
    return true;
    
  } catch (error) {
    console.error("❌ Database connection error:");
    console.error(`   Error Type: ${error.constructor.name}`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Error Code: ${error.original?.code || error.code || 'N/A'}`);
    
    if (error.original) {
      console.error(`   Original Error: ${error.original.message}`);
      console.error(`   Original Code: ${error.original.code}`);
    }
    
    if (error.message.includes('SSL') || error.original?.code === '28000') {
      console.error("🔒 SSL Error detected - check Railway SSL configuration");
    }
    if (error.message.includes('timeout') || error.original?.code === '57014') {
      console.error("⏱️  Timeout Error - check Railway connection limits");
    }
    if (error.message.includes('ENOTFOUND') || error.original?.code === 'EHOSTUNREACH') {
      console.error("🌐 DNS/Network Error - check Railway DATABASE_URL hostname");
    }
    if (error.original?.code === '28P01') {
      console.error("🔑 Authentication Error - check database credentials");
    }
    if (error.original?.code === '3D000') {
      console.error("🗃️  Database Not Found - check database name");
    }
    
    throw error;
  }
};

// Connection health check function
const getConnectionHealth = async () => {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query('SELECT 1 as health_check');
    
    return {
      status: 'healthy',
      database: {
        connected: true,
        response_time: Date.now(),
        dialect: 'postgres'
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      code: error.original?.code || error.code,
      timestamp: new Date().toISOString()
    };
  }
};

// Graceful shutdown function
const closeConnection = async () => {
  try {
    console.log("🔄 Closing database connection...");
    await sequelize.close();
    console.log("✅ Database connection closed successfully");
  } catch (error) {
    console.error("❌ Error closing database connection:", error.message);
  }
};

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught Exception:', error);
  await closeConnection();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  await closeConnection();
  process.exit(1);
});

// ✅ CRITICAL: Export the sequelize instance properly
module.exports = { 
  sequelize, 
  testConnection, 
  getConnectionHealth, 
  closeConnection,
  validateConnectionParams,
  Sequelize 
};
