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
      field: "itemid", // Changed from "itemId" to "itemid"
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
      field: "costprice", // Changed from "costPrice" to "costprice"
    },
    companyPrice: {
      type: DataTypes.DECIMAL(10, 2),
      field: "companyprice", // Changed from "companyPrice" to "companyprice"
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
      field: "barcode", // Changed from "barCode" to "barcode"
    },
    itemCode: {
      type: DataTypes.STRING,
      field: "itemcode", // Changed from "itemCode" to "itemcode"
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
      field: "expirydate", // Changed from "expiryDate" to "expirydate"
    },
    imgURL: {
      type: DataTypes.STRING,
      field: "imgurl", // Changed from "imgURL" to "imgurl"
    },
    // ========== IMAGEKIT FIELDS ==========
    imageKitFileId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "imagekitfileid", // Already correct
    },
    imageKitFilePath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "imagekitfilepath", // Already correct
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
      field: "weighttype", // Changed from "weightType" to "weighttype"
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
      field: "totalboxes", // Changed from "totalBoxes" to "totalboxes"
    },
    box: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "box",
    },
    piecesPerBox: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "piecesperbox", // Changed from "piecesPerBox" to "piecesperbox"
    },
    pricePerPiece: {
      type: DataTypes.DECIMAL(10, 2),
      field: "priceperpiece", // Changed from "pricePerPiece" to "priceperpiece"
    },
    saleLabel: {
      type: DataTypes.STRING,
      field: "salelabel", // Changed from "saleLabel" to "salelabel"
    },
    batchNumber: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: "batchnumber", // Changed from "batchNumber" to "batchnumber"
    },
    imeiNumbers: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: "imeinumbers", // Changed from "imeiNumbers" to "imeinumbers"
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
    indexes: [
      {
        unique: true,
        fields: ["company_code", "barcode"], // Changed "barCode" to "barcode"
        name: "uniq_company_barcode",
        where: {
          barcode: {
            // Changed "barCode" to "barcode"
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
            // If there's an error, just break and use the generated _id
            break;
          }
        }

        // Data cleaning and normalization
        item.barcode = normalizeEmptyToNull(item.barcode); // Changed barCode to barcode
        item.expirydate = normalizeEmptyToNull(item.expirydate); // Changed expiryDate to expirydate
        item.weighttype = normalizeToBoolean(item.weighttype); // Changed weightType to weighttype
        item.box = normalizeToBoolean(item.box);

        // Normalize numeric fields
        item.weight = normalizeToNumber(item.weight);
        item.discount = normalizeToNumber(item.discount);
        item.quantity = normalizeToInteger(item.quantity);
        item.minquantity = normalizeToInteger(item.minquantity);
        item.boxes = normalizeToInteger(item.boxes);
        item.packing = normalizeToInteger(item.packing);
        item.totalboxes = normalizeToInteger(item.totalboxes); // Changed totalBoxes to totalboxes
        item.piecesperbox = normalizeToInteger(item.piecesperbox); // Changed piecesPerBox to piecesperbox
        item.priceperpiece = normalizeToNumber(item.priceperpiece); // Changed pricePerPiece to priceperpiece

        // Handle ImageKit fields consistency
        if (
          item.imgurl && // Changed imgURL to imgurl
          !item.imagekitfileid && // Changed imageKitFileId to imagekitfileid
          !item.imgurl.includes("imagekit.io") // Changed imgURL to imgurl
        ) {
          item.imagekitfileid = null; // Changed imageKitFileId to imagekitfileid
          item.imagekitfilepath = null; // Changed imageKitFilePath to imagekitfilepath
        }

        const timestamp = Math.floor(Date.now() / 1000);
        item.created_at = timestamp;
        item.modified_at = timestamp;
      },

      beforeUpdate: async (item) => {
        // Data cleaning and normalization
        item.barcode = normalizeEmptyToNull(item.barcode); // Changed barCode to barcode
        item.expirydate = normalizeEmptyToNull(item.expirydate); // Changed expiryDate to expirydate
        item.weighttype = normalizeToBoolean(item.weighttype); // Changed weightType to weighttype
        item.box = normalizeToBoolean(item.box);

        // Normalize numeric fields
        item.weight = normalizeToNumber(item.weight);
        item.discount = normalizeToNumber(item.discount);
        item.quantity = normalizeToInteger(item.quantity);
        item.minquantity = normalizeToInteger(item.minquantity);
        item.boxes = normalizeToInteger(item.boxes);
        item.packing = normalizeToInteger(item.packing);
        item.totalboxes = normalizeToInteger(item.totalboxes); // Changed totalBoxes to totalboxes
        item.piecesperbox = normalizeToInteger(item.piecesperbox); // Changed piecesPerBox to piecesperbox
        item.priceperpiece = normalizeToNumber(item.priceperpiece); // Changed pricePerPiece to priceperpiece

        // Handle ImageKit fields consistency
        if (
          item.imgurl && // Changed imgURL to imgurl
          !item.imagekitfileid && // Changed imageKitFileId to imagekitfileid
          !item.imgurl.includes("imagekit.io") // Changed imgURL to imgurl
        ) {
          item.imagekitfileid = null; // Changed imageKitFileId to imagekitfileid
          item.imagekitfilepath = null; // Changed imageKitFilePath to imagekitfilepath
        }

        item.modified_at = Math.floor(Date.now() / 1000);
      },

      beforeSave: async (item) => {
        // Additional safety checks
        item.weighttype = normalizeToBoolean(item.weighttype); // Changed weightType to weighttype
        item.box = normalizeToBoolean(item.box);

        // Final ImageKit consistency check
        if (
          item.imgurl && // Changed imgURL to imgurl
          !item.imagekitfileid && // Changed imageKitFileId to imagekitfileid
          !item.imgurl.includes("imagekit.io") // Changed imgURL to imgurl
        ) {
          item.imagekitfileid = null; // Changed imageKitFileId to imagekitfileid
          item.imagekitfilepath = null; // Changed imageKitFilePath to imagekitfilepath
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
