const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate JWT Token for User (Company Admin)
const generateToken = (user, type = 'user') => {
  const payload = {
    id: user.id,
    email: user.email,
    company_code: user.company_code,
    type: type // 'user' or 'employee' - CRITICAL FOR AUTH MIDDLEWARE
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback-secret-key-for-development',
    { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
  );
};

// Generate Token for Employee
const generateEmployeeToken = (employee) => {
  const payload = {
    id: employee.id,
    email: employee.email,
    company_code: employee.company_code,
    type: 'employee', // Explicitly set as employee
    employee_code: employee.employee_code,
    username: employee.username
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback-secret-key-for-development',
    { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
  );
};

// Verify Password
const verifyPassword = async (candidatePassword, hashedPassword) => {
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

// Verify Token (optional utility)
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-for-development');
  } catch (error) {
    throw new Error('Invalid token');
  }
};

module.exports = {
  generateToken,
  generateEmployeeToken,
  verifyPassword,
  verifyToken
};