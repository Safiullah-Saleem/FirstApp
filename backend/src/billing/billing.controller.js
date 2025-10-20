const { sequelize } = require("../config/database");
const User = require("../user/user.model");
const Item = require("../items/item.model");
const Bill = require("./bill.model");
const SaleBilling = require("./salebilling.model");
const { Op } = require("sequelize");

// === CREATE OPERATIONS ===

// Save Bills API
const saveBills = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    console.log("=== SAVE BILLS ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // Extract bill data from request - handle both formats
    let billData = null;
    
    console.log("Raw request body:", req.body);
    console.log("Request body type:", typeof req.body);
    console.log("Request body keys:", Object.keys(req.body || {}));
    
    if (req.body && req.body.request && req.body.request.data && req.body.request.data.bill) {
      // Wrapped format: { request: { method: "saveBills", data: { bill: {...} } } }
      billData = req.body.request.data.bill;
      console.log("Using wrapped format");
    } else if (req.body && (req.body.company_code || req.body.items)) {
      // Simple format: { company_code: "8888", items: [...], ... }
      billData = req.body;
      console.log("Using simple format");
    } else {
      await transaction.rollback();
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage:
              "Invalid request format. Expected wrapped format or simple format with company_code",
          },
          data: null,
        },
      });
    }

    // Debug logging
    console.log("Extracted billData:", billData);
    
    if (!billData) {
      await transaction.rollback();
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Bill data is missing or invalid",
          },
          data: null,
        },
      });
    }

    const { company_code, items, ...otherBillData } = billData;

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

    // Process inventory updates for each item
    console.log("Starting inventory updates...");
    for (const item of items) {
      await processInventoryUpdate(item, company_code, transaction);
      console.log(`Inventory updated for item ${item.itemId}`);
    }
    console.log("All inventory updates completed");

    // Save bill
    const savedBill = await Bill.create(
      {
        company_code,
        bill_number: otherBillData.billNumber || null,
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
        formally_outstandings:
          parseFloat(otherBillData.formallyOutstandings) || 0,
      },
      { transaction }
    );

    const billId = savedBill.id;

    // Insert each sold item into sales table - UPDATED to SaleBilling
    for (const item of items) {
        await SaleBilling.create(
          {
            bill_id: billId,
            company_code,
            item_id: String(item.itemId),
          name: item.name,
          description: item.description || "",
          item_code: item.itemCode || "",
          category: item.category || "",
          unit: item.unit || "",
          quantity: item.saleQuantity || 1,
          sale_price: parseFloat(item.salePrice) || 0,
          cost_price: parseFloat(item.costPrice) || 0,
          total_price:
            (parseFloat(item.salePrice) || 0) * (item.saleQuantity || 1),
          discount: parseFloat(item.discount) || 0,
          vendor: item.vendor || "",
          selected_imei: item.selectedImei || "",
          batch_number: item.saleBatchNumber || item.batchNo || "",
          sale_type: item.saleType || "pieces",
        },
        { transaction }
      );
    }

    // Commit transaction to persist all changes
    await transaction.commit();
    console.log("Transaction committed successfully");
    console.log("Bill saved successfully with ID:", billId);

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Bill saved successfully",
        },
        data: {
          billId: billId,
          message: "Bill and inventory updated successfully",
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("SAVE BILLS ERROR:", error);
    console.error("Error stack:", error.stack);
    console.error("Request body was:", JSON.stringify(req.body, null, 2));
    
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

// Save Sale API
const saveSale = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    console.log("=== SAVE SALE ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // Extract sales data from request - handle both formats
    let salesData = null;
    
    console.log("Raw request body:", req.body);
    console.log("Request body type:", typeof req.body);
    console.log("Is array:", Array.isArray(req.body));
    
    if (req.body && req.body.request && req.body.request.data && req.body.request.data.sales) {
      // Wrapped format: { request: { method: "saveSale", data: { sales: [...] } } }
      salesData = req.body.request.data.sales;
      console.log("Using wrapped format");
    } else if (Array.isArray(req.body)) {
      // Simple format: [{ company_code: "8888", itemId: 123, ... }]
      salesData = req.body;
      console.log("Using array format");
    } else if (req.body && req.body.company_code && req.body.itemId) {
      // Single sale object: { company_code: "8888", itemId: 123, ... }
      salesData = [req.body];
      console.log("Using single object format");
    } else {
      await transaction.rollback();
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage:
              "Invalid request format. Expected wrapped format or simple sales array/object",
          },
          data: null,
        },
      });
    }

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
      // Debug logging
      console.log("Processing sale:", sale);
      
      if (!sale) {
        await transaction.rollback();
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: "Sale data is missing or invalid",
            },
            data: null,
          },
        });
      }

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
      console.log(`Updating inventory for sale item ${sale.itemId}`);
      await processInventoryUpdateFromSale(sale, company_code, transaction);
      console.log(`Inventory updated for sale item ${sale.itemId}`);

      // Save sale - UPDATED to SaleBilling
      const savedSale = await SaleBilling.create(
        {
          company_code,
          item_id: String(sale.itemId),
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
        itemId: sale.itemId,
        itemName: sale.name,
      });
    }

    // Commit transaction to persist all changes
    await transaction.commit();
    console.log("Transaction committed successfully");
    console.log("Sales saved successfully:", results);

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
    console.error("Error stack:", error.stack);
    console.error("Request body was:", JSON.stringify(req.body, null, 2));
    
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

// === READ OPERATIONS ===

// GET ALL BILLS with pagination and filters
const getAllBills = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { 
      page = 1, 
      limit = 20, 
      start_date, 
      end_date,
      customer,
      payment_method,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const where = { company_code };
    
    // Date filter
    if (start_date && end_date) {
      where.date = {
        [Op.between]: [start_date, end_date]
      };
    } else if (start_date) {
      where.date = { [Op.gte]: start_date };
    } else if (end_date) {
      where.date = { [Op.lte]: end_date };
    }

    // Customer filter
    if (customer) {
      where.customer = { [Op.iLike]: `%${customer}%` };
    }

    // Payment method filter
    if (payment_method) {
      where.payment_method = payment_method;
    }

    const offset = (page - 1) * limit;

    const { count, rows: bills } = await Bill.findAndCountAll({
      where,
      include: [{
        model: SaleBilling,
        as: 'sales',
        attributes: ['id', 'item_id', 'name', 'quantity', 'sale_price', 'total_price']
      }],
      order: [[sort_by, sort_order]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        bills,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error("GET ALL BILLS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bills",
      error: error.message
    });
  }
};

// GET BILL BY ID
const getBillById = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { id } = req.params;

    const bill = await Bill.findOne({
      where: { id, company_code },
      include: [{
        model: SaleBilling,
        as: 'sales',
        attributes: { exclude: ['created_at', 'modified_at'] }
      }]
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found"
      });
    }

    res.json({
      success: true,
      data: bill
    });

  } catch (error) {
    console.error("GET BILL BY ID ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bill",
      error: error.message
    });
  }
};

// GET ALL SALES with filters
const getAllSales = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { 
      page = 1, 
      limit = 50,
      start_date,
      end_date,
      item_id,
      item_name
    } = req.query;

    const where = { company_code };
    
    // Date filter
    if (start_date && end_date) {
      where.date = {
        [Op.between]: [start_date, end_date]
      };
    }

    // Item filters
    if (item_id) {
      where.item_id = item_id;
    }
    if (item_name) {
      where.name = { [Op.iLike]: `%${item_name}%` };
    }

    const offset = (page - 1) * limit;

    const { count, rows: sales } = await SaleBilling.findAndCountAll({
      where,
      include: [{
        model: Bill,
        as: 'bill',
        attributes: ['id', 'bill_number', 'customer', 'date']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate summary
    const totalRevenue = await SaleBilling.sum('total_price', { where });
    const totalQuantity = await SaleBilling.sum('quantity', { where });

    res.json({
      success: true,
      data: {
        sales,
        summary: {
          totalRevenue: totalRevenue || 0,
          totalQuantity: totalQuantity || 0,
          totalSales: count
        },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error("GET ALL SALES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales",
      error: error.message
    });
  }
};

// GET SALES REPORT (Summary)
const getSalesReport = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { start_date, end_date, group_by = 'daily' } = req.query;

    const where = { company_code };
    
    if (start_date && end_date) {
      where.date = { [Op.between]: [start_date, end_date] };
    }

    let groupQuery, orderQuery;
    
    switch (group_by) {
      case 'daily':
        groupQuery = 'date';
        orderQuery = 'date';
        break;
      case 'monthly':
        groupQuery = sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date'));
        orderQuery = sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date'));
        break;
      case 'item':
        groupQuery = 'item_id';
        orderQuery = 'total_revenue';
        break;
      default:
        groupQuery = 'date';
        orderQuery = 'date';
    }

    const report = await SaleBilling.findAll({
      where,
      attributes: [
        groupQuery,
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_sales'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue'],
        [sequelize.fn('SUM', sequelize.col('total_profit')), 'total_profit']
      ],
      group: [groupQuery],
      order: [[sequelize.literal(orderQuery), 'DESC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        report,
        period: { start_date, end_date },
        group_by
      }
    });

  } catch (error) {
    console.error("SALES REPORT ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate sales report",
      error: error.message
    });
  }
};

// === UPDATE OPERATIONS ===

// UPDATE BILL
const updateBill = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { company_code } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const bill = await Bill.findOne({
      where: { id, company_code },
      transaction
    });

    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Bill not found"
      });
    }

    // Update bill
    await bill.update(updateData, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Bill updated successfully",
      data: bill
    });

  } catch (error) {
    await transaction.rollback();
    console.error("UPDATE BILL ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update bill",
      error: error.message
    });
  }
};

// UPDATE SALE
const updateSale = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { company_code } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const sale = await SaleBilling.findOne({
      where: { id, company_code },
      transaction
    });

    if (!sale) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Sale record not found"
      });
    }

    await sale.update(updateData, { transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Sale updated successfully",
      data: sale
    });

  } catch (error) {
    await transaction.rollback();
    console.error("UPDATE SALE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update sale",
      error: error.message
    });
  }
};

// === DELETE OPERATIONS ===

// DELETE BILL (and associated sales)
const deleteBill = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { company_code } = req.user;
    const { id } = req.params;

    const bill = await Bill.findOne({
      where: { id, company_code },
      include: [{
        model: SaleBilling,
        as: 'sales'
      }],
      transaction
    });

    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Bill not found"
      });
    }

    // Delete associated sales first
    if (bill.sales && bill.sales.length > 0) {
      await SaleBilling.destroy({
        where: { bill_id: id },
        transaction
      });
    }

    // Delete bill
    await bill.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Bill and associated sales deleted successfully"
    });

  } catch (error) {
    await transaction.rollback();
    console.error("DELETE BILL ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete bill",
      error: error.message
    });
  }
};

// DELETE SALE
const deleteSale = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { company_code } = req.user;
    const { id } = req.params;

    const sale = await SaleBilling.findOne({
      where: { id, company_code },
      transaction
    });

    if (!sale) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Sale record not found"
      });
    }

    await sale.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Sale deleted successfully"
    });

  } catch (error) {
    await transaction.rollback();
    console.error("DELETE SALE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete sale",
      error: error.message
    });
  }
};

// === INVENTORY HELPERS ===
const processInventoryUpdate = async (item, company_code, transaction) => {
  console.log("Processing inventory update for item:", item.itemId);

  const dbItem = await Item.findOne({
    where: {
      itemId: String(item.itemId),
      company_code,
    },
    transaction,
  });

  if (!dbItem) throw new Error(`Item with ID ${item.itemId} not found`);

  const saleQuantity = item.saleQuantity || 1;

  if (item.selectedImei && item.selectedImei.trim() !== "") {
    await processImeiSale(dbItem, item.selectedImei, transaction);
  } else if (item.saleBatchNumber || item.batchNo) {
    await processBatchSale(dbItem, item, saleQuantity, transaction);
  } else {
    await processSimpleItemSale(dbItem, saleQuantity, transaction);
  }
};

const processInventoryUpdateFromSale = async (sale, company_code, transaction) => {
  console.log("Processing inventory update for sale item:", sale.itemId);

  const dbItem = await Item.findOne({
    where: {
      itemId: String(sale.itemId),
      company_code,
    },
    transaction,
  });

  if (!dbItem) throw new Error(`Item with ID ${sale.itemId} not found`);

  const saleQuantity = sale.quantity || 1;

  if (sale.selectedImei && sale.selectedImei.trim() !== "") {
    await processImeiSale(dbItem, sale.selectedImei, transaction);
  } else {
    await processSimpleItemSale(dbItem, saleQuantity, transaction);
  }
};

const processSimpleItemSale = async (dbItem, saleQuantity, transaction) => {
  console.log(
    `Processing simple item sale: ${dbItem.itemId}, quantity: ${saleQuantity}`
  );

  if (dbItem.quantity < saleQuantity) throw new Error("Insufficient stock");

  const newQuantity = dbItem.quantity - saleQuantity;

  await dbItem.update(
    {
      quantity: newQuantity,
      modified_at: Math.floor(Date.now() / 1000),
    },
    { transaction }
  );

  // Force reload to verify update
  await dbItem.reload({ transaction });
  console.log(`✅ Successfully updated item ${dbItem.itemId} quantity from ${dbItem.quantity + saleQuantity} to ${dbItem.quantity}`);
};

const processBatchSale = async (dbItem, item, saleQuantity, transaction) => {
  const batchNumber = item.saleBatchNumber || item.batchNo;
  const saleType = item.saleType || "pieces";

  console.log(
    `Processing batch sale: ${dbItem.itemId}, batch: ${batchNumber}, type: ${saleType}, quantity: ${saleQuantity}`
  );

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

  // Force reload to verify update
  await dbItem.reload({ transaction });
  console.log(`✅ Successfully updated batch ${batchNumber} quantity to ${batch.quantity}`);
  console.log(`✅ Successfully updated total item ${dbItem.itemId} quantity to ${dbItem.quantity}`);
};

const processImeiSale = async (dbItem, selectedImei, transaction) => {
  console.log(`Processing IMEI sale: ${dbItem.itemId}, IMEI: ${selectedImei}`);

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

  // Force reload to verify update
  await dbItem.reload({ transaction });
  console.log(`✅ Successfully removed IMEI ${selectedImei} from item ${dbItem.itemId}`);
  console.log(`✅ Successfully updated item ${dbItem.itemId} quantity to ${dbItem.quantity}`);
};

module.exports = {
  // CREATE
  saveBills,
  saveSale,
  
  // READ
  getAllBills,
  getBillById,
  getAllSales,
  getSalesReport,
  
  // UPDATE
  updateBill,
  updateSale,
  
  // DELETE
  deleteBill,
  deleteSale
};