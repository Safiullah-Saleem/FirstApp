const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const Ledger = require("../ledger/ledger.model");

const Transaction = sequelize.define(
  "Transaction",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    ledger_id: { type: DataTypes.BIGINT, allowNull: false },
    company_code: { type: DataTypes.STRING, allowNull: false },
    srNum: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.BIGINT, allowNull: false },
    detail: { type: DataTypes.TEXT, allowNull: true },
    totalAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    depositedAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    remainingAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    billNumber: { type: DataTypes.INTEGER, allowNull: true },
    isReturn: { type: DataTypes.BOOLEAN, defaultValue: false },
    type: { type: DataTypes.ENUM("invoice", "payment", "balance", "return"), allowNull: false, defaultValue: "invoice" },
    invoiceNumber: { type: DataTypes.STRING, allowNull: true },
    direction: { type: DataTypes.ENUM("sale", "purchase"), allowNull: false },
    created_at: { type: DataTypes.BIGINT, defaultValue: () => Math.floor(Date.now() / 1000) },
    modified_at: { type: DataTypes.BIGINT, defaultValue: () => Math.floor(Date.now() / 1000) },
  },
  {
    tableName: "transactions",
    timestamps: false,
    indexes: [
      { fields: ["company_code"] },
      { fields: ["ledger_id"] },
      { fields: ["date"] },
      { fields: ["direction"] },
      { fields: ["srNum"], unique: true },
    ],
  }
);

Ledger.hasMany(Transaction, { foreignKey: "ledger_id" });
Transaction.belongsTo(Ledger, { foreignKey: "ledger_id" });

module.exports = Transaction;


