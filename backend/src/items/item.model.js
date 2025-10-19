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
      field: "itemId", // Database column is camelCase
    },
    _id: {
      type: DataTypes.STRING,
      unique: true,
      field: "_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "name",
    },
    description: {
      type: DataTypes.TEXT,
      field: "description",
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "price",
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 2),
      field: "costPrice", // Database column is camelCase
    },
    companyPrice: {
      type: DataTypes.DECIMAL(10, 2),
      field: "companyPrice", // Database column is camelCase
    },
    whole_sale_price: {
      type: DataTypes.DECIMAL(10, 2),
      field: "whole_sale_price",
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      field: "discount",
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "quantity",
    },
    minquantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "minquantity",
    },
    vendor: {
      type: DataTypes.STRING,
      field: "vendor",
    },
    unit: {
      type: DataTypes.STRING,
      field: "unit",
    },
    barCode: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      field: "barCode", // Database column is camelCase
    },
    itemCode: {
      type: DataTypes.STRING,
      field: "itemCode", // Database column is camelCase
    },
    category: {
      type: DataTypes.STRING,
      field: "category",
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "Active",
      field: "status",
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "expiryDate", // Database column is camelCase
    },
    imgURL: {
      type: DataTypes.STRING,
      field: "imgURL", // Database column is camelCase
    },
    // ========== IMAGEKIT FIELDS ==========
    imageKitFileId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "imageKitFileId", // Database column is camelCase
    },
    imageKitFilePath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "imageKitFilePath", // Database column is camelCase
    },
    // ========== END IMAGEKIT FIELDS ==========
    company_code: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "company_code",
    },
    shop_code: {
      type: DataTypes.STRING,
      field: "shop_code",
    },
    rack_code: {
      type: DataTypes.STRING,
      field: "rack_code",
    },
    sub_rack_code: {
      type: DataTypes.STRING,
      field: "sub_rack_code",
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      field: "weight",
    },
    weightType: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "weightType", // Database column is camelCase
    },
    boxes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "boxes",
    },
    packing: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "packing",
    },
    totalBoxes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "totalBoxes", // Database column is camelCase
    },
    box: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "box",
    },
    piecesPerBox: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "piecesPerBox", // Database column is camelCase
    },
    pricePerPiece: {
      type: DataTypes.DECIMAL(10, 2),
      field: "pricePerPiece", // Database column is camelCase
    },
    saleLabel: {
      type: DataTypes.STRING,
      field: "saleLabel", // Database column is camelCase
    },
    batchNumber: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: "batchNumber", // Database column is camelCase
    },
    imeiNumbers: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: "imeiNumbers", // Database column is camelCase
    },
    created_at: {
      type: DataTypes.BIGINT,
      defaultValue: () => Math.floor(Date.now() / 1000),
      field: "created_at",
    },
    modified_at: {
      type: DataTypes.BIGINT,
      defaultValue: () => Math.floor(Date.now() / 1000),
      field: "modified_at",
    },
  },
  {
    tableName: "items",
    timestamps: false,
    underscored: false, // Keep this as false since we're using explicit field mappings
    indexes: [
      {
        unique: true,
        fields: ["company_code", "barCode"], // Use model field name
        name: "uniq_company_barcode",
        where: {
          barCode: {
            [sequelize.Sequelize.Op.ne]: null,
          },
        },
      },
    ],
    hooks: {
      beforeCreate: async (item) => {
        const crypto = require("crypto");

        // Ensure globally unique _id
        if (!item._id) {
          item._id = crypto.randomBytes(16).toString("hex");
        }

        let attempts = 0;
        while (attempts < 5) {
          try {
            const exists = await Item.count({ where: { _id: item._id } });
            if (exists === 0) break;
            item._id = crypto.randomBytes(16).toString("hex");
            attempts++;
          } catch (error) {
            break;
          }
        }

        // Data cleaning and normalization - use model field names
        item.barCode = normalizeEmptyToNull(item.barCode);
        item.expiryDate = normalizeEmptyToNull(item.expiryDate);
        item.weightType = normalizeToBoolean(item.weightType);
        item.box = normalizeToBoolean(item.box);

        // Normalize numeric fields
        item.weight = normalizeToNumber(item.weight);
        item.discount = normalizeToNumber(item.discount);
        item.quantity = normalizeToInteger(item.quantity);
        item.minquantity = normalizeToInteger(item.minquantity);
        item.boxes = normalizeToInteger(item.boxes);
        item.packing = normalizeToInteger(item.packing);
        item.totalBoxes = normalizeToInteger(item.totalBoxes);
        item.piecesPerBox = normalizeToInteger(item.piecesPerBox);
        item.pricePerPiece = normalizeToNumber(item.pricePerPiece);

        // Handle ImageKit fields consistency
        if (
          item.imgURL &&
          !item.imageKitFileId &&
          !item.imgURL.includes("imagekit.io")
        ) {
          item.imageKitFileId = null;
          item.imageKitFilePath = null;
        }

        const timestamp = Math.floor(Date.now() / 1000);
        item.created_at = timestamp;
        item.modified_at = timestamp;
      },

      beforeUpdate: async (item) => {
        // Data cleaning and normalization - use model field names
        item.barCode = normalizeEmptyToNull(item.barCode);
        item.expiryDate = normalizeEmptyToNull(item.expiryDate);
        item.weightType = normalizeToBoolean(item.weightType);
        item.box = normalizeToBoolean(item.box);

        // Normalize numeric fields
        item.weight = normalizeToNumber(item.weight);
        item.discount = normalizeToNumber(item.discount);
        item.quantity = normalizeToInteger(item.quantity);
        item.minquantity = normalizeToInteger(item.minquantity);
        item.boxes = normalizeToInteger(item.boxes);
        item.packing = normalizeToInteger(item.packing);
        item.totalBoxes = normalizeToInteger(item.totalBoxes);
        item.piecesPerBox = normalizeToInteger(item.piecesPerBox);
        item.pricePerPiece = normalizeToNumber(item.pricePerPiece);

        // Handle ImageKit fields consistency
        if (
          item.imgURL &&
          !item.imageKitFileId &&
          !item.imgURL.includes("imagekit.io")
        ) {
          item.imageKitFileId = null;
          item.imageKitFilePath = null;
        }

        item.modified_at = Math.floor(Date.now() / 1000);
      },

      beforeSave: async (item) => {
        // Additional safety checks
        item.weightType = normalizeToBoolean(item.weightType);
        item.box = normalizeToBoolean(item.box);

        // Final ImageKit consistency check
        if (
          item.imgURL &&
          !item.imageKitFileId &&
          !item.imgURL.includes("imagekit.io")
        ) {
          item.imageKitFileId = null;
          item.imageKitFilePath = null;
        }
      },
    },
  }
);

// Helper functions for data normalization
function normalizeEmptyToNull(value) {
  if (
    value === "" ||
    value === '""' ||
    value === "null" ||
    value === "undefined"
  ) {
    return null;
  }
  return value;
}

function normalizeToBoolean(value) {
  if (value === undefined || value === null) return false;

  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value === "true" || value === "1" || value === "1.00";
  }
  if (typeof value === "number") {
    return Boolean(value);
  }
  return false;
}

function normalizeToNumber(value) {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function normalizeToInteger(value) {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return Math.floor(value);
  if (typeof value === "string") {
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

module.exports = Item;