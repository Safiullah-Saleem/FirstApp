const express = require("express");
const {
  // CREATE
  saveBills,
  saveSale,
  
  // READ
  getAllBills,
  getSaleHistory,
  getBillsByCompany,
  
  // UPDATE
  updateBill,
  updateSale,
  
  // DELETE
  deleteBill,
  deleteSale,
  
  // NEW
  returnSale
} = require("./billing.controller");

const router = express.Router();

// ===== CREATE ROUTES =====
router.post("/saveBills", saveBills);
router.post("/saveSale", saveSale);

// ===== READ ROUTES =====
router.get("/bills/company/:company_code", getAllBills); // Get all bills for company
router.get("/sale-history", getSaleHistory); // Get sale history with filters
router.get("/bills-by-company", getBillsByCompany); // Get bills by company with pagination

// ===== UPDATE ROUTES =====
router.put("/bill/:id", updateBill); // Update bill details
router.put("/sale/:id", updateSale); // Update sale details

// ===== DELETE ROUTES =====
router.delete("/bill/:id", deleteBill); // Delete bill and restore inventory
router.delete("/sale/:id", deleteSale); // Delete sale and restore inventory

// ===== NEW ROUTES =====
router.post("/return-sale", returnSale); // Return sale with balance reversal and inventory restoration

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
      "GET /api/billing/sale-history",
      "GET /api/billing/bills-by-company",
      "PUT /api/billing/bill/:id",
      "PUT /api/billing/sale/:id",
      "DELETE /api/billing/bill/:id",
      "DELETE /api/billing/sale/:id",
      "POST /api/billing/return-sale"
    ]
  });
});

module.exports = router;