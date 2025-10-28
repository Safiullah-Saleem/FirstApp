const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// ✅ Import models directly (simpler approach)
const User = require('../user/user.model');
const Employee = require('../employees/employee.model');

const authenticate = async (req, res, next) => {
  try {
    console.log("🔐 AUTHENTICATING REQUEST...");
    console.log("Request URL:", req.method, req.originalUrl);
    
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log("❌ No token provided");
      return res.status(401).json({
        response: {
          status: { 
            statusCode: 401, 
            statusMessage: 'Access denied. No token provided.' 
          },
          data: null
        }
      });
    }

    // Verify token with better error handling
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-for-development');
      console.log("✅ Token decoded - Type:", decoded.type, "ID:", decoded.id, "Company:", decoded.company_code);
      
    } catch (jwtError) {
      console.error("❌ JWT Verification Error:", jwtError.name);
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          response: {
            status: { 
              statusCode: 401, 
              statusMessage: 'Invalid token.' 
            },
            data: null
          }
        });
      }
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          response: {
            status: { 
              statusCode: 401, 
              statusMessage: 'Token expired.' 
            },
            data: null
          }
        });
      }

      throw jwtError;
    }

    let user;

    // ✅ POSTGRESQL AUTHENTICATION WITH ENHANCED DEBUGGING
    try {
      // Check if it's a User (company admin) or Employee
      if (decoded.type === 'employee') {
        console.log("🔍 Looking up EMPLOYEE with:", {
          id: decoded.id,
          employee_code: decoded.employee_code,
          email: decoded.email,
          username: decoded.username
        });
        
        // ✅ FIXED: Use Employee model directly with better error handling
        user = await Employee.findOne({
          where: {
            [Op.or]: [
              { id: decoded.id },
              { employee_code: decoded.employee_code || decoded.id },
              { email: decoded.email },
              { username: decoded.username }
            ],
            status: 'active'
          },
          attributes: ['id', 'company_code', 'email', 'username', 'employee_code', 'role', 'status', 'name']
        });
        
        console.log("🔍 Employee lookup:", user ? `FOUND: ${user.employee_code}` : "NOT FOUND");
        
        if (user) {
          console.log("📋 Employee details from DB:", {
            id: user.id,
            employee_code: user.employee_code,
            company_code: user.company_code,
            email: user.email
          });
        }
        
      } else if (decoded.type === 'user') {
        console.log("🔍 Looking up USER with:", {
          id: decoded.id,
          email: decoded.email
        });
        
        // ✅ FIXED: Use User model directly
        user = await User.findOne({
          where: {
            [Op.or]: [
              { id: decoded.id },
              { email: decoded.email }
            ],
            is_active: true
          },
          attributes: ['id', 'company_code', 'email', 'name', 'is_active']
        });
        
        console.log("🔍 User lookup:", user ? `FOUND: ${user.email}` : "NOT FOUND");
        
        if (user) {
          console.log("📋 User details from DB:", {
            id: user.id,
            company_code: user.company_code,
            email: user.email
          });
        }
      } else {
        console.log("❌ Unknown user type:", decoded.type);
        return res.status(401).json({
          response: {
            status: { 
              statusCode: 401, 
              statusMessage: 'Invalid token type.' 
            },
            data: null
          }
        });
      }
    } catch (dbError) {
      console.error("❌ POSTGRESQL ERROR during authentication:", dbError.message);
      console.error("❌ Database error details:", {
        name: dbError.name,
        message: dbError.message,
        stack: dbError.stack
      });
      
      // ✅ ENHANCED POSTGRESQL FALLBACK
      if (dbError.name === 'SequelizeConnectionError' || 
          dbError.name === 'SequelizeConnectionRefusedError' ||
          dbError.name === 'SequelizeConnectionTimedOutError' ||
          dbError.name === 'SequelizeDatabaseError' ||
          dbError.message.includes('ETIMEDOUT') || 
          dbError.message.includes('ECONNREFUSED') || 
          dbError.message.includes('connect') ||
          dbError.message.includes('timeout') ||
          dbError.message.includes('relation') ||
          dbError.message.includes('table') ||
          dbError.message.includes('column')) {
        
        console.log("🔄 PostgreSQL unavailable or schema issue, using fallback authentication");
        
        req.user = {
          id: decoded.id,
          email: decoded.email,
          company_code: decoded.company_code,
          type: decoded.type || 'user',
          fallback: true,
          databaseUnavailable: true
        };

        if (decoded.type === 'employee') {
          req.user.employee_code = decoded.employee_code;
          req.user.role = decoded.role;
          req.user.username = decoded.username;
          req.user.status = 'active';
        } else {
          req.user.is_active = true;
        }

        console.log("✅ PostgreSQL fallback authentication successful");
        console.log("👤 Fallback user details:", {
          id: req.user.id,
          type: req.user.type,
          company_code: req.user.company_code,
          employee_code: req.user.employee_code
        });
        return next();
      }
      
      // If it's not a connection error, throw it
      throw dbError;
    }

    if (!user) {
      console.log("❌ User not found for token - Type:", decoded.type, "ID:", decoded.id);
      
      // Provide more helpful error message
      let errorMessage = 'Invalid token. User not found.';
      if (decoded.type === 'employee') {
        errorMessage = `Employee not found with ID: ${decoded.id}, Email: ${decoded.email}, or Username: ${decoded.username}`;
      }
      
      return res.status(401).json({
        response: {
          status: { 
            statusCode: 401, 
            statusMessage: errorMessage
          },
          data: null
        }
      });
    }

    // ✅ FIXED: Use the company_code from the DATABASE, not from the token
    req.user = {
      id: user.id,
      email: user.email,
      company_code: user.company_code, // ✅ This is the fix - use database company_code
      name: user.name || user.username,
      type: decoded.type,
      fallback: false,
      databaseUnavailable: false
    };

    // Add employee-specific fields
    if (decoded.type === 'employee') {
      req.user.employee_code = user.employee_code;
      req.user.role = user.role;
      req.user.username = user.username;
      req.user.status = user.status;
    }

    // Add user-specific fields
    if (decoded.type === 'user') {
      req.user.is_active = user.is_active;
    }

    console.log("✅ Authentication successful for:", req.user.type);
    console.log("🏢 Company code from DATABASE:", req.user.company_code);
    console.log("👤 Final user object:", {
      id: req.user.id,
      type: req.user.type,
      company_code: req.user.company_code,
      email: req.user.email,
      employee_code: req.user.employee_code,
      username: req.user.username
    });
    
    next();
  } catch (error) {
    console.error("❌ AUTHENTICATION ERROR:", error);
    console.error("❌ Full error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      response: {
        status: { 
          statusCode: 500, 
          statusMessage: 'Authentication failed.' 
        },
        data: null
      }
    });
  }
};

// Middleware to require admin role
const requireAdmin = (req, res, next) => {
  console.log("🔒 Checking admin privileges for:", req.user?.email);
  
  if (!req.user || (req.user.type !== 'user' && !req.user.fallback)) {
    console.log("❌ Admin access denied - User type:", req.user?.type);
    return res.status(403).json({
      response: {
        status: { 
          statusCode: 403, 
          statusMessage: 'Access denied. Admin privileges required.' 
        },
        data: null
      }
    });
  }
  
  console.log("✅ Admin access granted");
  next();
};

// Middleware to require specific employee roles
const requireEmployeeRole = (allowedRoles) => {
  return (req, res, next) => {
    console.log("🔒 Checking employee role - Current:", req.user?.role, "Required:", allowedRoles);
    
    if (!req.user || req.user.type !== 'employee' || !allowedRoles.includes(req.user.role)) {
      console.log("❌ Employee role access denied");
      return res.status(403).json({
        response: {
          status: { 
            statusCode: 403, 
            statusMessage: 'Access denied. Insufficient permissions.' 
          },
          data: null
        }
      });
    }
    
    console.log("✅ Employee role access granted");
    next();
  };
};

// Middleware to check company access
const requireCompanyAccess = (companyCode) => {
  return (req, res, next) => {
    console.log("🔒 Checking company access - User:", req.user?.company_code, "Required:", companyCode);
    
    if (!req.user || req.user.company_code !== companyCode) {
      console.log("❌ Company access denied");
      return res.status(403).json({
        response: {
          status: { 
            statusCode: 403, 
            statusMessage: 'Access denied. Company access required.' 
          },
          data: null
        }
      });
    }
    
    console.log("✅ Company access granted");
    next();
  };
};

// Middleware for employee routes that allows both admins and employees
const allowEmployeesAndAdmins = (req, res, next) => {
  console.log("🔒 Checking employee route access for:", req.user?.type);
  
  if (!req.user) {
    console.log("❌ No user found for employee route");
    return res.status(401).json({
      response: {
        status: { 
          statusCode: 401, 
          statusMessage: 'Authentication required.' 
        },
        data: null
      }
    });
  }

  if (req.user.type === 'user' || req.user.type === 'employee' || req.user.fallback) {
    console.log("✅ Employee route access granted for:", req.user.type);
    return next();
  }

  console.log("❌ Employee route access denied for user type:", req.user.type);
  return res.status(403).json({
    response: {
      status: { 
        statusCode: 403, 
        statusMessage: 'Access denied. Employee or admin access required.' 
      },
      data: null
    }
  });
};

// Middleware for admin employee management
const requireAdminForEmployeeManagement = (req, res, next) => {
  console.log("🔒 Checking admin access for employee management:", req.user?.type);
  
  if (!req.user || (req.user.type !== 'user' && !req.user.fallback)) {
    console.log("❌ Employee management access denied - User type:", req.user?.type);
    return res.status(403).json({
      response: {
        status: { 
          statusCode: 403, 
          statusMessage: 'Access denied. Only company administrators can manage employees.' 
        },
        data: null
      }
    });
  }
  
  console.log("✅ Employee management access granted for admin");
  next();
};

// Middleware for same company access
const requireSameCompany = (req, res, next) => {
  console.log("🔒 Checking same company access");
  
  if (!req.user || !req.user.company_code) {
    console.log("❌ Company code missing");
    return res.status(403).json({
      response: {
        status: { 
          statusCode: 403, 
          statusMessage: 'Access denied. Company information missing.' 
        },
        data: null
      }
    });
  }

  console.log("✅ Same company access granted for:", req.user.company_code);
  next();
};

// Handle fallback authentication
const handleFallbackAuth = (req, res, next) => {
  if (req.user && req.user.fallback) {
    console.log("⚠️ Using PostgreSQL fallback authentication");
    res.set('X-Auth-Mode', 'fallback');
  } else {
    res.set('X-Auth-Mode', 'postgresql');
  }
  next();
};

// ✅ NEW: Debug middleware to check user info
const debugUserInfo = (req, res, next) => {
  if (req.user) {
    console.log("👤 DEBUG USER INFO:", {
      id: req.user.id,
      type: req.user.type,
      company_code: req.user.company_code,
      email: req.user.email,
      employee_code: req.user.employee_code,
      username: req.user.username,
      fallback: req.user.fallback,
      databaseUnavailable: req.user.databaseUnavailable
    });
  }
  next();
};

module.exports = { 
  authenticate, 
  requireAdmin, 
  requireEmployeeRole,
  requireCompanyAccess,
  allowEmployeesAndAdmins,
  requireAdminForEmployeeManagement,
  requireSameCompany,
  handleFallbackAuth,
  debugUserInfo
};