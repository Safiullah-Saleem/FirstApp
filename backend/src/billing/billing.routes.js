const express = require("express");
const {
  saveBills,
  saveSale,
  getAllBills,
  getBillById,
  getAllSales,
  getSalesReport,
  updateBill,
  updateSale,
  deleteBill,
  deleteSale
} = require("./billing.controller");

const router = express.Router();

// CREATE Routes
router.post("/saveBills", saveBills);
router.post("/saveSale", saveSale);

// READ Routes
router.get("/bills", getAllBills);
router.get("/bills/:id", getBillById);
router.get("/sales", getAllSales);
router.get("/sales/report", getSalesReport);

// UPDATE Routes
router.put("/bills/:id", updateBill);
router.put("/sales/:id", updateSale);

// DELETE Routes
router.delete("/bills/:id", deleteBill);
router.delete("/sales/:id", deleteSale);

module.exports = router;