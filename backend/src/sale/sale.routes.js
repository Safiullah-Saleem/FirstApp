const express = require("express");
const {
  createSale,
  getAllSales,
  getSaleById,
  updateSale,
  deleteSale
} = require("./sale.controller");

const router = express.Router();

// Sale CRUD Routes
router.post("/", createSale);
router.get("/", getAllSales);
router.get("/:id", getSaleById);
router.put("/:id", updateSale);
router.delete("/:id", deleteSale);

module.exports = router;
