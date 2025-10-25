const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

// Import all models
const models = {};

// Dynamically import all model files
const modelFiles = [
  '../billing/purchase.model.js',
  '../billing/bill.model.js',
  '../billing/sale.model.js',
  '../user/user.model.js',
  '../employees/employee.model.js',
  '../bank/bank.account.model.js',
  '../bank/bank.transaction.model.js',
  '../cash/cash.account.model.js',
  '../cash/cash.transaction.model.js',
  '../items/item.model.js',
  '../ledger/ledger.account.model.js',
  '../ledger/ledger.transaction.model.js'
];

modelFiles.forEach(file => {
  try {
    const model = require(file);
    models[model.name] = model;
  } catch (error) {
    console.error(`Error loading model from ${file}:`, error.message);
  }
});

// Set up associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;
