const express = require("express");
const {
  createBank,
  getAllBanks,
  getBankById,
  updateBank,
  deleteBank
} = require("./bank.account.controller");

const router = express.Router();

// Bank CRUD Routes
router.post("/", createBank);
router.get("/", getAllBanks);
router.get("/:id", getBankById);
router.put("/:id", updateBank);
router.delete("/:id", deleteBank);

module.exports = router;
