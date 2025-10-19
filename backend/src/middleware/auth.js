const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
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
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-fallback-secret-key');
      console.log("✅ Token decoded - ID:", decoded.id, "Type:", decoded.type, "Company:", decoded.company_code);
      
      // ADDED: Debug logging to see token contents
      console.log("🔍 DECODED TOKEN DETAILS:");
      console.log("Full decoded:", JSON.stringify(decoded, null, 2));
      console.log("Decoded ID:", decoded.id);
      console.log("Decoded email:", decoded.email);
      console.log("Decoded type:", decoded.type);
      console.log("Decoded company_code:", decoded.company_code);
      
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

    // Check if it's a User (company admin) or Employee
    if (decoded.type === 'employee') {
      console.log("🔍 Looking up employee with decoded data:", decoded);
      
      // FIXED: Try multiple lookup methods for employee
      user = await Employee.findOne({
        where: {
          [Op.or]: [
            { id: decoded.id },
            { employee_code: decoded.id },
            { email: decoded.email },
            { username: decoded.username }
          ]
        },
        attributes: { include: ['id', 'company_code', 'email', 'username', 'employee_code', 'role', 'status'] }
      });
      
      // Check if employee is active
      if (user && user.status !== 'active') {
        console.log("❌ Employee account is inactive:", user.status);
        return res.status(401).json({
          response: {
            status: { 
              statusCode: 401, 
              statusMessage: 'Account deactivated.' 
            },
            data: null
          }
        });
      }
    } else {
      console.log("🔍 Looking up user with decoded data:", decoded);
      
      // FIXED: Try multiple lookup methods for user
      user = await User.findOne({
        where: {
          [Op.or]: [
            { id: decoded.id },
            { email: decoded.email }
          ]
        },
        attributes: { include: ['id', 'company_code', 'email', 'name', 'is_active'] }
      });
      
      // Check if user is active
      if (user && !user.is_active) {
        console.log("❌ User account is inactive");
        return res.status(401).json({
          response: {
            status: { 
              statusCode: 401, 
              statusMessage: 'Account deactivated.' 
            },
            data: null
          }
        });
      }
    }

    if (!user) {
      console.log("❌ User not found for token - ID:", decoded.id, "Type:", decoded.type);
      console.log("❌ Attempted lookup with:", {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username
      });
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

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      company_code: user.company_code,
      name: user.name || user.username,
      type: decoded.type || 'user' // 'user' or 'employee'
    };

    // Add employee-specific fields if it's an employee
    if (decoded.type === 'employee') {
      req.user.employee_code = user.employee_code;
      req.user.role = user.role;
      req.user.username = user.username;
      req.user.status = user.status;
    }

    // Add user-specific fields if it's a user
    if (decoded.type === 'user') {
      req.user.is_active = user.is_active;
    }

    console.log("✅ User authenticated:", {
      id: req.user.id,
      email: req.user.email || req.user.username,
      company: req.user.company_code,
      type: req.user.type,
      role: req.user.role || 'admin'
    });
    
    next();
  } catch (error) {
    console.error("❌ AUTHENTICATION ERROR:", error);
    
    // Don't expose internal error details in production
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Authentication failed.' 
      : error.message;

    res.status(500).json({
      response: {
        status: { 
          statusCode: 500, 
          statusMessage: errorMessage
        },
        data: null
      }
    });
  }
};

// Middleware to require admin role (only company users, not employees)
const requireAdmin = (req, res, next) => {
  console.log("🔒 Checking admin privileges for:", req.user?.email || req.user?.username);
  
  if (!req.user || req.user.type !== 'user') {
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

// Middleware to check if user belongs to specific company
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

module.exports = { 
  authenticate, 
  requireAdmin, 
  requireEmployeeRole,
  requireCompanyAccess
};