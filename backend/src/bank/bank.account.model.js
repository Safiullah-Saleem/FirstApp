const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const BankAccount = sequelize.define('BankAccount', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  company_code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  accountNumber: {
    type: DataTypes.STRING
  },
  created_at: {
    type: DataTypes.BIGINT,
    defaultValue: () => Math.floor(Date.now() / 1000)
  },
  modified_at: {
    type: DataTypes.BIGINT,
    defaultValue: () => Math.floor(Date.now() / 1000)
  }
}, {
  tableName: 'bank_accounts',
  timestamps: false
});

module.exports = BankAccount;
