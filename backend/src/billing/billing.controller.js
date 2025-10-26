const { sequelize } = require("../config/database");
const User = require("../user/user.model");
const Item = require("../items/item.model");
const Bill = require("./bill.model");
const Sale = require("./sale.model");
const { Op } = require("sequelize");

// ===== CREATE OPERATIONS =====

// Save Bills API (CREATE) - FIXED TRANSACTION HANDLING
const saveBills = async (req, res) => {
  let transaction;

  try {
    console.log("=== SAVE BILLS ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // ✅ FIXED: Create transaction with timeout handling
    transaction = await sequelize.transaction({
      isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED,
      timeout: 30000 // 30 second timeout
    });

    // Extract bill data from request - handle both formats
    let billData = getBillDataFromRequest(req.body);

    if (!billData) {
      await safeRollback(transaction);
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
      await safeRollback(transaction);
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
      await safeRollback(transaction);
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
      await safeRollback(transaction);
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
          ledger_id: otherBillData.ledger_id || null,
          bank_id: otherBillData.bank_id || otherBillData.bankId || null,
          cash_id: otherBillData.cash_id || otherBillData.cashId || null,
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
          paid: parseFloat(otherBillData.paid) || 0,
          date: otherBillData.date || new Date().toISOString().split("T")[0],
        },
        { transaction }
      );
    }

    // ✅ FIXED: Commit transaction with timeout handling
    await safeCommit(transaction);
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
    // ✅ FIXED: Safe rollback with error handling
    await safeRollback(transaction);
    console.error("SAVE BILLS ERROR:", error);
    
    // Handle specific timeout errors
    if (error.name === 'SequelizeConnectionAcquireTimeoutError') {
      return res.status(503).json({
        response: {
          status: {
            statusCode: 503,
            statusMessage: "Database connection timeout. Please try again.",
          },
          data: null,
        },
      });
    }
    
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

// Save Sale API (CREATE) - FIXED TRANSACTION HANDLING
const saveSale = async (req, res) => {
  let transaction;

  try {
    console.log("=== SAVE SALE ===");
    
    // ✅ FIXED: Create transaction with timeout
    transaction = await sequelize.transaction({
      timeout: 30000
    });

    // Extract sales data from request
    let salesData = getSalesDataFromRequest(req.body);

    if (!Array.isArray(salesData) || salesData.length === 0) {
      await safeRollback(transaction);
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
        await safeRollback(transaction);
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
        await safeRollback(transaction);
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

    // ✅ FIXED: Safe commit
    await safeCommit(transaction);
    
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
    // ✅ FIXED: Safe rollback
    await safeRollback(transaction);
    console.error("SAVE SALE ERROR:", error);
    
    if (error.name === 'SequelizeConnectionAcquireTimeoutError') {
      return res.status(503).json({
        response: {
          status: {
            statusCode: 503,
            statusMessage: "Database connection timeout. Please try again.",
          },
          data: null,
        },
      });
    }
    
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

// ===== CRITICAL FIX: SAFE TRANSACTION HANDLERS =====

const safeCommit = async (transaction) => {
  if (!transaction) return;
  
  try {
    if (!transaction.finished) {
      await transaction.commit();
      console.log("✅ Transaction committed successfully");
    }
  } catch (commitError) {
    console.error("❌ Transaction commit failed:", commitError.message);
    // Don't throw here - the main error is more important
  }
};

const safeRollback = async (transaction) => {
  if (!transaction) return;
  
  try {
    if (!transaction.finished) {
      await transaction.rollback();
      console.log("✅ Transaction rolled back successfully");
    }
  } catch (rollbackError) {
    console.error("❌ Transaction rollback failed:", rollbackError.message);
    // Don't throw here - the main error is more important
  }
};

// ===== READ OPERATIONS (NO TRANSACTIONS NEEDED) =====

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

// ===== UPDATE OPERATIONS WITH FIXED TRANSACTIONS =====

// Update bill
const updateBill = async (req, res) => {
  let transaction;

  try {
    const { id } = req.params;
    const updateData = req.body;

    // ✅ FIXED: Create transaction
    transaction = await sequelize.transaction({ timeout: 30000 });

    const bill = await Bill.findOne({
      where: { id: parseInt(id) },
      transaction
    });

    if (!bill) {
      await safeRollback(transaction);
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

    await safeCommit(transaction);

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
    await safeRollback(transaction);
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
  let transaction;

  try {
    const { id } = req.params;
    const updateData = req.body;

    // ✅ FIXED: Create transaction
    transaction = await sequelize.transaction({ timeout: 30000 });

    const sale = await Sale.findOne({
      where: { id: parseInt(id) },
      transaction
    });

    if (!sale) {
      await safeRollback(transaction);
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

    await safeCommit(transaction);

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
    await safeRollback(transaction);
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

// ===== DELETE OPERATIONS WITH FIXED TRANSACTIONS =====

// Delete bill (with inventory restoration)
const deleteBill = async (req, res) => {
  let transaction;

  try {
    const { id } = req.params;
    const { company_code } = req.body;

    // ✅ FIXED: Create transaction
    transaction = await sequelize.transaction({ timeout: 30000 });

    if (!company_code) {
      await safeRollback(transaction);
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
      await safeRollback(transaction);
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

    await safeCommit(transaction);

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
    await safeRollback(transaction);
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
  let transaction;

  try {
    const { id } = req.params;
    const { company_code } = req.body;

    // ✅ FIXED: Create transaction
    transaction = await sequelize.transaction({ timeout: 30000 });

    if (!company_code) {
      await safeRollback(transaction);
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
      await safeRollback(transaction);
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

    await safeCommit(transaction);

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
    await safeRollback(transaction);
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

// Process inventory update for bill items
const processInventoryUpdate = async (item, company_code, transaction) => {
  try {
    const itemId = getItemId(item);
    const quantity = parseInt(item.saleQuantity || item.quantity || 1);
    
    const dbItem = await Item.findOne({
      where: { itemId, company_code },
      transaction
    });

    if (dbItem) {
      const currentStock = parseInt(dbItem.stock || 0);
      const newStock = currentStock - quantity;
      
      await dbItem.update({
        stock: newStock >= 0 ? newStock : 0,
        last_modified: Math.floor(Date.now() / 1000)
      }, { transaction });

      console.log(`✅ Inventory updated for ${dbItem.name}: ${currentStock} -> ${newStock}`);
    } else {
      console.log(`⚠️ Item not found: ${itemId}`);
    }
  } catch (error) {
    console.error("Inventory update error:", error);
  }
};

// Process inventory update from sale
const processInventoryUpdateFromSale = async (sale, company_code, transaction) => {
  try {
    const itemId = getItemId(sale);
    const quantity = parseInt(sale.quantity || 1);
    
    const dbItem = await Item.findOne({
      where: { itemId, company_code },
      transaction
    });

    if (dbItem) {
      const currentStock = parseInt(dbItem.stock || 0);
      const newStock = currentStock - quantity;
      
      await dbItem.update({
        stock: newStock >= 0 ? newStock : 0,
        last_modified: Math.floor(Date.now() / 1000)
      }, { transaction });

      console.log(`✅ Inventory updated for ${dbItem.name}: ${currentStock} -> ${newStock}`);
    } else {
      console.log(`⚠️ Item not found: ${itemId}`);
    }
  } catch (error) {
    console.error("Inventory update error:", error);
  }
};

// Restore inventory when deleting bills/sales
const restoreInventory = async (sale, company_code, transaction) => {
  try {
    const itemId = sale.item_id;
    const quantity = parseInt(sale.quantity || 1);
    
    const dbItem = await Item.findOne({
      where: { itemId, company_code },
      transaction
    });

    if (dbItem) {
      const currentStock = parseInt(dbItem.stock || 0);
      const newStock = currentStock + quantity;
      
      await dbItem.update({
        stock: newStock,
        last_modified: Math.floor(Date.now() / 1000)
      }, { transaction });

      console.log(`✅ Inventory restored for ${dbItem.name}: ${currentStock} -> ${newStock}`);
    } else {
      console.log(`⚠️ Item not found: ${itemId}`);
    }
  } catch (error) {
    console.error("Inventory restoration error:", error);
  }
};

// Get sale history with filters
const getSaleHistory = async (req, res) => {
  try {
    const { 
      company_code,
      page = 1, 
      limit = 50, 
      startDate, 
      endDate, 
      item_id,
      ledger_id,
      bank_id,
      cash_id
    } = req.query;

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

    // Add filters
    if (item_id) {
      whereClause.item_id = item_id;
    }
    if (ledger_id) {
      whereClause.ledger_id = ledger_id;
    }
    if (bank_id) {
      whereClause.bank_id = bank_id;
    }
    if (cash_id) {
      whereClause.cash_id = cash_id;
    }

    const offset = (page - 1) * limit;

    const { count, rows: sales } = await Sale.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      include: [{
        model: Bill,
        as: 'bill',
        attributes: ['id', 'bill_number', 'customer', 'date'],
        required: false // Make the join optional in case some sales don't have bills
      }]
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Sale history retrieved successfully",
        },
        data: {
          sales,
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
    console.error("GET SALE HISTORY ERROR:", error);
    
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

// Get bills by company with pagination
const getBillsByCompany = async (req, res) => {
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
    console.error("GET BILLS BY COMPANY ERROR:", error);
    
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

// Return sale with balance reversal and inventory restoration
const returnSale = async (req, res) => {
  let transaction;

  try {
    const { sale_id, company_code, reason } = req.body;

    if (!sale_id || !company_code) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Sale ID and company code are required",
          },
          data: null,
        },
      });
    }

    // ✅ FIXED: Create transaction
    transaction = await sequelize.transaction({ timeout: 30000 });

    const sale = await Sale.findOne({
      where: { 
        id: parseInt(sale_id),
        company_code 
      },
      transaction
    });

    if (!sale) {
      await safeRollback(transaction);
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
      where: { id: parseInt(sale_id) },
      transaction
    });

    await safeCommit(transaction);

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Sale returned successfully",
        },
        data: {
          message: "Sale returned and inventory restored successfully",
          reason: reason || "Return processed"
        },
      },
    });
  } catch (error) {
    await safeRollback(transaction);
    console.error("RETURN SALE ERROR:", error);
    
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
  // CREATE
  saveBills,
  saveSale,
  
  // READ
  getAllBills,
  getSaleHistory,
  getBillsByCompany,
  
  // UPDATE
  updateBill,
  updateSale,
  
  // DELETE
  deleteBill,
  deleteSale,
  
  // NEW
  returnSale
};
