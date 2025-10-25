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
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 120000, // Increased to 120s for Railway free tier wake-up
    idle: parseInt(process.env.DB_POOL_IDLE) || 10000, // Increased idle time for Railway stability
    evict: parseInt(process.env.DB_POOL_EVICT) || 1000,
    // Additional Railway-specific pool options
    handleDisconnects: true,
    validate: (client) => {
      // Validate connection before use
      return client && !client._ending && !client._destroyed;
    },
    // Railway-specific optimizations with extended timeouts
    createTimeoutMillis: 60000, // Increased to 60s for Railway free tier
    destroyTimeoutMillis: 10000, // Increased destroy timeout
    reapIntervalMillis: 2000, // Increased reap interval
    createRetryIntervalMillis: 1000, // Increased retry interval
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
          // Railway-specific connection options with extended timeouts
          connectTimeout: 60000, // Increased to 60s for Railway free tier wake-up
          requestTimeout: 60000, // Increased to 60s for Railway free tier wake-up
          // Additional Railway optimizations
          keepAlive: true,
          keepAliveInitialDelayMillis: 0,
          // Enhanced timeout handling for Railway
          statement_timeout: 60000, // Increased statement timeout
          idle_in_transaction_session_timeout: 60000, // Increased idle timeout
          // Railway-specific connection parameters
          application_name: 'railway-app',
          // Additional Railway optimizations
          binary: false,
          parseInputDatesAsUTC: true,
          // Railway-specific network optimizations
          tcpKeepAlive: true,
          tcpKeepAliveInitialDelayMillis: 0,
        },
        logging: logging,
        pool: poolConfig,
        // Enhanced Railway-specific connection options with robust retry logic
        retry: {
          max: 10, // Increased retry attempts for Railway free tier
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
            /Connection terminated/,
            /Connection lost/,
            /Connection closed/,
            /Database is starting/,
            /Database is sleeping/,
          ],
          backoffBase: 2000, // Increased base delay for Railway
          backoffExponent: 2.0, // More aggressive exponential backoff
        },
        // Railway-specific query options
        define: {
          timestamps: true,
          underscored: true,
        },
        // Additional Railway optimizations
        benchmark: false,
        queryType: 'SELECT',
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
            connectTimeout: 60000, // Increased to 60s for Railway compatibility
            requestTimeout: 60000, // Increased to 60s for Railway compatibility
            statement_timeout: 60000, // Increased statement timeout
            idle_in_transaction_session_timeout: 60000, // Increased idle timeout
            application_name: 'local-app',
            binary: false,
            parseInputDatesAsUTC: true,
            // Railway-specific network optimizations
            tcpKeepAlive: true,
            tcpKeepAliveInitialDelayMillis: 0,
          },
          logging: logging,
          pool: poolConfig,
          retry: {
            max: 10, // Increased retry attempts for Railway compatibility
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
              /Connection terminated/,
              /Connection lost/,
              /Connection closed/,
              /Database is starting/,
              /Database is sleeping/,
            ],
            backoffBase: 2000, // Increased base delay for Railway
            backoffExponent: 2.0, // More aggressive exponential backoff
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

// Enhanced Railway-specific connection retry wrapper with timeout
const connectWithRetry = async (operation, maxRetries = 10, baseDelay = 2000, timeoutMs = 60000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Connection attempt ${attempt}/${maxRetries}...`);

      // Check if connection manager is still open before attempting operation
      if (sequelize && sequelize.connectionManager && sequelize.connectionManager.pool && sequelize.connectionManager.pool._closed) {
        console.log(`⚠️  Connection pool is closed, skipping attempt ${attempt}`);
        throw new Error('Connection pool is closed');
      }

      // Wrap the operation with a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      console.log(`✅ Connection successful on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed: ${error.message}`);

      // Check if this is a Railway-specific error that should trigger retry
      const shouldRetry = error.message.includes('ETIMEDOUT') ||
                         error.message.includes('ECONNRESET') ||
                         error.message.includes('ECONNREFUSED') ||
                         error.message.includes('timeout') ||
                         error.message.includes('Connection terminated') ||
                         error.message.includes('Connection lost') ||
                         error.message.includes('Database is starting') ||
                         error.message.includes('Database is sleeping') ||
                         error.message.includes('SSL') ||
                         error.message.includes('certificate') ||
                         error.message.includes('Operation timed out') ||
                         error.message.includes('ConnectionManager.getConnection was called after the connection manager was closed');

      // Don't retry if connection manager is closed
      if (error.message.includes('ConnectionManager.getConnection was called after the connection manager was closed')) {
        console.error(`❌ Connection manager is closed, cannot retry`);
        throw error;
      }

      if (!shouldRetry || attempt === maxRetries) {
        console.error(`❌ Max retries reached or non-retryable error`);
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Enhanced test connection function with detailed Railway debugging and retry logic
const testConnection = async () => {
  try {
    console.log("🔍 Testing database connection with Railway retry logic...");
    
    // Test basic connection with retry
    await connectWithRetry(async () => {
      await sequelize.authenticate();
      console.log("✅ PostgreSQL connection established successfully.");
    });
    
    // Test database sync with retry
    await connectWithRetry(async () => {
      await sequelize.sync({ alter: false });
      console.log("✅ Database tables verified and ready.");
    });
    
    // Test pool status
    const pool = sequelize.connectionManager.pool;
    console.log(`📊 Connection pool status: ${pool.size} active, ${pool.available} available`);
    
    // Test a simple query with retry
    const [results] = await connectWithRetry(async () => {
      return await sequelize.query('SELECT NOW() as current_time');
    });
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
      console.error("   Try adding ?ssl=require to your DATABASE_URL");
    }
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.error("⏱️  Timeout Error - Railway database may be sleeping (free tier)");
      console.error("   Wait 30-60 seconds and try again");
    }
    if (error.message.includes('ENOTFOUND')) {
      console.error("🌐 DNS Error - check Railway DATABASE_URL hostname");
      console.error("   Verify DATABASE_URL format: postgresql://user:pass@host:port/db");
    }
    if (error.message.includes('ECONNREFUSED')) {
      console.error("🚫 Connection Refused - Railway database service may be down");
      console.error("   Check Railway dashboard for service status");
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
  validateConnectionParams,
  connectWithRetry // Export the retry function for use in other modules
};
