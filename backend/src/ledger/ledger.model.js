const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Ledger = sequelize.define(
  "Ledger",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    _rev: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING, allowNull: false },
    company_code: { type: DataTypes.STRING, allowNull: false },
    ledgerType: { type: DataTypes.ENUM("customer", "supplier"), allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: true },
    region: { type: DataTypes.STRING, allowNull: true },
    phoneNo: { type: DataTypes.STRING, allowNull: true },
    created_at: { type: DataTypes.BIGINT, defaultValue: () => Math.floor(Date.now() / 1000) },
    modified_at: { type: DataTypes.BIGINT, defaultValue: () => Math.floor(Date.now() / 1000) },
    dueDate: { type: DataTypes.STRING, allowNull: true },

    saleTotal: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    purchaseTotal: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    depositedSalesTotal: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    depositedPurchaseTotal: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
  },
  {
    tableName: "ledgers",
    timestamps: false,
    indexes: [
      { fields: ["company_code"] },
      { fields: ["ledgerType"] },
      { fields: ["region"] },
      { fields: ["name"] },
    ],
  }
);

module.exports = Ledger;


