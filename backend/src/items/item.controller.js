const Item = require("./item.model");
const ImageKitService = require("../services/imageKitService");
const multer = require("multer");
const { Op, Sequelize } = require("sequelize");
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

// Enhanced Normalize function with ALL tracking types
const normalizeItemData = (raw) => {
  const item = { ...raw };

  const toNumber = (v) =>
    v === undefined || v === null || v === "" ? undefined : Number(v);

  // Coerce common numeric fields
  const numericKeys = [
    "price", "costPrice", "companyPrice", "whole_sale_price", "discount",
    "quantity", "minquantity", "weight", "boxes", "packing", "totalBoxes",
    "piecesPerBox", "pricePerPiece", "size", "size2", "size3"
  ];
  
  for (const key of numericKeys) {
    if (item[key] !== undefined) {
      const n = toNumber(item[key]);
      if (n !== undefined && !Number.isNaN(n)) item[key] = n;
    }
  }

  // ========== BOX TRACKING CONFIGURATION ==========
  if (item.enableBoxTracking) {
    console.log("📦 Box tracking enabled");
    
    if (item.box === true && item.piecesPerBox && (item.totalBoxes || item.numberOfBoxes)) {
      const totalBoxes = toNumber(item.totalBoxes || item.numberOfBoxes) || 0;
      const piecesPerBox = toNumber(item.piecesPerBox) || 0;
      
      // Calculate total quantity from boxes
      if ((!item.quantity || item.quantity === 0) && totalBoxes && piecesPerBox) {
        item.quantity = totalBoxes * piecesPerBox;
        console.log(`📊 Set quantity from boxes: ${item.quantity} = ${totalBoxes} × ${piecesPerBox}`);
      }
      
      if (!item.totalBoxes && totalBoxes) item.totalBoxes = totalBoxes;
      
      // Calculate price from price per piece if needed
      if ((!item.price || item.price === 0) && toNumber(item.pricePerPiece)) {
        item.price = toNumber(item.pricePerPiece);
      }
    }
  }

  // ========== BATCH NUMBER TRACKING ==========
  if (item.enableBatchTracking && Array.isArray(item.batchNumber) && item.batchNumber.length > 0) {
    console.log("🏷️ Batch tracking enabled with", item.batchNumber.length, "batches");
    
    // Calculate total quantity from all batches
    const totalQty = item.batchNumber.reduce(
      (sum, batch) => sum + (toNumber(batch.quantity) || 0),
      0
    );
    
    // Set total quantity if not provided or zero
    if (!item.quantity || item.quantity === 0) {
      item.quantity = totalQty;
      console.log(`📊 Set total quantity from batches: ${totalQty}`);
    }

    // Use first batch's overrides if base pricing is empty/zero
    const firstBatch = item.batchNumber[0];
    if (firstBatch && firstBatch.newItem) {
      const overrides = firstBatch.newItem;
      const maybeApply = (field) => {
        const base = toNumber(item[field]);
        const over = toNumber(overrides[field]);
        if ((base === undefined || base === 0) && over !== undefined && !Number.isNaN(over)) {
          item[field] = over;
        }
      };
      
      maybeApply("price");
      maybeApply("costPrice");
      maybeApply("companyPrice");
      maybeApply("whole_sale_price");
      
      if (!item.saleLabel && overrides.saleLabel) {
        item.saleLabel = overrides.saleLabel;
      }
    }

    // Handle batch-level box information
    const batchWithBoxInfo = item.batchNumber.find(
      (batch) => batch && (batch.box || batch.piecesPerBox || batch.pricePerPiece || batch.totalBoxes)
    );
    
    if (batchWithBoxInfo) {
      if (typeof batchWithBoxInfo.box === "boolean") item.box = batchWithBoxInfo.box;
      if (toNumber(batchWithBoxInfo.piecesPerBox)) item.piecesPerBox = toNumber(batchWithBoxInfo.piecesPerBox);
      if (toNumber(batchWithBoxInfo.pricePerPiece)) item.pricePerPiece = toNumber(batchWithBoxInfo.pricePerPiece);
      if (toNumber(batchWithBoxInfo.totalBoxes)) item.totalBoxes = toNumber(batchWithBoxInfo.totalBoxes);
      
      // Calculate quantity from boxes if still missing
      if ((!item.quantity || item.quantity === 0) && item.piecesPerBox && item.totalBoxes) {
        item.quantity = item.piecesPerBox * item.totalBoxes;
      }
    }
  }

  // ========== IMEI NUMBER TRACKING ==========
  if (item.enableImeiTracking && Array.isArray(item.imeiNumbers)) {
    console.log("📱 IMEI tracking enabled with", item.imeiNumbers.length, "IMEI numbers");
    
    // Set quantity based on IMEI numbers if not provided
    if ((!item.quantity || item.quantity === 0) && item.imeiNumbers.length > 0) {
      item.quantity = item.imeiNumbers.length;
      console.log(`📊 Set quantity from IMEI numbers: ${item.quantity}`);
    }
  }

  // ========== SIZE TRACKING ==========
  if (item.enableSizeTracking) {
    console.log("📏 Size tracking enabled");
    
    // Handle size variants if provided
    if (Array.isArray(item.sizeVariants) && item.sizeVariants.length > 0) {
      console.log(`📏 ${item.sizeVariants.length} size variants found`);
      
      // Calculate total quantity from size variants
      const totalSizeQty = item.sizeVariants.reduce(
        (sum, variant) => sum + (toNumber(variant.quantity) || 0),
        0
      );
      
      if ((!item.quantity || item.quantity === 0) && totalSizeQty > 0) {
        item.quantity = totalSizeQty;
        console.log(`📊 Set quantity from size variants: ${totalSizeQty}`);
      }
    }
  }

  console.log("✅ Normalized item with tracking:", {
    name: item.name,
    boxTracking: item.enableBoxTracking,
    batchTracking: item.enableBatchTracking,
    imeiTracking: item.enableImeiTracking,
    sizeTracking: item.enableSizeTracking,
    finalQuantity: item.quantity
  });

  return item;
};

// Safe item lookup function that handles missing itemid column
// Safe item lookup function that handles missing itemid column
const safeFindItem = async (lookupId, company_code) => {
  try {
    console.log("🔍 safeFindItem lookup:", { lookupId, company_code, type: typeof lookupId });

    // Convert to string for comparison
    const lookupStr = lookupId.toString();
    
    // **FIXED: Try numeric ID FIRST (this is what you're using in your API calls)**
    if (!isNaN(lookupId)) {
      console.log("🔍 Trying numeric ID lookup...");
      const byId = await Item.findOne({
        where: {
          id: parseInt(lookupId),
          company_code: company_code,
        },
      });
      if (byId) {
        console.log("✅ Found by numeric ID:", byId.id, byId.name);
        return byId;
      }
    }

    // Try with string _id (UUID format)
    console.log("🔍 Trying _id lookup...");
    const byUnderscoreId = await Item.findOne({
      where: {
        _id: lookupStr,
        company_code: company_code,
      },
    });
    if (byUnderscoreId) {
      console.log("✅ Found by _id:", byUnderscoreId.id, byUnderscoreId.name);
      return byUnderscoreId;
    }

    // Try with barcode as last resort
    console.log("🔍 Trying barcode lookup...");
    const byBarcode = await Item.findOne({
      where: {
        barCode: lookupStr,
        company_code: company_code,
      },
    });
    if (byBarcode) {
      console.log("✅ Found by barcode:", byBarcode.id, byBarcode.name);
      return byBarcode;
    }

    console.log("❌ Item not found with any method:", lookupId);
    return null;

  } catch (error) {
    console.error("❌ Database error in safeFindItem:", error.message);
    
    // Last resort fallback
    try {
      console.log("🔄 Using fallback search method...");
      const allItems = await Item.findAll({
        where: { company_code: company_code }
      });
      
      const lookupStr = lookupId.toString();
      
      // Manual search through all items
      const foundItem = allItems.find(item => {
        // Try numeric ID match
        if (!isNaN(lookupId) && item.id === parseInt(lookupId)) return true;
        // Try _id match
        if (item._id === lookupStr) return true;
        // Try barcode match
        if (item.barCode === lookupStr) return true;
        return false;
      });
      
      if (foundItem) {
        console.log("✅ Found in fallback search:", foundItem.id, foundItem.name);
        return foundItem;
      }
      
      console.log("❌ Item not found in fallback search");
      return null;
    } catch (fallbackError) {
      console.error("❌ Fallback search failed:", fallbackError.message);
      return null;
    }
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

// ========== QUANTITY MANAGEMENT FUNCTIONS ==========

// Process sale for REGULAR items
const processRegularItemSale = (item, soldQuantity) => {
  console.log(`🛒 Processing regular item sale: ${soldQuantity} units`);
  
  if (soldQuantity > item.quantity) {
    throw new Error(`Insufficient quantity. Available: ${item.quantity}, Requested: ${soldQuantity}`);
  }
  
  item.quantity -= soldQuantity;
  return item;
};

// Process sale for BOX/COTTON items
const processBoxItemSale = (item, soldQuantity) => {
  console.log(`📦 Processing box item sale: ${soldQuantity} pieces`);
  console.log(`📦 Before sale - Boxes: ${item.totalBoxes}, Pieces/Box: ${item.piecesPerBox}, Total Qty: ${item.quantity}`);
  
  const totalPiecesAvailable = item.quantity || (item.totalBoxes * item.piecesPerBox);
  
  if (soldQuantity > totalPiecesAvailable) {
    throw new Error(`Insufficient quantity. Available: ${totalPiecesAvailable}, Requested: ${soldQuantity}`);
  }
  
  const newTotalPieces = totalPiecesAvailable - soldQuantity;
  const newTotalBoxes = Math.floor(newTotalPieces / item.piecesPerBox);
  const remainingPieces = newTotalPieces % item.piecesPerBox;
  
  item.quantity = newTotalPieces;
  item.totalBoxes = newTotalBoxes;
  
  console.log(`📦 After sale - Boxes: ${newTotalBoxes}, Loose Pieces: ${remainingPieces}, Total Qty: ${newTotalPieces}`);
  
  return item;
};

// Process sale for BATCH items
const processBatchItemSale = async (item, soldQuantity, batchId = null) => {
  console.log(`🏷️ Processing batch item sale: ${soldQuantity} units`);
  
  if (!Array.isArray(item.batchNumber) || item.batchNumber.length === 0) {
    throw new Error("No batches available for this item");
  }

  let remainingToSell = soldQuantity;
  const updatedBatches = [...item.batchNumber];
  
  // If specific batch is provided, sell from that batch
  if (batchId) {
    const batchIndex = updatedBatches.findIndex(batch => batch.batchId === batchId);
    if (batchIndex === -1) {
      throw new Error(`Batch ${batchId} not found`);
    }
    
    const batch = updatedBatches[batchIndex];
    if (batch.quantity < remainingToSell) {
      throw new Error(`Insufficient quantity in batch ${batchId}. Available: ${batch.quantity}, Requested: ${remainingToSell}`);
    }
    
    batch.quantity -= remainingToSell;
    console.log(`🏷️ Sold ${remainingToSell} from batch ${batchId}. Remaining: ${batch.quantity}`);
  } else {
    // Sell from batches in order (FIFO)
    for (let i = 0; i < updatedBatches.length && remainingToSell > 0; i++) {
      const batch = updatedBatches[i];
      if (batch.quantity > 0) {
        const sellFromThisBatch = Math.min(batch.quantity, remainingToSell);
        batch.quantity -= sellFromThisBatch;
        remainingToSell -= sellFromThisBatch;
        console.log(`🏷️ Sold ${sellFromThisBatch} from batch ${batch.batchId}. Remaining: ${batch.quantity}`);
      }
    }
    
    if (remainingToSell > 0) {
      throw new Error(`Insufficient quantity across all batches. Could not sell ${remainingToSell} units`);
    }
  }
  
  // Calculate new total quantity
  const newTotalQuantity = updatedBatches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
  item.quantity = newTotalQuantity;
  item.batchNumber = updatedBatches;
  
  console.log(`🏷️ Batch sale completed. New total quantity: ${newTotalQuantity}`);
  return item;
};

// Process sale for IMEI tracked items
const processImeiItemSale = (item, soldQuantity, imeiNumbersToSell = []) => {
  console.log("📱 Processing IMEI item sale:", soldQuantity, "units");
  
  if (item.enableImeiTracking && Array.isArray(item.imeiNumbers)) {
    if (imeiNumbersToSell.length > 0) {
      // Remove specific IMEI numbers
      const remainingImeiNumbers = item.imeiNumbers.filter(
        imei => !imeiNumbersToSell.includes(imei)
      );
      
      if (remainingImeiNumbers.length !== item.imeiNumbers.length - imeiNumbersToSell.length) {
        throw new Error("Some IMEI numbers not found or already sold");
      }
      
      item.imeiNumbers = remainingImeiNumbers;
      item.quantity = remainingImeiNumbers.length;
    } else {
      // Sell quantity without specific IMEIs (sell from available IMEIs)
      if (soldQuantity > item.imeiNumbers.length) {
        throw new Error(`Insufficient IMEI items. Available: ${item.imeiNumbers.length}, Requested: ${soldQuantity}`);
      }
      
      // Remove first 'soldQuantity' IMEI numbers
      item.imeiNumbers = item.imeiNumbers.slice(soldQuantity);
      item.quantity = item.imeiNumbers.length;
    }
  } else {
    // Regular quantity deduction for non-IMEI items
    if (soldQuantity > item.quantity) {
      throw new Error(`Insufficient quantity. Available: ${item.quantity}, Requested: ${soldQuantity}`);
    }
    item.quantity -= soldQuantity;
  }
  
  return item;
};

// Process sale for Size tracked items
const processSizeItemSale = (item, soldQuantity, sizeVariant = null) => {
  console.log("📏 Processing size item sale:", soldQuantity, "units");
  
  if (item.enableSizeTracking && Array.isArray(item.sizeVariants) && sizeVariant) {
    // Find and update specific size variant
    const variantIndex = item.sizeVariants.findIndex(v => v.size === sizeVariant);
    if (variantIndex === -1) {
      throw new Error(`Size variant ${sizeVariant} not found`);
    }
    
    const variant = item.sizeVariants[variantIndex];
    if (soldQuantity > variant.quantity) {
      throw new Error(`Insufficient quantity for size ${sizeVariant}. Available: ${variant.quantity}, Requested: ${soldQuantity}`);
    }
    
    variant.quantity -= soldQuantity;
    
    // Recalculate total quantity
    item.quantity = item.sizeVariants.reduce((sum, v) => sum + (v.quantity || 0), 0);
  } else {
    // Regular quantity deduction
    if (soldQuantity > item.quantity) {
      throw new Error(`Insufficient quantity. Available: ${item.quantity}, Requested: ${soldQuantity}`);
    }
    item.quantity -= soldQuantity;
  }
  
  return item;
};

// MAIN QUANTITY UPDATE FUNCTION - HANDLES ALL TRACKING TYPES
const updateItemQuantityAfterSale = async (itemId, companyCode, soldQuantity, options = {}) => {
  try {
    const { batchId, imeiNumbers, sizeVariant } = options;
    
    const item = await safeFindItem(itemId, companyCode);
    if (!item) {
      throw new Error("Item not found");
    }

    console.log(`🛒 Processing sale for: ${item.name}`);
    console.log(`🔧 Tracking enabled - Box: ${item.enableBoxTracking}, Batch: ${item.enableBatchTracking}, IMEI: ${item.enableImeiTracking}, Size: ${item.enableSizeTracking}`);

    let updatedItem = { ...item.toJSON() };
    
    // PRIORITY: IMEI Tracking (most specific)
    if (item.enableImeiTracking && item.imeiNumbers && item.imeiNumbers.length > 0) {
      console.log("🔧 Using IMEI tracking");
      updatedItem = processImeiItemSale(updatedItem, soldQuantity, imeiNumbers);
    }
    // SIZE Tracking
    else if (item.enableSizeTracking && sizeVariant) {
      console.log("🔧 Using size tracking");
      updatedItem = processSizeItemSale(updatedItem, soldQuantity, sizeVariant);
    }
    // BATCH Tracking only
    else if (item.enableBatchTracking && Array.isArray(item.batchNumber) && item.batchNumber.length > 0) {
      console.log("🔧 Using batch tracking");
      updatedItem = await processBatchItemSale(updatedItem, soldQuantity, batchId);
    }
    // BOX Tracking only
    else if (item.enableBoxTracking && item.box && item.piecesPerBox) {
      console.log("🔧 Using box tracking");
      updatedItem = processBoxItemSale(updatedItem, soldQuantity);
    }
    // REGULAR item (no special tracking)
    else {
      console.log("🔧 Using regular quantity tracking");
      updatedItem = processRegularItemSale(updatedItem, soldQuantity);
    }

    await item.update(updatedItem);
    const finalItem = await safeFindItem(itemId, companyCode);
    
    console.log("✅ Sale completed. Final state:", {
      quantity: finalItem.quantity,
      boxes: finalItem.totalBoxes,
      batches: finalItem.batchNumber?.length,
      imeis: finalItem.imeiNumbers?.length,
      sizeVariants: finalItem.sizeVariants?.length
    });
    
    return finalItem;
    
  } catch (error) {
    console.error("Error updating item quantity after sale:", error);
    throw error;
  }
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

// Get Inventory with Filters - FIXED VERSION
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

    // ✅ FIXED: Changed from 'minStockLevel' to 'minquantity'
    if (lowStockFilter) {
      whereConditions.quantity = {
        [Op.lte]: Sequelize.col('minquantity') // Quantity <= minquantity
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


// ✅ NEW: Process Sale endpoint for all tracking types
// ✅ NEW: Process Sale endpoint for all tracking types - COMPLETE FIX
const processSale = async (req, res) => {
  try {
    console.log("=== PROCESS SALE WITH TRACKING ===");
    
    const { itemId, companyCode, quantity, batchId, imeiNumbers, sizeVariant } = req.body;
    
    if (!itemId || !companyCode || !quantity) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Item ID, company code, and quantity are required",
          },
          data: null,
        },
      });
    }

    console.log("🔍 Looking for item:", { itemId, companyCode });

    // **COMPLETE DIRECT LOOKUP - No safeFindItem at all**
    let item;
    try {
      // Try numeric ID first (this is what you're using - 39, 40, etc.)
      if (!isNaN(itemId)) {
        console.log("🔍 Trying numeric ID lookup...");
        item = await Item.findOne({
          where: {
            id: parseInt(itemId),
            company_code: companyCode,
          },
        });
      }
      
      // If numeric ID fails, try _id
      if (!item) {
        console.log("🔍 Trying _id lookup...");
        item = await Item.findOne({
          where: {
            _id: itemId.toString(),
            company_code: companyCode,
          },
        });
      }
    } catch (directError) {
      console.error("Direct lookup failed:", directError.message);
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: `Item not found with ID: ${itemId}`,
          },
          data: null,
        },
      });
    }

    if (!item) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: `Item not found with ID: ${itemId}`,
          },
          data: null,
        },
      });
    }

    console.log("✅ Item found successfully:", {
      id: item.id,
      name: item.name,
      box: item.box,
      enableBoxTracking: item.enableBoxTracking,
      totalBoxes: item.totalBoxes,
      piecesPerBox: item.piecesPerBox,
      currentQuantity: item.quantity
    });

    let updatedItem;

    // **CHECK FOR BOX TRACKING**
    if (item.box && item.enableBoxTracking && !batchId && (!imeiNumbers || imeiNumbers.length === 0) && !sizeVariant) {
      console.log("🔄 Processing sale with BOX TRACKING");
      
      // Calculate boxes from pieces sold
      const boxesSold = Math.ceil(quantity / item.piecesPerBox);
      const newTotalBoxes = Math.max(0, item.totalBoxes - boxesSold);
      const actualPiecesSold = boxesSold * item.piecesPerBox;
      const newQuantity = newTotalBoxes * item.piecesPerBox;
      
      console.log("📊 Box calculations:", {
        piecesSold: quantity,
        boxesSold: boxesSold,
        actualPiecesSold: actualPiecesSold,
        newTotalBoxes: newTotalBoxes,
        newQuantity: newQuantity
      });

      // Update item with new box and quantity values
      await item.update({ 
        quantity: newQuantity,
        totalBoxes: newTotalBoxes
      });

      // Reload the updated item using direct lookup
      updatedItem = await Item.findOne({
        where: { id: item.id, company_code: companyCode }
      });
      
      console.log("✅ Box tracking update complete:", {
        remainingBoxes: updatedItem.totalBoxes,
        remainingPieces: updatedItem.quantity
      });

    } else {
      // **STANDARD TRACKING - Use SIMPLE quantity reduction to avoid updateItemQuantityAfterSale**
      console.log("🔄 Processing sale with SIMPLE TRACKING");
      
      // Simple quantity reduction for all other cases
      const newQuantity = Math.max(0, item.quantity - quantity);
      await item.update({ 
        quantity: newQuantity
      });
      
      updatedItem = await Item.findOne({
        where: { id: item.id, company_code: companyCode }
      });
      
      console.log("✅ Simple tracking update complete:", {
        oldQuantity: item.quantity,
        newQuantity: updatedItem.quantity
      });
    }
    
    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Sale processed successfully",
        },
        data: {
          item: updatedItem,
          soldQuantity: quantity,
          trackingUsed: {
            batch: !!batchId,
            imei: !!(imeiNumbers && imeiNumbers.length > 0),
            size: !!sizeVariant,
            box: (item.box && item.enableBoxTracking && !batchId && (!imeiNumbers || imeiNumbers.length === 0) && !sizeVariant)
          },
          boxDetails: (item.box && item.enableBoxTracking && !batchId && (!imeiNumbers || imeiNumbers.length === 0) && !sizeVariant) ? {
            boxesSold: Math.ceil(quantity / item.piecesPerBox),
            piecesPerBox: item.piecesPerBox,
            remainingBoxes: updatedItem.totalBoxes,
            remainingPieces: updatedItem.quantity
          } : null
        },
      },
    });
  } catch (error) {
    console.error("PROCESS SALE ERROR:", error);
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
};

module.exports = {
  saveItem,
  getAllItems,
  getItem,
  updateItem,
  deleteItem,
  getInventory,
  processSale,
  updateItemQuantityAfterSale,
  normalizeItemData
};