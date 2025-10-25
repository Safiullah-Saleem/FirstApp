const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LedgerAccount = sequelize.define('LedgerAccount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'name'
  },
  company_code: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'company_code'
  },
  ledgerType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'ledger_type'
  },
  address: {
    type: DataTypes.STRING,
    defaultValue: "",
    field: 'address'
  },
  region: {
    type: DataTypes.STRING,
    defaultValue: "",
    field: 'region'
  },
  phone: {
    type: DataTypes.STRING,
    defaultValue: "",
    field: 'phone'
  },
  email: {
    type: DataTypes.STRING,
    defaultValue: "",
    field: 'email'
  },
  openingBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    field: 'opening_balance'
  },
  currentBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    field: 'current_balance'
  },
  saleTotal: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    field: 'sale_total'
  },
  depositedSalesTotal: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    field: 'deposited_sales_total'
  },
  purchasesTotal: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    field: 'purchases_total'
  },
  depositedPurchasesTotal: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    field: 'deposited_purchases_total'
  },
  created_at: {
    type: DataTypes.BIGINT,
    defaultValue: () => Math.floor(Date.now() / 1000),
    field: 'created_at'
  },
  modified_at: {
    type: DataTypes.BIGINT,
    defaultValue: () => Math.floor(Date.now() / 1000),
    field: 'modified_at'
  }
}, {
  tableName: 'ledger_accounts',
  timestamps: false,
  underscored: false
});

module.exports = LedgerAccount;
