const express = require("express");
const multer = require("multer");
const {
  saveItem,
  getAllItems,
  getItem,
  updateItem,
  deleteItem,
  getInventory,
  processSale,
  updateItemQuantityAfterSale,
  safeFindItem
} = require("./item.controller");

const {
  validateItem,
  validateSale,
  validateBatch,
  validateImei
} = require("./item.validation");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// ========== ITEM CRUD ROUTES ==========
router.post("/save", upload.single("file"), validateItem, saveItem);
router.get("/", getAllItems);
router.get("/inventory", getInventory);
router.post("/inventory", getInventory);
router.put("/update", upload.single("file"), validateItem, updateItem);
router.post("/delete", deleteItem);
router.get("/:id", getItem);
router.delete("/:id", deleteItem);

// ========== ENHANCED TRACKING ROUTES ==========
router.post("/process-sale", validateSale, processSale);

// ✅ Direct quantity update
router.post("/update-quantity", validateSale, async (req, res) => {
  try {
    const { itemId, companyCode, quantity, batchId, imeiNumbers, sizeVariant } = req.body;
    
    const options = { batchId, imeiNumbers, sizeVariant };
    const updatedItem = await updateItemQuantityAfterSale(itemId, companyCode, quantity, options);
    
    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Quantity updated successfully",
        },
        data: {
          item: updatedItem,
          updatedQuantity: quantity,
          trackingUsed: {
            batch: !!batchId,
            imei: !!(imeiNumbers && imeiNumbers.length > 0),
            size: !!sizeVariant
          }
        },
      },
    });
  } catch (error) {
    console.error("UPDATE QUANTITY ERROR:", error);
    res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: error.message,
        },
        data: null,
      },
    });
  }
});

// ========== BATCH-SPECIFIC ROUTES ==========

// ✅ Add batch to existing item
router.post("/batch/add", validateBatch, async (req, res) => {
  try {
    const { itemId, companyCode, batchData } = req.body;
    
    const item = await safeFindItem(itemId, companyCode);
    if (!item) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Item not found",
          },
          data: null,
        },
      });
    }

    const crypto = require("crypto");
    const updatedBatches = [...(item.batchNumber || []), {
      ...batchData,
      batchId: crypto.randomBytes(8).toString("hex"),
      created_at: Math.floor(Date.now() / 1000)
    }];

    await item.update({ batchNumber: updatedBatches });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Batch added successfully",
        },
        data: {
          item: item,
          batchCount: updatedBatches.length
        },
      },
    });
  } catch (error) {
    console.error("ADD BATCH ERROR:", error);
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error",
        },
        data: null,
      },
    });
  }
});

// ✅ Get batch by batch number
router.get("/batch/:batchNumber", async (req, res) => {
  try {
    const { batchNumber } = req.params;
    const { company_code } = req.query;

    if (!company_code) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Company code is required",
          },
          data: null,
        },
      });
    }

    // FIX: Import the model correctly
    const Item = require("./item.model");
    
    // Find all items with this batch number
    const items = await Item.findAll({
      where: {
        company_code: company_code,
        enableBatchTracking: true
      }
    });

    const itemsWithBatch = items.filter(item => 
      item.batchNumber && 
      item.batchNumber.some(batch => batch.batchNumber === batchNumber)
    );

    if (itemsWithBatch.length === 0) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Batch not found",
          },
          data: null,
        },
      });
    }

    // Extract batch details from all items
    const batchDetails = [];
    itemsWithBatch.forEach(item => {
      const batch = item.batchNumber.find(b => b.batchNumber === batchNumber);
      if (batch) {
        batchDetails.push({
          itemId: item._id,
          itemName: item.name,
          batch: batch,
          totalItemQuantity: item.quantity
        });
      }
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: {
          batchNumber: batchNumber,
          foundInItems: batchDetails.length,
          batchDetails: batchDetails
        },
      },
    });
  } catch (error) {
    console.error("GET BATCH ERROR:", error);
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error: " + error.message,
        },
        data: null,
      },
    });
  }
});

// ✅ Get item by batch ID
router.get("/batch/id/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;
    const { company_code } = req.query;

    if (!company_code) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Company code is required",
          },
          data: null,
        },
      });
    }

    // FIX: Import the model correctly
    const Item = require("./item.model");
    
    // Find all items
    const items = await Item.findAll({
      where: {
        company_code: company_code,
        enableBatchTracking: true
      }
    });

    // Find item containing this batch ID
    const itemWithBatch = items.find(item => 
      item.batchNumber && 
      item.batchNumber.some(batch => batch.batchId === batchId)
    );

    if (!itemWithBatch) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Batch ID not found",
          },
          data: null,
        },
      });
    }

    const batch = itemWithBatch.batchNumber.find(b => b.batchId === batchId);

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: {
          item: itemWithBatch,
          batch: batch
        },
      },
    });
  } catch (error) {
    console.error("GET BATCH BY ID ERROR:", error);
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error",
        },
        data: null,
      },
    });
  }
});

// ========== IMEI-SPECIFIC ROUTES ==========

// ✅ Add IMEI numbers to item
router.post("/imei/add", validateImei, async (req, res) => {
  try {
    const { itemId, companyCode, imeiNumbers } = req.body;
    
    const item = await safeFindItem(itemId, companyCode);
    if (!item) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Item not found",
          },
          data: null,
        },
      });
    }

    const updatedImeiNumbers = [...(item.imeiNumbers || []), ...imeiNumbers];
    await item.update({ 
      imeiNumbers: updatedImeiNumbers,
      quantity: updatedImeiNumbers.length
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "IMEI numbers added successfully",
        },
        data: {
          item: item,
          imeiCount: updatedImeiNumbers.length
        },
      },
    });
  } catch (error) {
    console.error("ADD IMEI ERROR:", error);
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error",
        },
        data: null,
      },
    });
  }
});

// ✅ Get item by IMEI number
router.get("/imei/:imeiNumber", async (req, res) => {
  try {
    const { imeiNumber } = req.params;
    const { company_code } = req.query;

    if (!company_code) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Company code is required",
          },
          data: null,
        },
      });
    }

    // FIX: Import the model correctly
    const Item = require("./item.model");
    
    // Find all items
    const items = await Item.findAll({
      where: {
        company_code: company_code,
        enableImeiTracking: true
      }
    });

    const itemWithImei = items.find(item => 
      item.imeiNumbers && 
      item.imeiNumbers.includes(imeiNumber)
    );

    if (!itemWithImei) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "IMEI number not found",
          },
          data: null,
        },
      });
    }

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: {
          item: itemWithImei,
          imeiInfo: {
            imeiNumber: imeiNumber,
            found: true,
            itemName: itemWithImei.name,
            itemPrice: itemWithImei.price,
            status: "Available"
          }
        },
      },
    });
  } catch (error) {
    console.error("GET IMEI ITEM ERROR:", error);
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error",
        },
        data: null,
      },
    });
  }
});

// ✅ Remove IMEI numbers
router.post("/imei/remove", async (req, res) => {
  try {
    const { itemId, companyCode, imeiNumbers } = req.body;
    
    if (!itemId || !companyCode || !imeiNumbers || !Array.isArray(imeiNumbers)) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Item ID, company code, and IMEI numbers array are required",
          },
          data: null,
        },
      });
    }

    const item = await safeFindItem(itemId, companyCode);
    if (!item) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Item not found",
          },
          data: null,
        },
      });
    }

    const updatedImeiNumbers = (item.imeiNumbers || []).filter(imei => !imeiNumbers.includes(imei));
    await item.update({ 
      imeiNumbers: updatedImeiNumbers,
      quantity: updatedImeiNumbers.length
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "IMEI numbers removed successfully",
        },
        data: {
          item: item,
          imeiCount: updatedImeiNumbers.length,
          removedCount: imeiNumbers.length
        },
      },
    });
  } catch (error) {
    console.error("REMOVE IMEI ERROR:", error);
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error",
        },
        data: null,
      },
    });
  }
});

// ========== SIZE VARIANT ROUTES ==========

// ✅ Update size variant
router.post("/size-variant/update", validateItem, async (req, res) => {
  try {
    const { itemId, companyCode, size, quantity, price } = req.body;
    
    const item = await safeFindItem(itemId, companyCode);
    if (!item) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Item not found",
          },
          data: null,
        },
      });
    }

    let updatedSizeVariants = [...(item.sizeVariants || [])];
    const existingVariantIndex = updatedSizeVariants.findIndex(v => v.size === size);
    
    if (existingVariantIndex >= 0) {
      updatedSizeVariants[existingVariantIndex] = {
        ...updatedSizeVariants[existingVariantIndex],
        quantity: quantity !== undefined ? quantity : updatedSizeVariants[existingVariantIndex].quantity,
        price: price !== undefined ? price : updatedSizeVariants[existingVariantIndex].price
      };
    } else {
      updatedSizeVariants.push({
        size,
        quantity: quantity || 0,
        price: price || item.price
      });
    }

    const totalQuantity = updatedSizeVariants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
    
    await item.update({ 
      sizeVariants: updatedSizeVariants,
      quantity: totalQuantity
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Size variant updated successfully",
        },
        data: {
          item: item,
          sizeVariants: updatedSizeVariants.length,
          totalQuantity
        },
      },
    });
  } catch (error) {
    console.error("UPDATE SIZE VARIANT ERROR:", error);
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error",
        },
        data: null,
      },
    });
  }
});

// ✅ Get items by size - Fixed version
router.get("/size/:size", async (req, res) => {
  try {
    const { size } = req.params;
    const { company_code } = req.query;

    console.log("📏 Size lookup:", { size, company_code });

    if (!company_code) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Company code is required",
          },
          data: null,
        },
      });
    }

    try {
      // Import the model correctly
      const Item = require("./item.model");
      
      // Find all items for this company
      const items = await Item.findAll({
        where: {
          company_code: company_code
        }
      });

      console.log("✅ Found total items:", items.length);

      // Debug: Check which items have size variants
      const itemsWithSizeVariants = items.filter(item => item.sizeVariants && Array.isArray(item.sizeVariants));
      console.log("📦 Items with size variants:", itemsWithSizeVariants.length);
      itemsWithSizeVariants.forEach(item => {
        console.log(`   - ${item.name}:`, item.sizeVariants);
      });

      // Find items with this size variant
      const itemsWithSize = items.filter(item => {
        if (!item.sizeVariants || !Array.isArray(item.sizeVariants)) return false;
        
        return item.sizeVariants.some(variant => {
          const variantSize = variant.size || variant.Size; // Handle different property names
          const variantQuantity = variant.quantity || variant.Quantity || 0;
          return variantSize === size && variantQuantity > 0;
        });
      });

      console.log("✅ Items with size", size + ":", itemsWithSize.length);

      const sizeItems = itemsWithSize.map(item => {
        const variant = item.sizeVariants.find(v => {
          const variantSize = v.size || v.Size;
          return variantSize === size;
        });
        
        const availableQuantity = variant ? (variant.quantity || variant.Quantity || 0) : 0;
        
        return {
          item: {
            _id: item._id,
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category,
            enableSizeTracking: item.enableSizeTracking
          },
          sizeVariant: variant,
          availableQuantity: availableQuantity
        };
      });

      res.json({
        response: {
          status: {
            statusCode: 200,
            statusMessage: "OK",
          },
          data: {
            size: size,
            totalItems: sizeItems.length,
            items: sizeItems
          },
        },
      });
    } catch (dbError) {
      console.log("Database error in size lookup:", dbError.message);
      return res.status(500).json({
        response: {
          status: {
            statusCode: 500,
            statusMessage: "Database error: " + dbError.message,
          },
          data: {
            error: dbError.message
          },
        },
      });
    }
  } catch (error) {
    console.error("GET ITEMS BY SIZE ERROR:", error);
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error: " + error.message,
        },
        data: {
          error: error.message
        },
      },
    });
  }
});

// ========== TRACKING DETAILS ROUTES ==========

// ✅ Get item with tracking details
router.get("/:id/tracking", async (req, res) => {
  try {
    const { id } = req.params;
    const { company_code } = req.query;

    const item = await safeFindItem(id, company_code);
    if (!item) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Item not found",
          },
          data: null,
        },
      });
    }

    const trackingInfo = {
      boxTracking: {
        enabled: item.enableBoxTracking,
        totalBoxes: item.totalBoxes,
        piecesPerBox: item.piecesPerBox,
        totalPieces: item.totalBoxes * item.piecesPerBox
      },
      batchTracking: {
        enabled: item.enableBatchTracking,
        batchCount: item.batchNumber ? item.batchNumber.length : 0,
        batches: item.batchNumber || []
      },
      imeiTracking: {
        enabled: item.enableImeiTracking,
        imeiCount: item.imeiNumbers ? item.imeiNumbers.length : 0,
        imeiNumbers: item.imeiNumbers || []
      },
      sizeTracking: {
        enabled: item.enableSizeTracking,
        sizeVariants: item.sizeVariants ? item.sizeVariants.length : 0,
        variants: item.sizeVariants || []
      }
    };

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: {
          item: item,
          tracking: trackingInfo
        },
      },
    });
  } catch (error) {
    console.error("GET TRACKING ERROR:", error);
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error",
        },
        data: null,
      },
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: 'File too large. Maximum size is 5MB.',
          },
          data: null,
        },
      });
    }
  } else if (error) {
    return res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: error.message,
        },
        data: null,
      },
    });
  }
  next();
});

module.exports = router;