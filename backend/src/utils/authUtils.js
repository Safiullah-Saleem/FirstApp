const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate JWT Token for User (Company Admin)
const generateToken = (user, type = 'user') => {
  console.log("🔐 GENERATING TOKEN - User ID:", user.id, "Type:", type);
  
  const payload = {
    id: user.id,
    email: user.email,
    company_code: user.company_code,
    type: type // 'user' or 'employee' - CRITICAL FOR AUTH MIDDLEWARE
  };

  // Add employee-specific fields
  if (type === 'employee') {
    payload.employee_code = user.employee_code;
    payload.username = user.username;
    payload.role = user.role;
    console.log("✅ Adding employee fields to token:", {
      employee_code: user.employee_code,
      username: user.username,
      role: user.role
    });
  }

  console.log("📦 Final token payload:", payload);

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback-secret-key-for-development',
    { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
  );

  console.log("✅ Token generated successfully");
  return token;
};

// Generate Token for Employee (Legacy function - use generateToken instead)
const generateEmployeeToken = (employee) => {
  console.log("🔐 GENERATING EMPLOYEE TOKEN - Employee ID:", employee.id);
  
  const payload = {
    id: employee.id,
    email: employee.email,
    company_code: employee.company_code,
    type: 'employee', // Explicitly set as employee
    employee_code: employee.employee_code,
    username: employee.username,
    role: employee.role
  };

  console.log("📦 Employee token payload:", payload);

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback-secret-key-for-development',
    { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
  );

  console.log("✅ Employee token generated successfully");
  return token;
};

// Verify Password
const verifyPassword = async (candidatePassword, hashedPassword) => {
  try {
    const isValid = await bcrypt.compare(candidatePassword, hashedPassword);
    console.log("🔐 Password verification:", isValid ? "VALID" : "INVALID");
    return isValid;
  } catch (error) {
    console.error("❌ Password verification error:", error);
    return false;
  }
};

// Verify Token (optional utility)
const verifyToken = (token) => {
  try {
    console.log("🔐 Verifying token...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-for-development');
    console.log("✅ Token verified - Type:", decoded.type, "ID:", decoded.id);
    return decoded;
  } catch (error) {
    console.error("❌ Token verification error:", error.message);
    throw new Error('Invalid token');
  }
};

// Decode token without verification (for debugging)
const decodeToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    console.log("🔍 Token decoded (without verification):", decoded);
    return decoded;
  } catch (error) {
    console.error("❌ Token decode error:", error.message);
    return null;
  }
};

// Check if token is expired
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = decoded.exp < currentTime;
    
    console.log("⏰ Token expiration check:", isExpired ? "EXPIRED" : "VALID");
    return isExpired;
  } catch (error) {
    console.error("❌ Token expiration check error:", error.message);
    return true;
  }
};

// Get token expiration time
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return null;
    
    const expirationDate = new Date(decoded.exp * 1000);
    const timeUntilExpiry = decoded.exp - Math.floor(Date.now() / 1000);
    
    return {
      expires_at: expirationDate,
      timestamp: decoded.exp,
      time_until_expiry_seconds: timeUntilExpiry,
      is_expired: timeUntilExpiry <= 0
    };
  } catch (error) {
    console.error("❌ Get token expiration error:", error.message);
    return null;
  }
};

// Generate hash password
const hashPassword = async (password) => {
  try {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log("🔐 Password hashed successfully");
    return hashedPassword;
  } catch (error) {
    console.error("❌ Password hashing error:", error);
    throw new Error('Password hashing failed');
  }
};

// Validate token structure (basic validation)
const validateTokenStructure = (token) => {
  try {
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      return { valid: false, error: "Invalid token format" };
    }
    
    const requiredFields = ['id', 'email', 'company_code', 'type'];
    const missingFields = requiredFields.filter(field => !decoded[field]);
    
    if (missingFields.length > 0) {
      return { 
        valid: false, 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      };
    }
    
    if (decoded.type === 'employee' && !decoded.employee_code) {
      return { 
        valid: false, 
        error: "Employee token missing employee_code" 
      };
    }
    
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// Token utility for debugging
const tokenDebugInfo = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded) {
      return { error: "Cannot decode token" };
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = decoded.exp && decoded.exp < currentTime;
    
    return {
      token_type: decoded.type,
      user_id: decoded.id,
      email: decoded.email,
      company_code: decoded.company_code,
      employee_code: decoded.employee_code,
      username: decoded.username,
      role: decoded.role,
      issued_at: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
      expires_at: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
      is_expired: isExpired,
      time_until_expiry: decoded.exp ? (decoded.exp - currentTime) : null
    };
  } catch (error) {
    return { error: error.message };
  }
};

module.exports = {
  generateToken,
  generateEmployeeToken,
  verifyPassword,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  hashPassword,
  validateTokenStructure,
  tokenDebugInfo
};