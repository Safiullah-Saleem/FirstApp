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

// Remove validation imports if they don't exist, or create simple validators
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

// ========== TEST ROUTE ==========
router.get("/test", (req, res) => {
  res.json({
    message: "✅ Items API is working!",
    timestamp: new Date().toISOString(),
    routes: [
      "GET /api/items/test",
      "GET /api/items/",
      "GET /api/items/inventory", 
      "POST /api/items/inventory",
      "GET /api/items/:id",
      "GET /api/items/:id/tracking",
      "POST /api/items/save",
      "PUT /api/items/update",
      "DELETE /api/items/:id",
      "POST /api/items/delete",
      "POST /api/items/process-sale",
      "POST /api/items/update-quantity",
      "GET /api/items/batch/:batchNumber",
      "GET /api/items/batch/id/:batchId", 
      "POST /api/items/batch/add",
      "GET /api/items/imei/:imeiNumber",
      "POST /api/items/imei/add",
      "POST /api/items/imei/remove",
      "GET /api/items/size/:size",
      "POST /api/items/size-variant/update"
    ]
  });
});

// ========== ITEM CRUD ROUTES ==========
router.post("/save", upload.single("file"), saveItem);
router.get("/", getAllItems);
router.get("/inventory", getInventory);
router.post("/inventory", getInventory);
router.put("/update", upload.single("file"), updateItem);
router.get("/:id", getItem);

// ✅ FIXED: Only one delete route to avoid conflicts
router.delete("/:id", deleteItem);
router.post("/delete", deleteItem); // Alternative delete route

// ========== SALES & QUANTITY ROUTES ==========
router.post("/process-sale", processSale); // ✅ THIS EXISTS!
router.post("/update-quantity", updateItemQuantityAfterSale);

// ========== BATCH TRACKING ROUTES ==========
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

    const Item = require("./item.model");
    const items = await Item.findAll({
      where: { company_code: company_code }
    });

    const itemsWithBatch = items.filter(item => 
      item.batchNumber && 
      Array.isArray(item.batchNumber) &&
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

    const batchDetails = itemsWithBatch.map(item => {
      const batch = item.batchNumber.find(b => b.batchNumber === batchNumber);
      return {
        itemId: item._id,
        itemName: item.name,
        batch: batch,
        totalItemQuantity: item.quantity
      };
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
          statusMessage: "Internal server error",
        },
        data: null,
      },
    });
  }
});

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

    const Item = require("./item.model");
    const items = await Item.findAll({
      where: { company_code: company_code }
    });

    const itemWithBatch = items.find(item => 
      item.batchNumber && 
      Array.isArray(item.batchNumber) &&
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

router.post("/batch/add", async (req, res) => {
  try {
    const { itemId, companyCode, batchData } = req.body;
    
    if (!itemId || !companyCode || !batchData) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Item ID, company code, and batch data are required",
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

    const crypto = require("crypto");
    const updatedBatches = [...(item.batchNumber || []), {
      ...batchData,
      batchId: batchData.batchId || crypto.randomBytes(8).toString("hex"),
      created_at: Math.floor(Date.now() / 1000)
    }];

    // Calculate new total quantity
    const totalQuantity = updatedBatches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);

    await item.update({ 
      batchNumber: updatedBatches,
      quantity: totalQuantity,
      enableBatchTracking: true
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Batch added successfully",
        },
        data: {
          item: item,
          batchCount: updatedBatches.length,
          totalQuantity: totalQuantity
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

// ========== IMEI TRACKING ROUTES ==========
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

    const Item = require("./item.model");
    const items = await Item.findAll({
      where: { company_code: company_code }
    });

    const itemWithImei = items.find(item => 
      item.imeiNumbers && 
      Array.isArray(item.imeiNumbers) &&
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

router.post("/imei/add", async (req, res) => {
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

    const updatedImeiNumbers = [...new Set([...(item.imeiNumbers || []), ...imeiNumbers])];
    await item.update({ 
      imeiNumbers: updatedImeiNumbers,
      quantity: updatedImeiNumbers.length,
      enableImeiTracking: true
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "IMEI numbers added successfully",
        },
        data: {
          item: item,
          imeiCount: updatedImeiNumbers.length,
          addedCount: imeiNumbers.length
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

// ========== SIZE TRACKING ROUTES ==========
router.get("/size/:size", async (req, res) => {
  try {
    const { size } = req.params;
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

    const Item = require("./item.model");
    const items = await Item.findAll({
      where: { company_code: company_code }
    });

    const itemsWithSize = items.filter(item => 
      item.sizeVariants && 
      Array.isArray(item.sizeVariants) &&
      item.sizeVariants.some(variant => {
        const variantSize = variant.size || variant.Size;
        const variantQuantity = variant.quantity || variant.Quantity || 0;
        return variantSize === size && variantQuantity > 0;
      })
    );

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
  } catch (error) {
    console.error("GET ITEMS BY SIZE ERROR:", error);
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

router.post("/size-variant/update", async (req, res) => {
  try {
    const { itemId, companyCode, size, quantity, price } = req.body;
    
    if (!itemId || !companyCode || !size) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Item ID, company code, and size are required",
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
      quantity: totalQuantity,
      enableSizeTracking: true
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
          totalQuantity: totalQuantity
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

// ========== TRACKING DETAILS ROUTE ==========
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