const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Item = sequelize.define(
  "Item",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    itemId: {
      type: DataTypes.STRING,
      unique: true,
    },
    _id: {
      type: DataTypes.STRING,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 2),
    },
    companyPrice: {
      type: DataTypes.DECIMAL(10, 2),
    },
    whole_sale_price: {
      type: DataTypes.DECIMAL(10, 2),
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    minquantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    vendor: {
      type: DataTypes.STRING,
    },
    unit: {
      type: DataTypes.STRING,
    },
    barCode: {
      type: DataTypes.STRING,
      unique: true,
    },
    itemCode: {
      type: DataTypes.STRING,
    },
    category: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "Active",
    },
    expiryDate: {
      type: DataTypes.DATE,
    },
    imgURL: {
      type: DataTypes.STRING,
    },
    company_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    shop_code: {
      type: DataTypes.STRING,
    },
    rack_code: {
      type: DataTypes.STRING,
    },
    sub_rack_code: {
      type: DataTypes.STRING,
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
    },
    weightType: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    boxes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    packing: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalBoxes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    saleLabel: {
      type: DataTypes.STRING,
    },
    batchNumber: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    imeiNumbers: {
      type: DataTypes.JSON,
      defaultValue: [],
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
    tableName: "items",
    timestamps: false,
    hooks: {
      beforeCreate: async (item) => {
        // Generate unique itemId if not provided
        if (!item.itemId) {
          item.itemId = Math.floor(1000 + Math.random() * 9000).toString();
        }
        // Generate unique _id if not provided
        if (!item._id) {
          item._id = require("crypto").randomBytes(16).toString("hex");
        }

        const timestamp = Math.floor(Date.now() / 1000);
        item.created_at = timestamp;
        item.modified_at = timestamp;
      },
      beforeUpdate: (item) => {
        item.modified_at = Math.floor(Date.now() / 1000);
      },
    },
  }
);

module.exports = Item;
