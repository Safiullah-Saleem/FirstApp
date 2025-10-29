const { Sequelize, Op } = require("sequelize");
require("dotenv").config();

let sequelize;
let isConnected = false;
let currentDatabaseType = 'unknown';

// ==================== DATABASE CONNECTION ====================

// Validate connection parameters
const validateConnectionParams = () => {
  const errors = [];
  
  // Check Heroku DATABASE_URL
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (!url.hostname) errors.push('DATABASE_URL missing hostname');
      if (!url.port) errors.push('DATABASE_URL missing port');
      if (!url.username) errors.push('DATABASE_URL missing username');
      if (!url.password) errors.push('DATABASE_URL missing password');
      if (!url.pathname || url.pathname === '/') errors.push('DATABASE_URL missing database name');
    } catch (error) {
      errors.push(`Invalid DATABASE_URL format: ${error.message}`);
    }
  }
  
  // Check local database parameters
  if (!process.env.DATABASE_URL) {
    if (!process.env.DB_HOST) errors.push('DB_HOST not set');
    if (!process.env.DB_PORT) errors.push('DB_PORT not set');
    if (!process.env.DB_NAME) errors.push('DB_NAME not set');
    if (!process.env.DB_USER) errors.push('DB_USER not set');
    if (!process.env.DB_PASSWORD) errors.push('DB_PASSWORD not set');
  }
  
  if (errors.length > 0) {
    throw new Error(`Connection parameter validation failed:\n${errors.join('\n')}`);
  }
  
  return true;
};

// Connect to Heroku PostgreSQL (Production)
const connectToHeroku = async () => {
  console.log("🚀 Connecting to Heroku PostgreSQL...");
  
  try {
    // Validate configuration
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Heroku connection");
    }

    const herokuDB = new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        },
        connectTimeout: 10000,
        keepAlive: true,
      },
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 5,
        min: parseInt(process.env.DB_POOL_MIN) || 0,
        acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 10000,
        idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
      },
      retry: {
        max: 2,
      }
    });

    // Add connection timeout wrapper
    const connectionTimeout = 10000;
    const authenticatePromise = herokuDB.authenticate();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Heroku connection timeout after 10 seconds')), connectionTimeout)
    );
    
    await Promise.race([authenticatePromise, timeoutPromise]);
    console.log("✅ Connected to Heroku PostgreSQL");
    return herokuDB;
  } catch (error) {
    console.log(`❌ Heroku connection failed: ${error.message}`);
    throw error;
  }
};

// Connect to Local PostgreSQL (Development)
const connectToLocalPostgreSQL = async () => {
  console.log("💻 Connecting to Local PostgreSQL...");
  
  try {
    const localConfig = {
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'myapp',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 5000,
        idle: 10000
      },
      retry: {
        max: 1,
      }
    };

    const localDB = new Sequelize(localConfig);
    
    // Add connection timeout wrapper
    const connectionTimeout = 5000;
    const authenticatePromise = localDB.authenticate();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Local connection timeout after 5 seconds')), connectionTimeout)
    );
    
    await Promise.race([authenticatePromise, timeoutPromise]);
    console.log("✅ Connected to Local PostgreSQL");
    return localDB;
  } catch (error) {
    console.log(`❌ Local PostgreSQL connection failed: ${error.message}`);
    throw error;
  }
};

// ==================== DATABASE INITIALIZATION ====================

const initializeDatabase = async () => {
  console.log("🎯 Initializing PostgreSQL Database...");
  
  // Try Heroku PostgreSQL first (production), then Local (development)
  const connectionAttempts = [
    { 
      name: 'Heroku PostgreSQL', 
      connect: connectToHeroku,
      type: 'heroku'
    },
    { 
      name: 'Local PostgreSQL', 
      connect: connectToLocalPostgreSQL,
      type: 'local'
    }
  ];

  for (const attempt of connectionAttempts) {
    try {
      console.log(`\n🔄 Attempting: ${attempt.name}...`);
      const db = await attempt.connect();
      
      sequelize = db;
      currentDatabaseType = attempt.type;
      isConnected = true;
      
      console.log(`🎉 SUCCESS: Using ${attempt.name}`);
      return sequelize;
      
    } catch (error) {
      console.log(`❌ ${attempt.name} failed: ${error.message}`);
      continue;
    }
  }

  throw new Error("💥 Both Heroku and Local PostgreSQL connections failed");
};

// ==================== DATABASE MANAGEMENT ====================

// Get current active database
const getCurrentDatabase = () => {
  return sequelize;
};

// Connection health check
const getConnectionHealth = async () => {
  try {
    if (!sequelize) {
      return {
        status: 'unhealthy',
        database: currentDatabaseType,
        isConnected: false,
        error: 'Database not initialized',
        timestamp: new Date().toISOString()
      };
    }
    
    const [results] = await sequelize.query('SELECT 1 as health_check');
    
    return {
      status: 'healthy',
      database: currentDatabaseType,
      isConnected: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      database: currentDatabaseType,
      isConnected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Get database status
const getDatabaseStatus = () => {
  return {
    currentDatabase: currentDatabaseType,
    isConnected: isConnected,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  };
};

// Smart connection with retry logic
const connectWithRetry = async (operation, maxRetries = 3, baseDelay = 2000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Database operation attempt ${attempt}/${maxRetries}...`);
      const result = await operation(sequelize);
      console.log(`✅ Operation successful on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed: ${error.message}`);

      if (attempt === maxRetries) {
        console.error(`❌ Max retries reached`);
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 10000);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Enhanced test connection
const testConnection = async (syncDatabase = false) => {
  try {
    console.log("🚀 Testing PostgreSQL database connection...");
    
    // Initialize database
    await initializeDatabase();
    
    const dbStatus = getDatabaseStatus();
    console.log(`✅ Connected to: ${dbStatus.currentDatabase}`);
    
    // Sync if requested
    if (syncDatabase) {
      await connectWithRetry(async (db) => {
        await db.sync({ alter: false });
        console.log("✅ Database tables verified");
      });
    }
    
    // Test current database
    await connectWithRetry(async (db) => {
      const [results] = await db.query('SELECT 1 as test_query');
      console.log(`✅ Test query successful with ${currentDatabaseType}`);
    });
    
    console.log(`🎉 Database setup complete: ${dbStatus.currentDatabase}`);
    
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
};

// Graceful shutdown
const closeConnection = async () => {
  try {
    console.log("🔄 Closing database connection...");
    
    if (sequelize) {
      await sequelize.close();
      console.log("✅ Database connection closed");
      isConnected = false;
    }
    
  } catch (error) {
    console.error("❌ Error closing database connection:", error.message);
  }
};

// Manual control functions
const switchToHeroku = async () => {
  try {
    console.log('🔄 Switching to Heroku PostgreSQL...');
    const herokuDB = await connectToHeroku();
    
    if (sequelize) {
      await sequelize.close();
    }
    
    sequelize = herokuDB;
    currentDatabaseType = 'heroku';
    console.log('✅ Successfully switched to Heroku PostgreSQL');
    return true;
  } catch (error) {
    console.log('❌ Failed to switch to Heroku');
    return false;
  }
};

const switchToLocal = async () => {
  try {
    console.log('🔄 Switching to Local PostgreSQL...');
    const localDB = await connectToLocalPostgreSQL();
    
    if (sequelize) {
      await sequelize.close();
    }
    
    sequelize = localDB;
    currentDatabaseType = 'local';
    console.log('✅ Successfully switched to Local PostgreSQL');
    return true;
  } catch (error) {
    console.log('❌ Failed to switch to Local PostgreSQL');
    return false;
  }
};

// ==================== INITIALIZATION ====================

// Initialize database immediately
let dbInitialized = false;
const initializeAsync = async () => {
  try {
    await initializeDatabase();
    dbInitialized = true;
    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    // Don't throw here - let the app start and handle connections lazily
  }
};

// Start initialization
initializeAsync();

// ==================== EXPORTS ====================

// Safe sequelize proxy that handles initialization
const createSequelizeProxy = () => {
  return {
    // Proxy that waits for initialization
    authenticate: async () => {
      if (!dbInitialized) {
        await initializeAsync();
      }
      if (!sequelize) {
        throw new Error('Database not initialized');
      }
      return sequelize.authenticate();
    },
    
    // Delegate all other methods with safe initialization
    query: async (...args) => {
      if (!dbInitialized) {
        await initializeAsync();
      }
      if (!sequelize) {
        throw new Error('Database not initialized');
      }
      return sequelize.query(...args);
    },
    
    sync: async (...args) => {
      if (!dbInitialized) {
        await initializeAsync();
      }
      if (!sequelize) {
        throw new Error('Database not initialized');
      }
      return sequelize.sync(...args);
    },
    
    define: (...args) => {
      if (!sequelize) {
        console.log('⚠️ Sequelize not initialized yet, but defining model...');
        return (actualSequelize) => actualSequelize.define(...args);
      }
      return sequelize.define(...args);
    },
    
    close: async (...args) => {
      if (!sequelize) {
        console.log('⚠️ No database connection to close');
        return;
      }
      return sequelize.close(...args);
    },
    
    // Add transaction support
    transaction: async (...args) => {
      if (!dbInitialized) {
        await initializeAsync();
      }
      if (!sequelize) {
        throw new Error('Database not initialized');
      }
      return sequelize.transaction(...args);
    },
    
    // Add other Sequelize methods as needed
    model: (...args) => {
      if (!sequelize) {
        throw new Error('Database not initialized');
      }
      return sequelize.model(...args);
    },
    
    isDefined: (...args) => {
      if (!sequelize) return false;
      return sequelize.isDefined(...args);
    }
  };
};

module.exports = { 
  // Main export - the actual Sequelize instance that models need
  sequelize: createSequelizeProxy(),
  
  // Direct access to sequelize (use with caution)
  getSequelize: () => {
    if (!sequelize) {
      throw new Error('Database not initialized. Use testConnection() first.');
    }
    return sequelize;
  },
  
  // Connection management
  testConnection, 
  getConnectionHealth, 
  closeConnection,
  validateConnectionParams,
  
  // Status and monitoring
  getDatabaseStatus,
  
  // Manual control
  switchToHeroku,
  switchToLocal,
  
  // Utilities
  connectWithRetry,
  
  // Info
  getCurrentDatabase: () => sequelize,
  getDatabaseType: () => currentDatabaseType,
  isConnected: () => isConnected,
  
  // Initialization status
  isInitialized: () => dbInitialized,
  
  // Sequelize operators
  Op
};