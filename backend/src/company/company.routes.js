const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  updateCompany,
  getCompany,
  getCompanyByPath,
  updateCompanyPassword,
  getCurrentCompany
} = require("./company.controller");

const router = express.Router();

// ==================== PROTECTED COMPANY ROUTES ====================

// Update company settings (support both PUT and POST)
router.put("/update", authenticate, updateCompany);
router.post("/update", authenticate, updateCompany); // ✅ ADDED POST BACK

// Update company password (support both PUT and POST)  
router.put("/update-password", authenticate, updateCompanyPassword);
router.post("/update-password", authenticate, updateCompanyPassword); // ✅ ADDED POST BACK

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
router.post("/settings", authenticate, updateCompany); // ✅ ADDED POST FOR CONSISTENCY

// ==================== DEBUG ROUTE ====================
router.get("/debug/routes", authenticate, (req, res) => {
  res.json({
    available_routes: [
      "POST /api/company/update",
      "PUT /api/company/update", 
      "POST /api/company/update-password",
      "PUT /api/company/update-password",
      "POST /api/company/getCompany",
      "GET /api/company/:companyCode",
      "GET /api/company/",
      "GET /api/company/settings/current",
      "PUT /api/company/settings",
      "POST /api/company/settings"
    ]
  });
});

module.exports = router;