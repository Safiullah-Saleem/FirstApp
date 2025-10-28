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
      field: "itemId",
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
      field: "costPrice",
    },
    companyPrice: {
      type: DataTypes.DECIMAL(10, 2),
      field: "companyPrice",
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
      field: "barCode",
    },
    itemCode: {
      type: DataTypes.STRING,
      field: "itemCode",
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
      field: "expiryDate",
    },
    imgURL: {
      type: DataTypes.STRING,
      field: "imgURL",
    },
    
    // ========== IMAGEKIT FIELDS ==========
    imageKitFileId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "imagekitfileid",
    },
    imageKitFilePath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "imagekitfilepath",
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
      field: "weightType",
    },
    
    // ========== BOX TRACKING FIELDS ==========
    enableBoxTracking: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "enableBoxTracking",
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
      field: "totalBoxes",
    },
    box: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "box",
    },
    piecesPerBox: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "piecesPerBox",
    },
    pricePerPiece: {
      type: DataTypes.DECIMAL(10, 2),
      field: "pricePerPiece",
    },
    // ========== END BOX TRACKING FIELDS ==========
    
    // ========== BATCH TRACKING FIELDS ==========
    enableBatchTracking: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "enableBatchTracking",
    },
    batchNumber: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: "batchNumber",
    },
    // ========== END BATCH TRACKING FIELDS ==========
    
    // ========== IMEI TRACKING FIELDS ==========
    enableImeiTracking: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "enableImeiTracking",
    },
    imeiNumbers: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: "imeiNumbers",
    },
    // ========== END IMEI TRACKING FIELDS ==========
    
    // ========== SIZE TRACKING FIELDS ==========
    enableSizeTracking: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "enableSizeTracking",
    },
    size: {
      type: DataTypes.STRING,
      field: "size",
    },
    size2: {
      type: DataTypes.STRING,
      field: "size2",
    },
    size3: {
      type: DataTypes.STRING,
      field: "size3",
    },
    sizeVariants: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: "sizeVariants",
    },
    // ========== END SIZE TRACKING FIELDS ==========
    
    saleLabel: {
      type: DataTypes.STRING,
      field: "saleLabel",
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
    underscored: false,
    indexes: [
      {
        unique: true,
        fields: ["company_code", "barCode"],
        name: "uniq_company_barcode",
        where: {
          barCode: {
            [sequelize.Sequelize.Op.ne]: null,
          },
        },
      },
      {
        fields: ["enableBoxTracking"],
        name: "idx_box_tracking",
      },
      {
        fields: ["enableBatchTracking"],
        name: "idx_batch_tracking",
      },
      {
        fields: ["enableImeiTracking"],
        name: "idx_imei_tracking",
      },
      {
        fields: ["enableSizeTracking"],
        name: "idx_size_tracking",
      },
      {
        fields: ["company_code", "status"],
        name: "idx_company_status",
      },
    ],
    hooks: {
      beforeCreate: async (item) => {
        const crypto = require("crypto");

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

        // Normalize fields
        item.barCode = normalizeEmptyToNull(item.barCode);
        item.expiryDate = normalizeEmptyToNull(item.expiryDate);
        item.weightType = normalizeToBoolean(item.weightType);
        item.box = normalizeToBoolean(item.box);
        
        // Normalize tracking booleans
        item.enableBoxTracking = normalizeToBoolean(item.enableBoxTracking);
        item.enableBatchTracking = normalizeToBoolean(item.enableBatchTracking);
        item.enableImeiTracking = normalizeToBoolean(item.enableImeiTracking);
        item.enableSizeTracking = normalizeToBoolean(item.enableSizeTracking);

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

        // Handle ImageKit fields
        if (item.imgURL && !item.imageKitFileId && !item.imgURL.includes("imagekit.io")) {
          item.imageKitFileId = null;
          item.imageKitFilePath = null;
        }

        // Auto-calculate quantity based on tracking type
        item = autoCalculateQuantity(item);

        const timestamp = Math.floor(Date.now() / 1000);
        item.created_at = timestamp;
        item.modified_at = timestamp;
      },

      beforeUpdate: async (item) => {
        // Normalize fields
        item.barCode = normalizeEmptyToNull(item.barCode);
        item.expiryDate = normalizeEmptyToNull(item.expiryDate);
        item.weightType = normalizeToBoolean(item.weightType);
        item.box = normalizeToBoolean(item.box);
        
        // Normalize tracking booleans
        item.enableBoxTracking = normalizeToBoolean(item.enableBoxTracking);
        item.enableBatchTracking = normalizeToBoolean(item.enableBatchTracking);
        item.enableImeiTracking = normalizeToBoolean(item.enableImeiTracking);
        item.enableSizeTracking = normalizeToBoolean(item.enableSizeTracking);

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

        // Handle ImageKit fields
        if (item.imgURL && !item.imageKitFileId && !item.imgURL.includes("imagekit.io")) {
          item.imageKitFileId = null;
          item.imageKitFilePath = null;
        }

        // Auto-calculate quantity based on tracking type
        item = autoCalculateQuantity(item);

        item.modified_at = Math.floor(Date.now() / 1000);
      },

      beforeSave: async (item) => {
        item.weightType = normalizeToBoolean(item.weightType);
        item.box = normalizeToBoolean(item.box);
        
        // Normalize tracking booleans
        item.enableBoxTracking = normalizeToBoolean(item.enableBoxTracking);
        item.enableBatchTracking = normalizeToBoolean(item.enableBatchTracking);
        item.enableImeiTracking = normalizeToBoolean(item.enableImeiTracking);
        item.enableSizeTracking = normalizeToBoolean(item.enableSizeTracking);

        if (item.imgURL && !item.imageKitFileId && !item.imgURL.includes("imagekit.io")) {
          item.imageKitFileId = null;
          item.imageKitFilePath = null;
        }
        
        // Auto-calculate quantity based on tracking type
        item = autoCalculateQuantity(item);
      },
    },
  }
);

// ========== AUTO QUANTITY CALCULATION FUNCTION ==========
function autoCalculateQuantity(item) {
  let calculatedQuantity = item.quantity || 0;
  
  // Calculate from Box Tracking
  if (item.enableBoxTracking && item.box && item.piecesPerBox && item.totalBoxes) {
    const boxQuantity = item.totalBoxes * item.piecesPerBox;
    if (boxQuantity > calculatedQuantity) {
      calculatedQuantity = boxQuantity;
    }
  }
  
  // Calculate from Batch Tracking
  if (item.enableBatchTracking && Array.isArray(item.batchNumber) && item.batchNumber.length > 0) {
    const batchQuantity = item.batchNumber.reduce((sum, batch) => {
      return sum + (normalizeToInteger(batch.quantity) || 0);
    }, 0);
    if (batchQuantity > calculatedQuantity) {
      calculatedQuantity = batchQuantity;
    }
  }
  
  // Calculate from IMEI Tracking
  if (item.enableImeiTracking && Array.isArray(item.imeiNumbers) && item.imeiNumbers.length > 0) {
    const imeiQuantity = item.imeiNumbers.length;
    if (imeiQuantity > calculatedQuantity) {
      calculatedQuantity = imeiQuantity;
    }
  }
  
  // Calculate from Size Variants
  if (item.enableSizeTracking && Array.isArray(item.sizeVariants) && item.sizeVariants.length > 0) {
    const sizeQuantity = item.sizeVariants.reduce((sum, variant) => {
      return sum + (normalizeToInteger(variant.quantity) || 0);
    }, 0);
    if (sizeQuantity > calculatedQuantity) {
      calculatedQuantity = sizeQuantity;
    }
  }
  
  item.quantity = calculatedQuantity;
  return item;
}

// Helper functions
function normalizeEmptyToNull(value) {
  if (value === "" || value === '""' || value === "null" || value === "undefined") {
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

// ========== INSTANCE METHODS ==========
Item.prototype.getTrackingInfo = function() {
  return {
    boxTracking: {
      enabled: this.enableBoxTracking,
      totalBoxes: this.totalBoxes,
      piecesPerBox: this.piecesPerBox,
      totalPieces: this.totalBoxes * this.piecesPerBox
    },
    batchTracking: {
      enabled: this.enableBatchTracking,
      batchCount: this.batchNumber ? this.batchNumber.length : 0,
      totalBatchQuantity: this.batchNumber ? this.batchNumber.reduce((sum, batch) => sum + (batch.quantity || 0), 0) : 0
    },
    imeiTracking: {
      enabled: this.enableImeiTracking,
      imeiCount: this.imeiNumbers ? this.imeiNumbers.length : 0
    },
    sizeTracking: {
      enabled: this.enableSizeTracking,
      sizeVariants: this.sizeVariants ? this.sizeVariants.length : 0,
      totalSizeQuantity: this.sizeVariants ? this.sizeVariants.reduce((sum, variant) => sum + (variant.quantity || 0), 0) : 0
    }
  };
};

Item.prototype.getAvailableQuantity = function() {
  if (this.enableImeiTracking && this.imeiNumbers) {
    return this.imeiNumbers.length;
  }
  
  if (this.enableBoxTracking && this.box && this.piecesPerBox && this.totalBoxes) {
    return this.totalBoxes * this.piecesPerBox;
  }
  
  if (this.enableBatchTracking && this.batchNumber) {
    return this.batchNumber.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
  }
  
  if (this.enableSizeTracking && this.sizeVariants) {
    return this.sizeVariants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
  }
  
  return this.quantity || 0;
};

module.exports = Item;