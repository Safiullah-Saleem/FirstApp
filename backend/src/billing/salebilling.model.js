const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SaleBilling = sequelize.define(
  "SaleBilling",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bill_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'bills',
        key: 'id'
      }
    },
    company_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    item_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    item_code: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    unit: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    sale_price: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    cost_price: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    total_price: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    total_profit: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    discount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    vendor: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    selected_imei: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    batch_number: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    sale_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'pieces',
    },
    date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },
    timestamp: {
      type: DataTypes.BIGINT,
    },
    read_status: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    min_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    img_url: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    paid: {
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
    tableName: "sales", // Keep same table name for existing data
    timestamps: false,
    indexes: [
      {
        fields: ["company_code"],
        name: "idx_sales_company_code",
      },
      {
        fields: ["item_id"],
        name: "idx_sales_item_id",
      },
      {
        fields: ["date"],
        name: "idx_sales_date",
      },
      {
        fields: ["bill_id"],
        name: "idx_sales_bill_id",
      },
    ],
    hooks: {
      beforeUpdate: (saleBilling) => {
        saleBilling.modified_at = Math.floor(Date.now() / 1000);
      },
    },
  }
);

// Associations
SaleBilling.associate = function(models) {
  SaleBilling.belongsTo(models.Bill, {
    foreignKey: 'bill_id',
    as: 'bill'
  });
};

module.exports = SaleBilling;