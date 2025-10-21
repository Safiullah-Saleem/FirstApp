const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Bank = sequelize.define(
  "Bank",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    company_code: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    account_number: { type: DataTypes.STRING, allowNull: true },
    branch: { type: DataTypes.STRING, allowNull: true },
    opening_balance: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    balance: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
    created_at: { type: DataTypes.BIGINT, defaultValue: () => Math.floor(Date.now() / 1000) },
    modified_at: { type: DataTypes.BIGINT, defaultValue: () => Math.floor(Date.now() / 1000) },
  },
  {
    tableName: "banks",
    timestamps: false,
    indexes: [
      { fields: ["company_code"] },
      { fields: ["name"] },
    ],
    hooks: {
      beforeUpdate: (bank) => {
        bank.modified_at = Math.floor(Date.now() / 1000);
      },
    },
  }
);

module.exports = Bank;


