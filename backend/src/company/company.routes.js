const express = require("express");
const { authenticate } = require("../middleware/auth"); // ADD AUTHENTICATION
const {
  updateCompany,
  getCompany,
  getCompanyByPath,
  updateCompanyPassword,
  getCurrentCompany // ADD THIS IMPORT
} = require("./company.controller");

const router = express.Router();

// ==================== PROTECTED COMPANY ROUTES ====================
// All routes require authentication

// Update company settings
router.put("/update", authenticate, updateCompany);

// Update company password  
router.put("/update-password", authenticate, updateCompanyPassword);

// Get company by POST request (with JSON payload)
router.post("/getCompany", authenticate, getCompany);

// Get company by path parameter
router.get("/:companyCode", authenticate, getCompanyByPath);

// ==================== ADDITIONAL OPTIMIZED ROUTES ====================
// Get current user's company (most common use case)
router.get("/", authenticate, getCurrentCompany);

// Alternative RESTful routes
router.get("/settings/current", authenticate, getCurrentCompany);
router.put("/settings", authenticate, updateCompany);

module.exports = router;
