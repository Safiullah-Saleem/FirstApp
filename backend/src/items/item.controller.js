const Item = require("./item.model");

// Generate unique ID
const generateUniqueId = () => {
  return require("crypto").randomBytes(16).toString("hex");
};

// Save Item
const saveItem = async (req, res) => {
  try {
    console.log("=== SAVE ITEM ===");
    console.log("Request body:", req.body);

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

    // Check required fields
    if (!itemData.name || !itemData.company_code) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Item name and company code are required",
          },
          data: null,
        },
      });
    }

    // Check if item already exists (by barcode or itemId)
    if (itemData.barCode) {
      const existingItem = await Item.findOne({
        where: {
          barCode: itemData.barCode,
          company_code: itemData.company_code,
        },
      });
      if (existingItem) {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: "Item with this barcode already exists",
            },
            data: null,
          },
        });
      }
    }

    // Create item
    const newItem = await Item.create({
      ...itemData,
      _id: itemData._id || generateUniqueId(),
      itemId:
        itemData.itemId || Math.floor(1000 + Math.random() * 9000).toString(),
    });

    console.log("Item created successfully:", newItem.name);

    // Prepare response
    const itemResponse = {
      ...newItem.toJSON(),
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
          items: items,
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

// Get Item by ID
const getItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findOne({
      where: {
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
        data: {
          item: item,
        },
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

// Update Item
const updateItem = async (req, res) => {
  try {
    console.log("=== UPDATE ITEM ===");

    let itemData;
    let itemId;

    if (
      req.body.request &&
      req.body.request.data &&
      req.body.request.data.item
    ) {
      itemData = req.body.request.data.item;
      itemId =
        req.body.request.data.item._id || req.body.request.data.item.itemId;
    } else if (req.body.data && req.body.data.item) {
      itemData = req.body.data.item;
      itemId = req.body.data.item._id || req.body.data.item.itemId;
    } else {
      itemData = req.body;
      itemId = req.body._id || req.body.itemId;
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

    await item.update(itemData);

    console.log("Item updated successfully:", item.name);

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Item updated successfully",
        },
        data: {
          item: item,
        },
      },
    });
  } catch (error) {
    console.error("UPDATE ITEM ERROR:", error);
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
};
