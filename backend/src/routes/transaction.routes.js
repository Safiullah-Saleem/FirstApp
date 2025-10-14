const express = require("express");
const { addSale, addPurchase, addPayment, addReturn } = require("../controllers/transaction.controller");

const router = express.Router();

router.post("/addSale", addSale);
router.post("/addPurchase", addPurchase);
router.post("/addPayment", addPayment);
router.post("/addReturn", addReturn);

module.exports = router;


