const express = require("express");
const {
  // CREATE
  saveBills,
  saveSale,
  
  // READ
  getAllBills,
  
  // UPDATE
  updateBill,
  updateSale,
  
  // DELETE
  deleteBill,
  deleteSale
} = require("./billing.controller");

const router = express.Router();

// ===== CREATE ROUTES =====
router.post("/saveBills", saveBills);
router.post("/saveSale", saveSale);

// ===== READ ROUTES =====
router.get("/bills/company/:company_code", getAllBills); // Get all bills for company

// ===== UPDATE ROUTES =====
router.put("/bill/:id", updateBill); // Update bill details
router.put("/sale/:id", updateSale); // Update sale details

// ===== DELETE ROUTES =====
router.delete("/bill/:id", deleteBill); // Delete bill and restore inventory
router.delete("/sale/:id", deleteSale); // Delete sale and restore inventory

// ===== HEALTH CHECK ROUTE =====
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "billing-api",
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      "POST /api/billing/saveBills",
      "POST /api/billing/saveSale",
      "GET /api/billing/bills/company/:company_code",
      "PUT /api/billing/bill/:id",
      "PUT /api/billing/sale/:id",
      "DELETE /api/billing/bill/:id",
      "DELETE /api/billing/sale/:id"
    ]
  });
});

module.exports = router;