const express = require("express");
const {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  deleteTransaction
} = require("./transaction.controller");

const router = express.Router();

// Transaction Routes
router.post("/", createTransaction);
router.get("/", getAllTransactions);
router.get("/:id", getTransactionById);
router.delete("/:id", deleteTransaction);

module.exports = router;