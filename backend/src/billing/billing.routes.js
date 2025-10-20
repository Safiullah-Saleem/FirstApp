const express = require("express");
const {
  saveBills,
  saveSale,
} = require("./billing.controller");

const router = express.Router();

// Billing routes
router.post("/saveBills", saveBills);
router.post("/saveSale", saveSale);

module.exports = router;
