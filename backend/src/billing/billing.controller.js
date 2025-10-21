const { sequelize } = require("../config/database");
const User = require("../user/user.model");
const Item = require("../items/item.model");
const Bill = require("./bill.model");
const Sale = require("./sale.model");
const { Op } = require("sequelize");

// ===== CREATE OPERATIONS =====

// Save Bills API (CREATE)
const saveBills = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    console.log("=== SAVE BILLS ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // Extract bill data from request - handle both formats
    let billData = getBillDataFromRequest(req.body);

    if (!billData) {
      await transaction.rollback();
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Invalid request format",
          },
          data: null,
        },
      });
    }

    const { company_code, items, ...otherBillData } = billData;

    // Validate required fields
    if (!company_code) {
      await transaction.rollback();
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

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Items array is required and must not be empty",
          },
          data: null,
        },
      });
    }

    // Validate company exists
    const company = await User.findOne({
      where: { company_code },
      transaction,
    });

    if (!company) {
      await transaction.rollback();
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

    // Generate bill number if not provided
    let bill_number = otherBillData.billNumber;
    if (!bill_number) {
      const lastBill = await Bill.findOne({
        where: { company_code },
        order: [['bill_number', 'DESC']],
        transaction
      });
      bill_number = lastBill ? lastBill.bill_number + 1 : 1;
    }

    // Process inventory updates for each item
    console.log("Starting inventory updates...");
    for (const item of items) {
      await processInventoryUpdate(item, company_code, transaction);
    }

    // Save bill
    const savedBill = await Bill.create(
      {
        company_code,
        bill_number,
        customer: otherBillData.customer || "",
        phone: otherBillData.phone || "",
        seller: otherBillData.seller || "",
        date: otherBillData.date || new Date().toISOString().split("T")[0],
        sub_total: parseFloat(otherBillData.subTotal) || 0,
        discount: parseFloat(otherBillData.discount) || 0,
        total: parseFloat(otherBillData.total) || 0,
        paid: parseFloat(otherBillData.paid) || 0,
        change_amount: parseFloat(otherBillData.change) || 0,
        payment_method: otherBillData.paymentMethod || "cash",
        notes: otherBillData.notes || "",
        warehouse_bill: otherBillData.warehouseBill || false,
        store_bill: otherBillData.storeBill || false,
        gst: otherBillData.gst || "",
        bank_name: otherBillData.bankName || "",
        cheque: otherBillData.cheque || "",
        bank_id: otherBillData.bankId || "",
        ledger_id: otherBillData.ledger_id || "",
        ledger_address: otherBillData.ledger_address || "",
        discount_type: otherBillData.discount_type || "price",
        formally_outstandings: parseFloat(otherBillData.formallyOutstandings) || 0,
      },
      { transaction }
    );

    const billId = savedBill.id;

    // Insert each sold item into sales table
    for (const item of items) {
      await Sale.create(
        {
          bill_id: billId,
          company_code,
          item_id: String(getItemId(item)),
          name: item.name || item.productName || "",
          description: item.description || "",
          item_code: item.itemCode || item.code || "",
          category: item.category || "",
          unit: item.unit || "",
          quantity: item.saleQuantity || item.quantity || 1,
          sale_price: parseFloat(item.salePrice) || parseFloat(item.price) || 0,
          cost_price: parseFloat(item.costPrice) || 0,
          total_price: (parseFloat(item.salePrice) || parseFloat(item.price) || 0) * (item.saleQuantity || item.quantity || 1),
          discount: parseFloat(item.discount) || 0,
          vendor: item.vendor || "",
          selected_imei: item.selectedImei || "",
          batch_number: item.saleBatchNumber || item.batchNo || item.batchNumber || "",
          sale_type: item.saleType || "pieces",
        },
        { transaction }
      );
    }

    // Commit transaction
    await transaction.commit();
    console.log("Bill saved successfully with ID:", billId);

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Bill saved successfully",
        },
        data: {
          billId: billId,
          billNumber: bill_number,
          message: "Bill and inventory updated successfully",
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("SAVE BILLS ERROR:", error);
    
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error",
        },
        data: null,
        debug: {
          name: error.name,
          message: error.message,
        }
      },
    });
  }
};

// Save Sale API (CREATE)
const saveSale = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    console.log("=== SAVE SALE ===");
    
    // Extract sales data from request
    let salesData = getSalesDataFromRequest(req.body);

    if (!Array.isArray(salesData) || salesData.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Sales data must be a non-empty array",
          },
          data: null,
        },
      });
    }

    const results = [];

    for (const sale of salesData) {
      const { company_code } = sale;

      if (!company_code) {
        await transaction.rollback();
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: "Company code is required for each sale",
            },
            data: null,
          },
        });
      }

      const company = await User.findOne({
        where: { company_code },
        transaction,
      });

      if (!company) {
        await transaction.rollback();
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

      // Inventory update
      await processInventoryUpdateFromSale(sale, company_code, transaction);

      // Save sale
      const savedSale = await Sale.create(
        {
          company_code,
          item_id: String(getItemId(sale)),
          name: sale.name,
          description: sale.description || "",
          item_code: sale.itemCode || "",
          category: sale.category || "",
          unit: sale.unit || "",
          quantity: sale.quantity || 1,
          sale_price: parseFloat(sale.salePrice) || 0,
          cost_price: parseFloat(sale.price) || 0,
          total_price: parseFloat(sale.totalPrice) || 0,
          total_profit: parseFloat(sale.totalProfit) || 0,
          discount: parseFloat(sale.discount) || 0,
          vendor: sale.vendor || "",
          selected_imei: sale.selectedImei || "",
          date: sale.date || new Date().toISOString().split("T")[0],
          timestamp: sale.timestamp || Math.floor(Date.now() / 1000),
          read_status: sale.read === "true",
          min_quantity: sale.minQuantity || 0,
          img_url: sale.imgURL || "",
          paid: parseFloat(sale.paid) || 0,
        },
        { transaction }
      );

      results.push({
        saleId: savedSale.id,
        itemId: getItemId(sale),
        itemName: sale.name,
      });
    }

    await transaction.commit();
    
    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Sales saved successfully",
        },
        data: {
          sales: results,
          message: "Sales and inventory updated successfully",
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("SAVE SALE ERROR:", error);
    
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error",
        },
        data: null,
        debug: {
          name: error.name,
          message: error.message,
        }
      },
    });
  }
};

// ===== READ OPERATIONS =====

// Get all bills for a company
const getAllBills = async (req, res) => {
  try {
    const { company_code } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;

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

    const whereClause = { company_code };
    
    // Add date filter if provided
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows: bills } = await Bill.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Bills retrieved successfully",
        },
        data: {
          bills,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        },
      },
    });
  } catch (error) {
    console.error("GET ALL BILLS ERROR:", error);
    
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

// ===== UPDATE OPERATIONS =====

// Update bill
const updateBill = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const updateData = req.body;

    const bill = await Bill.findOne({
      where: { id: parseInt(id) },
      transaction
    });

    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Bill not found",
          },
          data: null,
        },
      });
    }

    // Update bill
    await bill.update(updateData, { transaction });

    await transaction.commit();

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Bill updated successfully",
        },
        data: {
          bill,
          message: "Bill updated successfully",
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("UPDATE BILL ERROR:", error);
    
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

// Update sale
const updateSale = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const updateData = req.body;

    const sale = await Sale.findOne({
      where: { id: parseInt(id) },
      transaction
    });

    if (!sale) {
      await transaction.rollback();
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Sale not found",
          },
          data: null,
        },
      });
    }

    // Update sale
    await sale.update(updateData, { transaction });

    await transaction.commit();

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Sale updated successfully",
        },
        data: {
          sale,
          message: "Sale updated successfully",
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("UPDATE SALE ERROR:", error);
    
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

// ===== DELETE OPERATIONS =====

// Delete bill (with inventory restoration)
const deleteBill = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { company_code } = req.body;

    if (!company_code) {
      await transaction.rollback();
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

    const bill = await Bill.findOne({
      where: { 
        id: parseInt(id),
        company_code 
      },
      transaction
    });

    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Bill not found",
          },
          data: null,
        },
      });
    }

    // Get sales for this bill to restore inventory
    const sales = await Sale.findAll({
      where: { bill_id: parseInt(id) },
      transaction
    });

    // Restore inventory for each sale item
    for (const sale of sales) {
      await restoreInventory(sale, company_code, transaction);
    }

    // Delete associated sales
    await Sale.destroy({
      where: { bill_id: parseInt(id) },
      transaction
    });

    // Delete the bill
    await Bill.destroy({
      where: { id: parseInt(id) },
      transaction
    });

    await transaction.commit();

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Bill deleted successfully",
        },
        data: {
          message: "Bill and associated sales deleted successfully. Inventory restored.",
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("DELETE BILL ERROR:", error);
    
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

// Delete sale
const deleteSale = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { company_code } = req.body;

    if (!company_code) {
      await transaction.rollback();
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

    const sale = await Sale.findOne({
      where: { 
        id: parseInt(id),
        company_code 
      },
      transaction
    });

    if (!sale) {
      await transaction.rollback();
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Sale not found",
          },
          data: null,
        },
      });
    }

    // Restore inventory
    await restoreInventory(sale, company_code, transaction);

    // Delete the sale
    await Sale.destroy({
      where: { id: parseInt(id) },
      transaction
    });

    await transaction.commit();

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Sale deleted successfully",
        },
        data: {
          message: "Sale deleted successfully. Inventory restored.",
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("DELETE SALE ERROR:", error);
    
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

// ===== HELPER FUNCTIONS =====

const getBillDataFromRequest = (body) => {
  if (body && body.request && body.request.data && body.request.data.bill) {
    return body.request.data.bill;
  } else if (body && (body.company_code || body.items)) {
    return body;
  }
  return null;
};

const getSalesDataFromRequest = (body) => {
  if (body && body.request && body.request.data && body.request.data.sales) {
    return body.request.data.sales;
  } else if (Array.isArray(body)) {
    return body;
  } else if (body && body.company_code && body.itemId) {
    return [body];
  }
  return null;
};

const getItemId = (item) => {
  const possibleIdFields = ['itemId', 'id', 'productId', 'item_id', 'product_id'];
  
  for (const field of possibleIdFields) {
    if (item[field] !== undefined && item[field] !== null) {
      console.log(`Found item ID in field '${field}':`, item[field]);
      return item[field];
    }
  }
  
  console.log('Available fields in item:', Object.keys(item));
  throw new Error(`Item ID not found. Available fields: ${Object.keys(item).join(', ')}`);
};

// ===== FIXED INVENTORY HELPER FUNCTIONS =====

const processInventoryUpdate = async (item, company_code, transaction) => {
  const itemId = getItemId(item);
  console.log("🔄 Processing inventory update for item ID:", itemId);
  console.log("📦 Full item data:", JSON.stringify(item, null, 2));

  // FIXED: Search by 'id' field (INTEGER) since that's what your item model uses
  const dbItem = await Item.findOne({
    where: {
      id: parseInt(itemId),  // ← CHANGED: Use 'id' field instead of 'itemId'
      company_code,
    },
    transaction,
  });

  if (!dbItem) {
    // Enhanced debugging
    console.error(`❌ Item with ID ${itemId} not found in database`);
    
    const availableItems = await Item.findAll({
      where: { company_code },
      attributes: ['id', 'itemId', 'name', 'quantity'],
      transaction
    });
    
    console.log('📋 Available items in database:');
    availableItems.forEach(avItem => {
      console.log(`   - id: ${avItem.id}, itemId: "${avItem.itemId}", name: "${avItem.name}", qty: ${avItem.quantity}`);
    });
    
    throw new Error(`Item with ID ${itemId} not found. Available items: ${availableItems.map(i => `id:${i.id}`).join(', ')}`);
  }

  console.log(`✅ Found item: ${dbItem.name}, Current quantity: ${dbItem.quantity}`);
  
  const saleQuantity = item.saleQuantity || item.quantity || 1;
  console.log(`🛒 Sale quantity: ${saleQuantity}`);

  if (item.selectedImei && item.selectedImei.trim() !== "") {
    await processImeiSale(dbItem, item.selectedImei, transaction);
  } else if (item.saleBatchNumber || item.batchNo || item.batchNumber) {
    await processBatchSale(dbItem, item, saleQuantity, transaction);
  } else {
    await processSimpleItemSale(dbItem, saleQuantity, transaction);
  }
};

const processInventoryUpdateFromSale = async (sale, company_code, transaction) => {
  const itemId = getItemId(sale);
  console.log("Processing inventory update for sale item:", itemId);

  // FIXED: Search by 'id' field
  const dbItem = await Item.findOne({
    where: {
      id: parseInt(itemId),  // ← CHANGED: Use 'id' field
      company_code,
    },
    transaction,
  });

  if (!dbItem) {
    console.error(`Item with ID ${itemId} not found in database for company ${company_code}`);
    throw new Error(`Item with ID ${itemId} not found`);
  }

  const saleQuantity = sale.quantity || 1;

  console.log(`Item found: ${dbItem.name}, current quantity: ${dbItem.quantity}, sale quantity: ${saleQuantity}`);

  if (sale.selectedImei && sale.selectedImei.trim() !== "") {
    await processImeiSale(dbItem, sale.selectedImei, transaction);
  } else {
    await processSimpleItemSale(dbItem, saleQuantity, transaction);
  }
};

const processSimpleItemSale = async (dbItem, saleQuantity, transaction) => {
  console.log(`Processing simple item sale: ${dbItem.id}, quantity: ${saleQuantity}`);

  if (dbItem.quantity < saleQuantity) {
    throw new Error(`Insufficient stock for item ${dbItem.id}. Available: ${dbItem.quantity}, Requested: ${saleQuantity}`);
  }

  const newQuantity = dbItem.quantity - saleQuantity;

  await dbItem.update(
    {
      quantity: newQuantity,
      modified_at: Math.floor(Date.now() / 1000),
    },
    { transaction }
  );

  await dbItem.reload({ transaction });
  console.log(`✅ Successfully updated item ${dbItem.id} quantity from ${dbItem.quantity + saleQuantity} to ${dbItem.quantity}`);
};

const processBatchSale = async (dbItem, item, saleQuantity, transaction) => {
  const batchNumber = item.saleBatchNumber || item.batchNo || item.batchNumber;
  const saleType = item.saleType || "pieces";

  console.log(`Processing batch sale: ${dbItem.id}, batch: ${batchNumber}, type: ${saleType}, quantity: ${saleQuantity}`);

  let batchNumbers = dbItem.batchNumber || [];
  if (typeof batchNumbers === "string") {
    try {
      batchNumbers = JSON.parse(batchNumbers);
    } catch {
      batchNumbers = [];
    }
  }

  const batchIndex = batchNumbers.findIndex(
    (batch) => batch.batchNumber === batchNumber
  );
  if (batchIndex === -1) throw new Error(`Batch ${batchNumber} not found`);

  const batch = batchNumbers[batchIndex];
  let quantityToDeduct = saleQuantity;

  if (saleType === "box" && batch.piecesPerBox) {
    quantityToDeduct = saleQuantity * batch.piecesPerBox;
  }

  if (batch.quantity < quantityToDeduct) throw new Error("Insufficient stock");

  batch.quantity -= quantityToDeduct;
  const newTotalQuantity = dbItem.quantity - quantityToDeduct;

  if (newTotalQuantity < 0) throw new Error("Insufficient stock");

  await dbItem.update(
    {
      quantity: newTotalQuantity,
      batchNumber: batchNumbers,
      modified_at: Math.floor(Date.now() / 1000),
    },
    { transaction }
  );

  await dbItem.reload({ transaction });
  console.log(`✅ Successfully updated batch ${batchNumber} quantity to ${batch.quantity}`);
  console.log(`✅ Successfully updated total item ${dbItem.id} quantity to ${dbItem.quantity}`);
};

const processImeiSale = async (dbItem, selectedImei, transaction) => {
  console.log(`Processing IMEI sale: ${dbItem.id}, IMEI: ${selectedImei}`);

  let imeiNumbers = dbItem.imeiNumbers || [];
  if (typeof imeiNumbers === "string") {
    try {
      imeiNumbers = JSON.parse(imeiNumbers);
    } catch {
      imeiNumbers = [];
    }
  }

  const imeiIndex = imeiNumbers.indexOf(selectedImei);
  if (imeiIndex === -1) throw new Error(`IMEI ${selectedImei} not found`);

  imeiNumbers.splice(imeiIndex, 1);

  const newQuantity = dbItem.quantity - 1;
  if (newQuantity < 0) throw new Error("Insufficient stock");

  await dbItem.update(
    {
      quantity: newQuantity,
      imeiNumbers,
      modified_at: Math.floor(Date.now() / 1000),
    },
    { transaction }
  );

  await dbItem.reload({ transaction });
  console.log(`✅ Successfully removed IMEI ${selectedImei} from item ${dbItem.id}`);
  console.log(`✅ Successfully updated item ${dbItem.id} quantity to ${dbItem.quantity}`);
};

// Restore inventory when deleting bills/sales
const restoreInventory = async (sale, company_code, transaction) => {
  // FIXED: Search by 'id' field
  const dbItem = await Item.findOne({
    where: {
      id: parseInt(sale.item_id),  // ← CHANGED: Use 'id' field
      company_code,
    },
    transaction,
  });

  if (dbItem) {
    const newQuantity = dbItem.quantity + sale.quantity;
    await dbItem.update(
      {
        quantity: newQuantity,
        modified_at: Math.floor(Date.now() / 1000),
      },
      { transaction }
    );
    console.log(`✅ Restored ${sale.quantity} units to item ${sale.item_id}`);
  }
};

module.exports = {
  // CREATE
  saveBills,
  saveSale,
  
  // READ
  getAllBills,
  
  // UPDATE
  updateBill,
  updateSale,
  
  // DELETE
  deleteBill,
  deleteSale
};