const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CashAccount = sequelize.define('CashAccount', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: '_id' // Explicitly map to _id column
  },
  company_code: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'company_code'
  },
  cashName: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "cashInHand",
    field: 'cash_name' // Map camelCase property to snake_case column
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    field: 'balance'
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'date'
  },
  description: {
    type: DataTypes.STRING,
    defaultValue: "",
    field: 'description'
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
  tableName: 'cash_accounts',
  timestamps: false,
  underscored: false // Override global underscored setting for this model
});

module.exports = CashAccount;
