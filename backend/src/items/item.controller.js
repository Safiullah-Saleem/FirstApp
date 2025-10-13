const Item = require("./item.model");
const ImageKitService = require("../services/imageKitService");
const multer = require("multer");

// Generate unique ID
const generateUniqueId = () => {
  return require("crypto").randomBytes(16).toString("hex");
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

// Save Item
const saveItem = async (req, res) => {
  try {
    console.log("=== SAVE ITEM ===");
    console.log("Request body:", req.body);
    console.log(
      "Uploaded file:",
      req.file ? `Yes - ${req.file.originalname}` : "No"
    );

    let itemData;
    let action;
    let userEmail;

    // Handle request format
    if (req.body.request && req.body.request.data) {
      itemData = req.body.request.data.item;
      action = req.body.request.data.action;
      userEmail = req.body.request.data.user;
    } else if (req.body.data) {
      itemData = req.body.data.item;
      action = req.body.data.action;
      userEmail = req.body.data.user;
    } else {
      itemData = req.body;
    }

    console.log("Item data:", itemData);
    console.log("Action:", action);
    console.log("User:", userEmail);

    const isUpdateIntent =
      !!(itemData && (itemData._id || itemData.itemId)) ||
      (typeof action === "string" && action.toLowerCase() === "updated");

    // Validation
    if (!itemData.company_code) {
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
      console.log("🖼️ Uploading image to ImageKit...");

      const fileName = `item_${Date.now()}_${
        itemData.name?.replace(/[^a-zA-Z0-9]/g, "_") || "image"
      }`;

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

      console.log("✅ Image uploaded successfully:", imageKitResult.data.url);

      // Add ImageKit URL to item data
      itemData.imgURL = imageKitResult.data.url;
      itemData.imageKitFileId = imageKitResult.data.fileId;
      itemData.imageKitFilePath = imageKitResult.data.filePath;
    }
    // ========== END IMAGE UPLOAD ==========

    // ✅ FIXED: Pre-check duplicates within the company (barcode and itemId) for CREATE only
    if (!isUpdateIntent) {
      const dupWhere = [];
      if (itemData.barCode) dupWhere.push({ barCode: itemData.barCode });
      if (itemData.itemId) dupWhere.push({ itemId: String(itemData.itemId) });

      if (dupWhere.length > 0) {
        const { Op } = require("sequelize");
        const duplicateItem = await Item.findOne({
          where: {
            company_code: itemData.company_code,
            [Op.or]: dupWhere,
          },
        });

        // ✅ CORRECT: Return error ONLY if duplicate IS found
        if (duplicateItem) {
          console.log("❌ Duplicate item found:", duplicateItem.toJSON());
          return res.status(409).json({
            response: {
              status: {
                statusCode: 409,
                statusMessage:
                  "Item with this barcode or itemId already exists for the company",
              },
              data: null,
            },
          });
        }
      }
    }

    // UPDATE flow via saveItem when _id/itemId present or action === "Updated"
    if (isUpdateIntent) {
      const { Op } = require("sequelize");
      const lookupId = itemData._id || itemData.itemId;
      const existing = await Item.findOne({
        where: {
          company_code: itemData.company_code,
          [Op.or]: [{ _id: lookupId }, { itemId: String(lookupId) }],
        },
      });
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

      // Duplicate checks if changing identifiers
      const updateDupWhere = [];
      if (itemData.barCode && itemData.barCode !== existing.barCode)
        updateDupWhere.push({ barCode: itemData.barCode });
      if (
        itemData.itemId &&
        String(itemData.itemId) !== String(existing.itemId)
      )
        updateDupWhere.push({ itemId: String(itemData.itemId) });
      if (updateDupWhere.length > 0) {
        const conflict = await Item.findOne({
          where: {
            company_code: itemData.company_code,
            [Op.or]: updateDupWhere,
          },
        });
        if (conflict) {
          return res.status(409).json({
            response: {
              status: {
                statusCode: 409,
                statusMessage:
                  "Item with this barcode or itemId already exists for the company",
              },
              data: null,
            },
          });
        }
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
      itemId:
        itemData.itemId || Math.floor(1000 + Math.random() * 9000).toString(),
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
      ? "Item with this barcode or itemId already exists for the company"
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
        [require("sequelize").Op.or]: [
          { id: id },
          { itemId: id },
          { _id: id },
          { barCode: id },
        ],
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
    console.log(
      "Uploaded file:",
      req.file ? `Yes - ${req.file.originalname}` : "No"
    );

    let itemData;
    let itemId;
    let companyCode;

    if (
      req.body.request &&
      req.body.request.data &&
      req.body.request.data.item
    ) {
      itemData = req.body.request.data.item;
      itemId =
        req.body.request.data.item._id || req.body.request.data.item.itemId;
      companyCode = req.body.request.data.item.company_code;
    } else if (req.body.data && req.body.data.item) {
      itemData = req.body.data.item;
      itemId = req.body.data.item._id || req.body.data.item.itemId;
      companyCode = req.body.data.item.company_code;
    } else {
      itemData = req.body;
      itemId = req.body._id || req.body.itemId;
      companyCode = req.body.company_code;
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

    const item = await Item.findOne({
      where: {
        ...(companyCode ? { company_code: companyCode } : {}),
        [require("sequelize").Op.or]: [{ _id: itemId }, { itemId: itemId }],
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

    // ========== IMAGE UPLOAD TO IMAGEKIT ==========
    if (req.file) {
      console.log("🖼️ Uploading new image to ImageKit...");

      const fileName = `item_${Date.now()}_${
        itemData.name?.replace(/[^a-zA-Z0-9]/g, "_") || "image"
      }`;

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

      console.log("✅ New image uploaded successfully");

      // Add ImageKit data to update
      itemData.imgURL = imageKitResult.data.url;
      itemData.imageKitFileId = imageKitResult.data.fileId;
      itemData.imageKitFilePath = imageKitResult.data.filePath;

      // Delete old image from ImageKit if exists
      if (item.imageKitFileId) {
        try {
          await ImageKitService.deleteImage(item.imageKitFileId);
          console.log("🗑️ Deleted old image from ImageKit");
        } catch (deleteError) {
          console.error("Failed to delete old image:", deleteError);
        }
      }
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

// Get Inventory (fetch all items for a company) - SUPER DEBUG VERSION
const getInventory = async (req, res) => {
  try {
    console.log("=== GET INVENTORY DEBUG ===");
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    console.log("Request query:", req.query);
    console.log("Request body:", req.body);
    console.log("Request params:", req.params);

    let companyCode;

    // Handle both GET and POST requests
    if (req.method === "GET") {
      companyCode = req.query.company_code;
      console.log("GET request - company_code from query:", companyCode);
    } else {
      // Handle POST request format
      if (req.body.request && req.body.request.data) {
        companyCode = req.body.request.data.company_code;
        console.log(
          "POST request - company_code from request.data:",
          companyCode
        );
      } else if (req.body.data) {
        companyCode = req.body.data.company_code;
        console.log("POST request - company_code from data:", companyCode);
      } else {
        companyCode = req.body.company_code;
        console.log("POST request - company_code from body:", companyCode);
      }
    }

    console.log("Final company code:", companyCode);

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

    console.log("🔍 Step 1: Checking if company exists...");

    // Step 1: Check if company exists in the database
    const User = require("../user/user.model");
    console.log("✅ User model imported");

    const company = await User.findOne({
      where: { company_code: companyCode },
      attributes: ["id", "company_code", "company_name"],
    });

    console.log("Company search result:", company ? company.toJSON() : "NULL");

    if (!company) {
      console.log("❌ Company not found in database");
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Company not found",
          },
          data: null,
        },
      });
    }

    console.log(`✅ Company found: ${company.company_name} (${companyCode})`);

    console.log("🔍 Step 2: Fetching items for company...");

    // Step 2: Fetch items for the validated company
    const items = await Item.findAll({
      where: { company_code: companyCode },
      order: [["created_at", "DESC"]],
    });

    console.log(`✅ Items found: ${items ? items.length : 0}`);

    // Step 3: Check if any items exist
    if (!items || items.length === 0) {
      console.log("❌ No items found for this company");
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "No inventory found for this company",
          },
          data: null,
        },
      });
    }

    console.log("🔍 Step 3: Serializing items...");

    // Step 4: Serialize items and return
    const serializedItems = items.map((item) => serializeItem(item));

    console.log(
      `🎉 Inventory fetched for company ${companyCode}: ${items.length} items`
    );

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: {
          inventory: serializedItems,
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
        itemId = wrapped._id || wrapped.itemId || wrapped.barCode || wrapped.id;
        companyCode = wrapped.company_code || companyCode;
      } else if (req.body && req.body.data && req.body.data.item) {
        const wrapped = req.body.data.item;
        itemId = wrapped._id || wrapped.itemId || wrapped.barCode || wrapped.id;
        companyCode = wrapped.company_code || companyCode;
      } else if (req.body) {
        const wrapped = req.body;
        itemId = wrapped._id || wrapped.itemId || wrapped.barCode || wrapped.id;
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
      [require("sequelize").Op.or]: [
        { _id: itemId },
        { itemId: itemId },
        { barCode: itemId },
        { id: itemId },
      ],
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
      try {
        await ImageKitService.deleteImage(item.imageKitFileId);
        console.log("🗑️ Deleted image from ImageKit");
      } catch (deleteError) {
        console.error("Failed to delete image from ImageKit:", deleteError);
      }
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
