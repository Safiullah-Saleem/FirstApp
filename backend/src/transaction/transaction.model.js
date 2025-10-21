const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const Ledger = require("../ledger/ledger.model");

const Transaction = sequelize.define(
  "Transaction",
  {
    id: { 
      type: DataTypes.BIGINT, 
      autoIncrement: true, 
      primaryKey: true 
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "payment_method"
    },
    bankId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: "bank_id"
    },
    chequeNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "cheque_number"
    },
    ledgerId: { 
      type: DataTypes.BIGINT, 
      allowNull: false,
      field: "ledger_id" 
    },
    companyCode: { 
      type: DataTypes.STRING, 
      allowNull: false,
      field: "company_code" 
    },
    srNum: { 
      type: DataTypes.STRING, 
      allowNull: false,
      field: "sr_num" 
    },
    date: { 
      type: DataTypes.BIGINT, 
      allowNull: false 
    },
    detail: { 
      type: DataTypes.TEXT, 
      allowNull: true 
    },
    totalAmount: { 
      type: DataTypes.DECIMAL(18, 2), 
      allowNull: false, 
      defaultValue: 0,
      field: "total_amount" 
    },
    depositedAmount: { 
      type: DataTypes.DECIMAL(18, 2), 
      allowNull: false, 
      defaultValue: 0,
      field: "deposited_amount" 
    },
    remainingAmount: { 
      type: DataTypes.DECIMAL(18, 2), 
      allowNull: false, 
      defaultValue: 0,
      field: "remaining_amount" 
    },
    billNumber: { 
      type: DataTypes.INTEGER, 
      allowNull: true,
      field: "bill_number" 
    },
    isReturn: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false,
      field: "is_return" 
    },
    type: { 
      type: DataTypes.ENUM("invoice", "payment", "balance", "return"), 
      allowNull: false, 
      defaultValue: "invoice" 
    },
    invoiceNumber: { 
      type: DataTypes.STRING, 
      allowNull: true,
      field: "invoice_number" 
    },
    direction: { 
      type: DataTypes.ENUM("sale", "purchase"), 
      allowNull: false 
    },
    createdAt: { 
      type: DataTypes.BIGINT, 
      defaultValue: () => Math.floor(Date.now() / 1000),
      field: "created_at" 
    },
    modifiedAt: { 
      type: DataTypes.BIGINT, 
      defaultValue: () => Math.floor(Date.now() / 1000),
      field: "modified_at" 
    },
  },
  {
    tableName: "transactions",
    timestamps: false,
    indexes: [
      { fields: ["company_code"] },
      { fields: ["ledger_id"] },
      { fields: ["date"] },
      { fields: ["direction"] },
      { fields: ["sr_num"], unique: true },
      { fields: ["payment_method"] },
      { fields: ["bank_id"] },
    ],
  }
);

// Associations
Ledger.hasMany(Transaction, { foreignKey: "ledger_id" });
Transaction.belongsTo(Ledger, { foreignKey: "ledger_id" });

module.exports = Transaction;