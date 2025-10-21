const express = require('express');
const { handleBankRequest } = require('./bank.account.controller');

const router = express.Router();

/**
 * @route POST /api/bank
 * @description Main endpoint for all bank operations
 * @body {request: {method: string, data: object}}
 *
 * Supported Methods:
 * - getBanksByCompany: Get bank account by company
 * - getBankById: Get bank account by ID
 * - saveBank: Create new bank account
 * - updateBank: Update bank account
 * - deleteBank: Delete bank account
 * - getBankHistory: Get bank transaction history
 */
router.post('/', handleBankRequest);

/**
 * @route POST /api/bank/bank
 * @description Alternative endpoint for all bank operations (for backward compatibility)
 * @body {request: {method: string, data: object}}
 */
router.post('/bank', handleBankRequest);

module.exports = router;
