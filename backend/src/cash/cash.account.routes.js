const express = require('express');
const { handleCashRequest, handleCashRequestEnhanced } = require('./cash.account.controller');

const router = express.Router();

/**
 * @route POST /api/cash
 * @description Main endpoint for all cash operations
 * @body {request: {method: string, data: object}}
 *
 * Supported Methods:
 * - getCashByCompany: Get cash account by company (auto-creates if not exists)
 * - getCashById: Get cash account by ID
 * - saveCash: Create new cash account
 * - updateCash: Update cash account
 * - deleteCash: Delete cash account
 * - updateCashBalance: Add/Subtract from cash balance
 * - getCashHistory: Get cash transaction history
 * - getCashInHandBankByCompany: Get cash in hand and bank accounts by company
 * - saveCashInHand: Save or update cash in hand balance for a company
 */
router.post('/', handleCashRequest);

/**
 * @route POST /api/cash/enhanced
 * @description Enhanced endpoint with additional utility methods
 * @body {request: {method: string, data: object}}
 *
 * Additional Methods:
 * - createCashAccountWithBalance: Create cash account with specific balance
 * - setCashAccountBalance: Set cash account balance directly
 *
 * All original methods are also supported
 */
router.post('/enhanced', handleCashRequestEnhanced);

/**
 * @route POST /api/cash/cash
 * @description Alternative endpoint for all cash operations (for backward compatibility)
 * @body {request: {method: string, data: object}}
 */
router.post('/cash', handleCashRequest);

module.exports = router;
