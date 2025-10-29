const Item = require("./item.model");
const ImageKitService = require("../services/imageKitService");
const multer = require("multer");
const { Op } = require("sequelize");
const crypto = require("crypto");

// Generate unique ID
const generateUniqueId = () => {
  return crypto.randomBytes(16).toString("hex");
};

// Remove null/undefined fields recursively from objects
const pruneNullFields = (value) => {
  if (Array.isArray(value)) {
    return value.map(pruneNullFields);
  }
  if (value && typeof value === "object") {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null || v === undefined) continue;
      const pruned = pruneNullFields(v);
      if (pruned !== null && pruned !== undefined) cleaned[k] = pruned;
    }
    return cleaned;
  }
  return value;
};

const serializeItem = (itemInstance) => {
  const plain =
    typeof itemInstance.toJSON === "function"
      ? itemInstance.toJSON()
      : itemInstance;
  return pruneNullFields(plain);
};

// Normalize incoming item data for batch and boxes/cotton variants
const normalizeItemData = (raw) => {
  const item = { ...raw };

  const toNumber = (v) =>
    v === undefined || v === null || v === "" ? undefined : Number(v);

  // Coerce common numeric fields
  const numericKeys = [
    "price",
    "costPrice",
    "companyPrice",
    "whole_sale_price",
    "discount",
    "quantity",
    "minquantity",
    "weight",
    "boxes",
    "packing",
    "totalBoxes",
    "piecesPerBox",
    "pricePerPiece",
  ];
  for (const key of numericKeys) {
    if (item[key] !== undefined) {
      const n = toNumber(item[key]);
      if (n !== undefined && !Number.isNaN(n)) item[key] = n;
    }
  }

  // Batch items: aggregate quantity and optionally override prices per newItem
  if (Array.isArray(item.batchNumber) && item.batchNumber.length > 0) {
    const totalQty = item.batchNumber.reduce(
      (sum, b) => sum + (toNumber(b.quantity) || 0),
      0
    );
    if (!item.quantity || item.quantity === 0) item.quantity = totalQty;

    // Use first batch's overrides if base pricing is empty/zero
    const first = item.batchNumber[0];
    if (first && first.newItem) {
      const overrides = first.newItem;
      const maybeApply = (field) => {
        const base = toNumber(item[field]);
        const over = toNumber(overrides[field]);
        if (
          (base === undefined || base === 0) &&
          over !== undefined &&
          !Number.isNaN(over)
        ) {
          item[field] = over;
        }
      };
      maybeApply("price");
      maybeApply("costPrice");
      maybeApply("companyPrice");
      maybeApply("whole_sale_price");
      if (!item.saleLabel && overrides.saleLabel)
        item.saleLabel = overrides.saleLabel;
    }

    // If batch carries box info, surface it to top-level
    const bWithBox = item.batchNumber.find(
      (b) => b && (b.box || b.piecesPerBox || b.pricePerPiece || b.totalBoxes)
    );
    if (bWithBox) {
      if (typeof bWithBox.box === "boolean") item.box = bWithBox.box;
      if (toNumber(bWithBox.piecesPerBox))
        item.piecesPerBox = toNumber(bWithBox.piecesPerBox);
      if (toNumber(bWithBox.pricePerPiece))
        item.pricePerPiece = toNumber(bWithBox.pricePerPiece);
      if (toNumber(bWithBox.totalBoxes))
        item.totalBoxes = toNumber(bWithBox.totalBoxes);
      // If quantity still missing but boxes present, compute
      if (
        (!item.quantity || item.quantity === 0) &&
        item.piecesPerBox &&
        item.totalBoxes
      ) {
        item.quantity = item.piecesPerBox * item.totalBoxes;
      }
    }
  }

  // Boxes/cotton (non-batch) normalization
  if (
    item.box === true &&
    item.piecesPerBox &&
    (item.totalBoxes || item.numberOfBoxes)
  ) {
    const totalBoxes = toNumber(item.totalBoxes || item.numberOfBoxes) || 0;
    const piecesPerBox = toNumber(item.piecesPerBox) || 0;
    if ((!item.quantity || item.quantity === 0) && totalBoxes && piecesPerBox) {
      item.quantity = totalBoxes * piecesPerBox;
    }
    if (!item.totalBoxes && totalBoxes) item.totalBoxes = totalBoxes;
    // If pricePerPiece provided and price missing/zero, compute price = pricePerPiece
    if ((!item.price || item.price === 0) && toNumber(item.pricePerPiece)) {
      item.price = toNumber(item.pricePerPiece);
    }
  }

  return item;
};

// Safe item lookup function that handles missing itemid column
const safeFindItem = async (lookupId, company_code) => {
  try {
    // First try with just _id (safe approach)
    return await Item.findOne({
      where: {
        _id: lookupId,
        company_code: company_code,
      },
    });
  } catch (error) {
    // If there's a database error, try alternative lookup methods
    if (error.name === "SequelizeDatabaseError") {
      console.warn(
        "Database error in item lookup, trying alternatives:",
        error.message
      );

      // Try with barcode
      const byBarcode = await Item.findOne({
        where: {
          barCode: lookupId,
          company_code: company_code,
        },
      });
      if (byBarcode) return byBarcode;

      // Try with numeric ID
      if (!isNaN(lookupId)) {
        const byId = await Item.findOne({
          where: {
            id: parseInt(lookupId),
            company_code: company_code,
          },
        });
        if (byId) return byId;
      }
    }
    throw error;
  }
};

// Safe duplicate check function
const safeDuplicateCheck = async (
  itemData,
  isUpdate = false,
  existingItem = null
) => {
  const dupWhere = [];

  // Check barcode duplicates
  if (itemData.barCode) {
    dupWhere.push({ barCode: itemData.barCode });
  }

  if (dupWhere.length > 0) {
    const duplicateItem = await Item.findOne({
      where: {
        company_code: itemData.company_code,
        [Op.or]: dupWhere,
      },
    });

    if (duplicateItem) {
      // For updates, allow if it's the same item being updated
      if (isUpdate && existingItem && duplicateItem._id === existingItem._id) {
        return null; // No conflict
      }
      return duplicateItem;
    }
  }

  return null;
};

// Save Item
const saveItem = async (req, res) => {
  try {
    console.log("=== SAVE ITEM ===");
    console.log("Content-Type:", req.get('Content-Type'));
    console.log("Request body:", req.body);
    console.log("Request fields:", req.body ? Object.keys(req.body) : 'No body');
    
    // 📁 Detailed file logging
    if (req.file) {
      console.log(`📁 File received: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);
      console.log(`📁 File buffer length: ${req.file.buffer ? req.file.buffer.length : 'No buffer'}`);
    } else {
      console.log("📁 No file uploaded");
    }

    let itemData;
    let action;
    let userEmail;
    let rawData;

    // Handle different content types
    const contentType = req.get('Content-Type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      console.log("📋 Processing multipart/form-data request");
      console.log("📋 Form fields available:", Object.keys(req.body));
      
      // Extract JSON from form fields
      if (req.body.data) {
        console.log("📋 Found 'data' field in form data");
        try {
          rawData = JSON.parse(req.body.data);
          console.log("📋 Successfully parsed JSON from form field");
        } catch (parseError) {
          console.error("❌ Failed to parse JSON from form field:", parseError.message);
          return res.status(400).json({
            response: {
              status: {
                statusCode: 400,
                statusMessage: "Invalid JSON in form data",
              },
              data: null,
            },
          });
        }
      } else {
        console.log("📋 No 'data' field found, using form fields directly");
        rawData = req.body;
      }
    } else {
      console.log("📋 Processing JSON request");
      rawData = req.body;
    }

    // Handle request format from parsed data
    if (rawData.request && rawData.request.data) {
      itemData = rawData.request.data.item;
      action = rawData.request.data.action;
      userEmail = rawData.request.data.user;
      console.log("📋 Using request.data format");
    } else if (rawData.data) {
      itemData = rawData.data.item;
      action = rawData.data.action;
      userEmail = rawData.data.user;
      console.log("📋 Using data format");
    } else {
      itemData = rawData;
      console.log("📋 Using direct format");
    }

    console.log("📋 Parsed item data:", itemData);
    console.log("📋 Action:", action);
    console.log("📋 User:", userEmail);

    const isUpdateIntent =
      !!(itemData && (itemData._id || itemData.itemId)) ||
      (typeof action === "string" && action.toLowerCase() === "updated");

    // ✅ FIXED: Get company code from authenticated user OR request body
    const companyCode = req.user?.company_code || itemData?.company_code;
    
    if (!companyCode) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Company code is required. Please authenticate or provide company_code in request.",
          },
          data: null,
        },
      });
    }

    // Ensure company_code is set in itemData
    if (itemData) {
      itemData.company_code = companyCode;
    }

    if (!isUpdateIntent && !itemData.name) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Item name is required",
          },
          data: null,
        },
      });
    }

    // ========== IMAGE UPLOAD TO IMAGEKIT ==========
    let imageKitResult = null;
    if (req.file) {
      console.log("🔄 Uploading to ImageKit...");
      console.log(`📁 Processing file: ${req.file.originalname}`);
      console.log(`📊 File size: ${req.file.size} bytes`);
      console.log(`🏷️ File type: ${req.file.mimetype}`);

      const fileName = `item_${Date.now()}_${
        itemData.name?.replace(/[^a-zA-Z0-9]/g, "_") || "image"
      }`;
      
      console.log(`📝 Generated filename: ${fileName}`);
      console.log(`🏢 Company code: ${itemData.company_code}`);

      imageKitResult = await ImageKitService.uploadImage(
        req.file,
        itemData.company_code,
        fileName
      );

      if (!imageKitResult.success) {
        console.error("❌ Image upload failed:", imageKitResult.error);
        return res.status(500).json({
          response: {
            status: {
              statusCode: 500,
              statusMessage: "Image upload failed",
            },
            data: null,
          },
        });
      }

      console.log("✅ Image uploaded: URL", imageKitResult.data.url);
      console.log(`🆔 File ID: ${imageKitResult.data.fileId}`);
      console.log(`📂 File Path: ${imageKitResult.data.filePath}`);

      // Add ImageKit URL to item data
      itemData.imgURL = imageKitResult.data.url;
      itemData.imageKitFileId = imageKitResult.data.fileId;
      itemData.imageKitFilePath = imageKitResult.data.filePath;
    } else {
      console.log("📁 No file uploaded - skipping image processing");
    }
    // ========== END IMAGE UPLOAD ==========

    // ✅ FIXED: Safe duplicate check for CREATE only
    if (!isUpdateIntent) {
      const duplicateItem = await safeDuplicateCheck(itemData, false);
      if (duplicateItem) {
        console.log("❌ Duplicate item found:", duplicateItem.toJSON());
        return res.status(409).json({
          response: {
            status: {
              statusCode: 409,
              statusMessage:
                "Item with this barcode already exists for the company",
            },
            data: null,
          },
        });
      }
    }

    // UPDATE flow via saveItem when _id/itemId present or action === "Updated"
    if (isUpdateIntent) {
      const lookupId = itemData._id || itemData.itemId;
      const existing = await safeFindItem(lookupId, itemData.company_code);

      if (!existing) {
        return res.status(404).json({
          response: {
            status: {
              statusCode: 404,
              statusMessage: "Item not found for update",
            },
            data: null,
          },
        });
      }

      // Safe duplicate checks if changing identifiers
      const duplicateItem = await safeDuplicateCheck(itemData, true, existing);
      if (duplicateItem) {
        return res.status(409).json({
          response: {
            status: {
              statusCode: 409,
              statusMessage:
                "Item with this barcode already exists for the company",
            },
            data: null,
          },
        });
      }

      // If updating with new image, delete old image from ImageKit
      if (req.file && existing.imageKitFileId) {
        try {
          await ImageKitService.deleteImage(existing.imageKitFileId);
          console.log("🗑️ Deleted old image from ImageKit");
        } catch (deleteError) {
          console.error("Failed to delete old image:", deleteError);
          // Continue with update even if delete fails
        }
      }

      const normalizedUpdate = normalizeItemData(itemData);
      await existing.update(normalizedUpdate);

      const itemResponse = {
        ...serializeItem(existing),
        action: action || "Updated",
        user: userEmail || "system",
      };

      return res.json({
        response: {
          status: {
            statusCode: 200,
            statusMessage: "Item updated successfully",
          },
          data: { item: itemResponse },
        },
      });
    }

    // Normalize variants (batch/boxes)
    const normalized = normalizeItemData(itemData);

    // Create item with retry on duplicate _id
    let newItem;
    let attempt = 0;
    let payload = {
      ...normalized,
      _id: itemData._id || generateUniqueId(),
      // Don't include itemId since column doesn't exist
    };

    while (attempt < 3) {
      try {
        newItem = await Item.create(payload);
        break;
      } catch (e) {
        const dupId =
          e &&
          (e.name === "SequelizeUniqueConstraintError" ||
            e.original?.code === "23505") &&
          String(e.original?.constraint || "").includes("_id");
        if (dupId) {
          payload._id = generateUniqueId();
          attempt++;
          continue;
        }
        throw e;
      }
    }

    console.log("✅ Item created successfully:", newItem.name);

    // Prepare response
    const itemResponse = {
      ...serializeItem(newItem),
      action: action || "Created",
      user: userEmail || "system",
    };

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Item saved successfully",
        },
        data: {
          item: itemResponse,
        },
      },
    });
  } catch (error) {
    console.error("SAVE ITEM ERROR:", error);

    // Handle multer file size limit error
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: "Image file too large. Maximum size is 2MB.",
            },
            data: null,
          },
        });
      }
    }

    const isUniqueViolation =
      error &&
      (error.name === "SequelizeUniqueConstraintError" ||
        error.original?.code === "23505");
    const isInvalidText = error && error.original?.code === "22P02"; // invalid_text_representation
    const isNotNullViolation = error && error.original?.code === "23502";
    const message = isUniqueViolation
      ? "Item with this barcode already exists for the company"
      : isInvalidText
      ? "Invalid value for numeric/date field"
      : isNotNullViolation
      ? "Missing required field"
      : "Internal server error";
    const statusCode = isUniqueViolation
      ? 409
      : isInvalidText || isNotNullViolation
      ? 400
      : 500;
    res.status(statusCode).json({
      response: {
        status: {
          statusCode,
          statusMessage: message,
        },
        data: null,
        ...(process.env.NODE_ENV !== "production"
          ? {
              debug: {
                name: error.name,
                code: error.original?.code,
                constraint: error.original?.constraint,
                detail: error.original?.detail,
                message: error.message,
              },
            }
          : {}),
      },
    });
  }
};

// Get All Items
const getAllItems = async (req, res) => {
  try {
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

    const items = await Item.findAll({
      where: { company_code },
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: {
          items: items.map(serializeItem),
        },
      },
    });
  } catch (error) {
    console.error("GET ITEMS ERROR:", error);
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
};

// Get Item by ID (scoped by company_code when provided)
const getItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_code } = req.query;

    const item = await Item.findOne({
      where: {
        ...(company_code ? { company_code } : {}),
        [Op.or]: [{ id: id }, { _id: id }, { barCode: id }],
      },
    });

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

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: { item: serializeItem(item) },
      },
    });
  } catch (error) {
    console.error("GET ITEM ERROR:", error);
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
};

// Update Item (scoped by company_code)
const updateItem = async (req, res) => {
  try {
    console.log("=== UPDATE ITEM ===");
    console.log("Content-Type:", req.get('Content-Type'));
    console.log("Request body:", req.body);
    console.log("Request fields:", req.body ? Object.keys(req.body) : 'No body');
    
    // 📁 Detailed file logging
    if (req.file) {
      console.log(`📁 File received: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);
      console.log(`📁 File buffer length: ${req.file.buffer ? req.file.buffer.length : 'No buffer'}`);
    } else {
      console.log("📁 No file uploaded");
    }

    let itemData;
    let itemId;
    let companyCode;
    let rawData;

    // Handle different content types
    const contentType = req.get('Content-Type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      console.log("📋 Processing multipart/form-data request");
      console.log("📋 Form fields available:", Object.keys(req.body));
      
      // Extract JSON from form fields
      if (req.body.data) {
        console.log("📋 Found 'data' field in form data");
        try {
          rawData = JSON.parse(req.body.data);
          console.log("📋 Successfully parsed JSON from form field");
        } catch (parseError) {
          console.error("❌ Failed to parse JSON from form field:", parseError.message);
          return res.status(400).json({
            response: {
              status: {
                statusCode: 400,
                statusMessage: "Invalid JSON in form data",
              },
              data: null,
            },
          });
        }
      } else {
        console.log("📋 No 'data' field found, using form fields directly");
        rawData = req.body;
      }
    } else {
      console.log("📋 Processing JSON request");
      rawData = req.body;
    }

    // Handle request format from parsed data
    if (rawData.request && rawData.request.data && rawData.request.data.item) {
      itemData = rawData.request.data.item;
      itemId = rawData.request.data.item._id;
      companyCode = rawData.request.data.item.company_code;
      console.log("📋 Using request.data format");
    } else if (rawData.data && rawData.data.item) {
      itemData = rawData.data.item;
      itemId = rawData.data.item._id;
      companyCode = rawData.data.item.company_code;
      console.log("📋 Using data format");
    } else {
      itemData = rawData;
      itemId = rawData._id;
      companyCode = rawData.company_code;
      console.log("📋 Using direct format");
    }

    console.log("📋 Parsed item data:", itemData);
    console.log("📋 Item ID:", itemId);
    console.log("📋 Company code:", companyCode);

    if (!itemId) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Item ID is required",
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

    // ========== IMAGE UPLOAD TO IMAGEKIT ==========
    if (req.file) {
      console.log("🔄 Uploading to ImageKit...");
      console.log(`📁 Processing file: ${req.file.originalname}`);
      console.log(`📊 File size: ${req.file.size} bytes`);
      console.log(`🏷️ File type: ${req.file.mimetype}`);

      const fileName = `item_${Date.now()}_${
        itemData.name?.replace(/[^a-zA-Z0-9]/g, "_") || "image"
      }`;
      
      console.log(`📝 Generated filename: ${fileName}`);
      console.log(`🏢 Company code: ${companyCode}`);

      const imageKitResult = await ImageKitService.uploadImage(
        req.file,
        companyCode,
        fileName
      );

      if (!imageKitResult.success) {
        console.error("❌ Image upload failed:", imageKitResult.error);
        return res.status(500).json({
          response: {
            status: {
              statusCode: 500,
              statusMessage: "Image upload failed",
            },
            data: null,
          },
        });
      }

      console.log("✅ Image uploaded: URL", imageKitResult.data.url);
      console.log(`🆔 File ID: ${imageKitResult.data.fileId}`);
      console.log(`📂 File Path: ${imageKitResult.data.filePath}`);

      // Add ImageKit data to update
      itemData.imgURL = imageKitResult.data.url;
      itemData.imageKitFileId = imageKitResult.data.fileId;
      itemData.imageKitFilePath = imageKitResult.data.filePath;

      // Delete old image from ImageKit if exists
      if (item.imageKitFileId) {
        console.log(`🗑️ Deleting old image: ${item.imageKitFileId}`);
        try {
          await ImageKitService.deleteImage(item.imageKitFileId);
          console.log("✅ Old image deleted from ImageKit");
        } catch (deleteError) {
          console.error("❌ Failed to delete old image:", deleteError);
        }
      } else {
        console.log("📁 No old image to delete");
      }
    } else {
      console.log("📁 No file uploaded - skipping image processing");
    }
    // ========== END IMAGE UPLOAD ==========

    // Normalize and update
    const normalized = normalizeItemData(itemData);
    await item.update(normalized);

    console.log("Item updated successfully:", item.name);

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Item updated successfully",
        },
        data: { item: serializeItem(item) },
      },
    });
  } catch (error) {
    console.error("UPDATE ITEM ERROR:", error);

    // Handle multer file size limit error
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: "Image file too large. Maximum size is 2MB.",
            },
            data: null,
          },
        });
      }
    }

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
};

// Get Inventory with Filters - UPDATED VERSION
const getInventory = async (req, res) => {
  try {
    console.log("=== GET INVENTORY WITH FILTERS ===");
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    console.log("Request query:", req.query);
    console.log("Request body:", req.body);

    let companyCode;
    let categoryFilter;
    let lowStockFilter;

    // Handle both GET and POST requests
    if (req.method === "GET") {
      companyCode = req.query.company_code;
      categoryFilter = req.query.category;
      lowStockFilter = req.query.lowStock === 'true';
      console.log("GET request - Filters:", { companyCode, categoryFilter, lowStockFilter });
    } else {
      // Handle POST request format
      if (req.body.request && req.body.request.data) {
        companyCode = req.body.request.data.company_code;
        categoryFilter = req.body.request.data.category;
        lowStockFilter = req.body.request.data.lowStock;
        console.log("POST request - Filters from request.data:", { companyCode, categoryFilter, lowStockFilter });
      } else if (req.body.data) {
        companyCode = req.body.data.company_code;
        categoryFilter = req.body.data.category;
        lowStockFilter = req.body.data.lowStock;
        console.log("POST request - Filters from data:", { companyCode, categoryFilter, lowStockFilter });
      } else {
        companyCode = req.body.company_code;
        categoryFilter = req.body.category;
        lowStockFilter = req.body.lowStock;
        console.log("POST request - Filters from body:", { companyCode, categoryFilter, lowStockFilter });
      }
    }

    console.log("Final filters:", { companyCode, categoryFilter, lowStockFilter });

    if (!companyCode) {
      console.log("❌ Company code is missing");
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

    // Build where conditions
    const whereConditions = { company_code: companyCode };

    // Add category filter if provided
    if (categoryFilter) {
      whereConditions.category = categoryFilter;
      console.log(`🔍 Filtering by category: ${categoryFilter}`);
    }

    // Add low stock filter if requested
    if (lowStockFilter) {
      whereConditions.quantity = {
        [Op.lte]: Sequelize.col('minStockLevel') // Quantity <= minStockLevel
      };
      console.log("🔍 Filtering low stock items");
    }

    console.log("🔍 Final where conditions:", whereConditions);

    // Fetch items with filters
    const items = await Item.findAll({
      where: whereConditions,
      order: [["created_at", "DESC"]],
    });

    console.log(`✅ Items found: ${items.length}`);

    if (items.length === 0) {
      console.log("❌ No items found for the given filters");
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "No inventory found for the given filters",
          },
          data: null,
        },
      });
    }

    // Serialize items and return
    const serializedItems = items.map((item) => serializeItem(item));

    console.log(`🎉 Inventory fetched with filters: ${items.length} items`);

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: {
          inventory: serializedItems,
          filters: {
            category: categoryFilter,
            lowStock: lowStockFilter,
            totalItems: items.length
          }
        },
      },
    });
  } catch (error) {
    console.error("❌ GET INVENTORY ERROR:", error);
    console.error("Error stack:", error.stack);
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
};

// Delete Item (supports path param or wrapped payload) and scoping by company_code
const deleteItem = async (req, res) => {
  try {
    console.log("=== DELETE ITEM ===");

    let itemId = req.params.id;
    let companyCode = req.query.company_code;

    if (!itemId) {
      if (
        req.body &&
        req.body.request &&
        req.body.request.data &&
        req.body.request.data.item
      ) {
        const wrapped = req.body.request.data.item;
        itemId = wrapped._id || wrapped.barCode || wrapped.id;
        companyCode = wrapped.company_code || companyCode;
      } else if (req.body && req.body.data && req.body.data.item) {
        const wrapped = req.body.data.item;
        itemId = wrapped._id || wrapped.barCode || wrapped.id;
        companyCode = wrapped.company_code || companyCode;
      } else if (req.body) {
        const wrapped = req.body;
        itemId = wrapped._id || wrapped.barCode || wrapped.id;
        companyCode = wrapped.company_code || companyCode;
      }
    }

    if (!itemId) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Item ID is required",
          },
          data: null,
        },
      });
    }

    const where = {
      [Op.or]: [{ _id: itemId }, { barCode: itemId }, { id: itemId }],
      ...(companyCode ? { company_code: companyCode } : {}),
    };

    const item = await Item.findOne({ where });
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

    // ========== DELETE IMAGE FROM IMAGEKIT ==========
    // Delete image from ImageKit if exists
    if (item.imageKitFileId) {
      console.log(`🗑️ Deleting image from ImageKit: ${item.imageKitFileId}`);
      try {
        await ImageKitService.deleteImage(item.imageKitFileId);
        console.log("✅ Image deleted from ImageKit successfully");
      } catch (deleteError) {
        console.error("❌ Failed to delete image from ImageKit:", deleteError);
      }
    } else {
      console.log("📁 No image to delete from ImageKit");
    }
    // ========== END IMAGE DELETION ==========

    await item.destroy();

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Item deleted successfully",
        },
        data: { id: itemId },
      },
    });
  } catch (error) {
    console.error("DELETE ITEM ERROR:", error);
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
};

module.exports = {
  saveItem,
  getAllItems,
  getItem,
  updateItem,
  deleteItem,
  getInventory,
};