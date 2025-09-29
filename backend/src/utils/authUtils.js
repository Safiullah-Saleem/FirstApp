const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      company_code: user.company_code,
    },
    process.env.JWT_SECRET, // This should now work
    { expiresIn: "30d" }
  );
};

// Verify Password
const verifyPassword = async (candidatePassword, hashedPassword) => {
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

module.exports = {
  generateToken,
  verifyPassword,
};
