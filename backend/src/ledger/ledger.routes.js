const express = require("express");
const {
  createLedger,
  getAllLedgers,
  getLedgerDetails,
  getLedgerWithBanks,
  getLedgersByTypeWithBanks,
  updateLedger,
  deleteLedger,
  getLedgerSummary
} = require("./ledger.controller");

const router = express.Router();

// Ledger CRUD Routes
router.post("/", createLedger);
router.get("/", getAllLedgers);
router.get("/summary", getLedgerSummary);
router.get("/:id", getLedgerDetails);
router.get("/:id/banks", getLedgerWithBanks);
router.get("/type/:type/banks", getLedgersByTypeWithBanks);
router.put("/:id", updateLedger);
router.delete("/:id", deleteLedger);

module.exports = router;