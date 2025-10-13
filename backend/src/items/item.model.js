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
      // uniqueness is enforced per company via composite index below
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
      // Allow null values to avoid duplicate empty string issues
      allowNull: true,
      defaultValue: null,
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
      allowNull: true,
    },
    imgURL: {
      type: DataTypes.STRING,
    },
    // ========== IMAGEKIT FIELDS ADDED ==========
    imageKitFileId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imageKitFilePath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // ========== END IMAGEKIT FIELDS ==========
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
    box: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    piecesPerBox: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    pricePerPiece: {
      type: DataTypes.DECIMAL(10, 2),
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
    indexes: [
      {
        unique: true,
        fields: ["company_code", "barCode"],
        name: "uniq_company_barcode",
        where: {
          barCode: {
            [sequelize.Sequelize.Op.ne]: null, // Only enforce uniqueness for non-null barcodes
          },
        },
      },
      {
        unique: true,
        fields: ["company_code", "itemId"],
        name: "uniq_company_itemid",
      },
    ],
    hooks: {
      beforeCreate: async (item) => {
        // Generate unique itemId if not provided
        if (!item.itemId) {
          item.itemId = Math.floor(1000 + Math.random() * 9000).toString();
        }
        // Ensure globally unique _id (regenerate when duplicate)
        const crypto = require("crypto");
        if (!item._id) {
          item._id = crypto.randomBytes(16).toString("hex");
        }
        let attempts = 0;
        // Use the model itself inside hook to check uniqueness
        while (attempts < 5) {
          const exists = await Item.count({ where: { _id: item._id } });
          if (exists === 0) break;
          item._id = crypto.randomBytes(16).toString("hex");
          attempts++;
        }

        // Convert empty barcode to null to avoid unique constraint issues
        if (item.barCode === "" || item.barCode === '""') {
          item.barCode = null;
        }

        // Convert empty expiryDate to null
        if (item.expiryDate === "" || item.expiryDate === "Invalid date") {
          item.expiryDate = null;
        }

        // Convert weightType to proper boolean
        if (typeof item.weightType === "string") {
          item.weightType =
            item.weightType === "true" ||
            item.weightType === "1" ||
            item.weightType === "1.00";
        } else if (typeof item.weightType === "number") {
          item.weightType = Boolean(item.weightType);
        }

        // Convert box to proper boolean
        if (typeof item.box === "string") {
          item.box = item.box === "true" || item.box === "1";
        } else if (typeof item.box === "number") {
          item.box = Boolean(item.box);
        }

        // Handle ImageKit fields - ensure they are properly set
        if (item.imgURL && !item.imageKitFileId) {
          // If imgURL is provided but no ImageKit data, clear the ImageKit fields
          item.imageKitFileId = null;
          item.imageKitFilePath = null;
        }

        const timestamp = Math.floor(Date.now() / 1000);
        item.created_at = timestamp;
        item.modified_at = timestamp;
      },
      beforeUpdate: async (item) => {
        // Convert empty barcode to null to avoid unique constraint issues
        if (item.barCode === "" || item.barCode === '""') {
          item.barCode = null;
        }

        // Convert empty expiryDate to null
        if (item.expiryDate === "" || item.expiryDate === "Invalid date") {
          item.expiryDate = null;
        }

        // Convert weightType to proper boolean - FIXED
        if (typeof item.weightType === "string") {
          item.weightType =
            item.weightType === "true" ||
            item.weightType === "1" ||
            item.weightType === "1.00";
        } else if (typeof item.weightType === "number") {
          item.weightType = Boolean(item.weightType);
        }

        // Convert box to proper boolean
        if (typeof item.box === "string") {
          item.box = item.box === "true" || item.box === "1";
        } else if (typeof item.box === "number") {
          item.box = Boolean(item.box);
        }

        // Ensure numeric fields are properly converted
        if (item.weight && typeof item.weight === "string") {
          item.weight = parseFloat(item.weight) || 0;
        }

        if (item.discount && typeof item.discount === "string") {
          item.discount = parseFloat(item.discount) || 0;
        }

        if (item.quantity && typeof item.quantity === "string") {
          item.quantity = parseInt(item.quantity) || 0;
        }

        // Handle ImageKit fields consistency
        if (
          item.imgURL &&
          !item.imageKitFileId &&
          !item.imgURL.includes("imagekit.io")
        ) {
          // If imgURL is changed to non-ImageKit URL, clear ImageKit fields
          item.imageKitFileId = null;
          item.imageKitFilePath = null;
        }

        item.modified_at = Math.floor(Date.now() / 1000);
      },
      beforeSave: async (item) => {
        // Additional safety check for data types
        if (item.weightType !== undefined && item.weightType !== null) {
          if (typeof item.weightType === "string") {
            item.weightType =
              item.weightType === "true" ||
              item.weightType === "1" ||
              item.weightType === "1.00";
          }
        }

        // Ensure box is proper boolean
        if (item.box !== undefined && item.box !== null) {
          if (typeof item.box === "string") {
            item.box = item.box === "true" || item.box === "1";
          }
        }

        // Ensure ImageKit fields consistency
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

module.exports = Item;
