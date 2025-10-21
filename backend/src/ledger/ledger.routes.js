const express = require("express");
const { getByCompany, saveLedger, deleteLedger, history } = require("./ledger.controller");

const router = express.Router();

router.get("/getByCompany", getByCompany);
router.post("/save", saveLedger);
router.delete("/delete", deleteLedger);
router.get("/history", history);

module.exports = router;


