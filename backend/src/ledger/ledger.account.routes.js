const express = require('express');
const { handleLedgerRequest } = require('./ledger.account.controller.js');

const router = express.Router();
router.post('/', handleLedgerRequest);
module.exports = router;
