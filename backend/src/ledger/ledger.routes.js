const express = require("express");
const { getByCompany, saveLedger, deleteLedger } = require("./ledger.controller");

const router = express.Router();

router.get("/getByCompany", getByCompany);
router.post("/save", saveLedger);
router.delete("/delete", deleteLedger);

module.exports = router;


