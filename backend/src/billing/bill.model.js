const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Bill = sequelize.define(
  "Bill",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    company_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      references: {
        model: 'users',
        key: 'company_code'
      }
    },
    bill_number: {
      type: DataTypes.INTEGER,
    },
    customer: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    phone: {
      type: DataTypes.STRING(50),
      defaultValue: '',
    },
    seller: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },
    sub_total: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    discount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    paid: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    change_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    payment_method: {
      type: DataTypes.STRING(50),
      defaultValue: 'cash',
    },
    notes: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    warehouse_bill: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    store_bill: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    gst: {
      type: DataTypes.STRING(50),
      defaultValue: '',
    },
    bank_name: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    cheque: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    bank_id: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    ledger_id: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    ledger_address: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    discount_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'price',
    },
    formally_outstandings: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.BIGINT,
      defaultValue: () => Math.floor(Date.now() / 1000),
    },
    modified_at: {
      type: DataTypes.BIGINT,
      defaultValue: () => Math.floor(Date.now() / 1000),
    },
  },
  {
    tableName: "bills",
    timestamps: false,
    indexes: [
      {
        fields: ["company_code"],
        name: "idx_bills_company_code",
      },
      {
        fields: ["company_code", "bill_number"],
        name: "idx_bills_company_bill_number",
      },
      {
        fields: ["date"],
        name: "idx_bills_date",
      },
    ],
    hooks: {
      beforeUpdate: (bill) => {
        bill.modified_at = Math.floor(Date.now() / 1000);
      },
    },
  }
);

module.exports = Bill;
