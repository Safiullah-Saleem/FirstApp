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

        const timestamp = Math.floor(Date.now() / 1000);
        item.created_at = timestamp;
        item.modified_at = timestamp;
      },
      beforeUpdate: (item) => {
        // Convert empty barcode to null to avoid unique constraint issues
        if (item.barCode === "" || item.barCode === '""') {
          item.barCode = null;
        }

        // Convert empty expiryDate to null
        if (item.expiryDate === "" || item.expiryDate === "Invalid date") {
          item.expiryDate = null;
        }

        item.modified_at = Math.floor(Date.now() / 1000);
      },
    },
  }
);

module.exports = Item;
