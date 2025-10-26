const LedgerAccount = require('./ledger.account.model');
const LedgerTransaction = require('./ledger.transaction.model');
const Sale = require('../billing/sale.model');
const Purchase = require('../billing/purchase.model');

const handleLedgerRequest = async (req, res) => {
  try {
    const { method, data } = req.body.request;
    
    console.log('Ledger API Called:', method, data);
    
    switch (method) {
      case 'getLedgersByCompany':
        return await getLedgersByCompany(data, res);
      
      case 'getLedgerById':
        return await getLedgerById(data, res);
      
      case 'getLedger':
        return await getLedgerById(data, res);
      
      case 'saveLedger':
        return await saveLedger(data, res);
      
      case 'updateLedger':
        return await updateLedger(data, res);
      
      case 'updateLedgerGeneral':
        return await updateLedgerGeneral(data, res);
      
      case 'deleteLedger':
        return await deleteLedger(data, res);
      
      case 'updateSaleLedger':
        return await updateSaleLedger(data, res);
      
      case 'updatePurchaseLedger':
        return await updatePurchaseLedger(data, res);
      
      case 'getLedgerHistory':
        return await getLedgerHistory(data, res);
      
      default:
        return res.json({
          response: {
            status: {
              statusCode: 404,
              statusMessage: `Method ${method} not found`
            }
          }
        });
    }
  } catch (error) {
    console.error('Ledger API Error:', error);
    res.json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: error.message
        }
      }
    });
  }
};

// 🔹 GET ALL LEDGERS BY COMPANY
const getLedgersByCompany = async (data, res) => {
  try {
    // ✅ SUPPORT BOTH company_code AND company.code
    const companyCode = data.company_code || data.company?.code;
    const { ledgerRegions = [], next_page_token = "" } = data;
    
    if (!companyCode) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Company code is required"
          }
        }
      });
    }

    console.log(`🔍 Getting ledgers for company: ${companyCode}`);

    // Build where condition
    let whereCondition = { company_code: companyCode };
    
    // Filter by regions if provided
    if (ledgerRegions && ledgerRegions.length > 0) {
      whereCondition.region = ledgerRegions;
    }

    const ledgers = await LedgerAccount.findAll({
      where: whereCondition,
      order: [['created_at', 'DESC']]
    });

    // Calculate totals
    const salesTotal = ledgers.reduce((sum, ledger) => sum + parseFloat(ledger.saleTotal || 0), 0);
    const purchasesTotal = ledgers.reduce((sum, ledger) => sum + parseFloat(ledger.purchasesTotal || 0), 0);

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK"
        },
        data: {
          current_page_token: "",
          next_page_token: "",
          salesTotal,
          purchasesTotal,
          ledgers
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to fetch ledgers: ${error.message}`);
  }
};

// 🔹 GET SINGLE LEDGER BY ID - FIXED
const getLedgerById = async (data, res) => {
  try {
    // ✅ SUPPORT ALL FORMATS: id, _id, ledger.id, ledger_id
    const ledgerId = data.id || data._id || data.ledger?.id || data.ledger_id;
    
    if (!ledgerId) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger ID is required"
          }
        }
      });
    }

    console.log(`🔍 Looking up ledger with ID: ${ledgerId}`);

    const ledger = await LedgerAccount.findOne({
      where: { id: ledgerId }
    });

    if (!ledger) {
      return res.json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Ledger not found"
          }
        }
      });
    }

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK"
        },
        data: { ledger }
      }
    });
  } catch (error) {
    throw new Error(`Failed to fetch ledger: ${error.message}`);
  }
};

// 🔹 CREATE NEW LEDGER
const saveLedger = async (data, res) => {
  try {
    // Check database connection before proceeding
    const { sequelize } = require('../config/database');
    if (!sequelize) {
      return res.json({
        response: {
          status: {
            statusCode: 503,
            statusMessage: "Database connection is not available"
          }
        }
      });
    }

    // ✅ SUPPORT BOTH ledger OBJECT AND DIRECT PROPERTIES
    const ledgerData = data.ledger || data;
    
    if (!ledgerData) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger data is required"
          }
        }
      });
    }

    // ✅ SUPPORT BOTH company_code AND company.code
    const companyCode = ledgerData.company_code || ledgerData.company?.code;
    const { name, ledgerType, address, region, phone, email, openingBalance } = ledgerData;
    
    if (!name || !companyCode || !ledgerType) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Name, company code and ledger type are required"
          }
        }
      });
    }

    const newLedgerData = {
      id: ledgerData.id || ledgerData._id,
      name,
      company_code: companyCode,
      ledgerType,
      address: address || "",
      region: region || "",
      phone: phone || "",
      email: email || "",
      openingBalance: parseFloat(openingBalance) || 0.00,
      currentBalance: parseFloat(openingBalance) || 0.00,
      created_at: Math.floor(Date.now() / 1000),
      modified_at: Math.floor(Date.now() / 1000)
    };

    const newLedger = await LedgerAccount.create(newLedgerData);

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Ledger created successfully"
        },
        data: { 
          ledger: newLedger.id 
        }
      }
    });
  } catch (error) {
    console.error('saveLedger error details:', error);
    throw new Error(`Failed to create ledger: ${error.message}`);
  }
};

// 🔹 UPDATE LEDGER GENERAL INFORMATION - FIXED
const updateLedgerGeneral = async (data, res) => {
  try {
    // ✅ SUPPORT ALL LEDGER ID FORMATS
    const ledgerId = data.id || data._id || data.ledger?.id || data.ledger_id;
    const updateData = { ...data };
    
    // Remove ID fields from update data
    delete updateData.id;
    delete updateData._id;
    delete updateData.ledger_id;
    if (updateData.ledger) delete updateData.ledger.id;
    
    if (!ledgerId) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger ID is required"
          }
        }
      });
    }

    const existingLedger = await LedgerAccount.findOne({ where: { id: ledgerId } });
    if (!existingLedger) {
      return res.json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Ledger not found"
          }
        }
      });
    }

    // Remove fields that shouldn't be updated here
    delete updateData.sale;
    delete updateData.purchase;
    delete updateData.saleTotal;
    delete updateData.depositedSalesTotal;
    delete updateData.purchasesTotal;
    delete updateData.depositedPurchasesTotal;

    updateData.modified_at = Math.floor(Date.now() / 1000);

    await LedgerAccount.update(updateData, {
      where: { id: ledgerId }
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Ledger updated successfully"
        },
        data: { 
          ledger: ledgerId
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to update ledger: ${error.message}`);
  }
};

// 🔹 UPDATE LEDGER - FIXED
const updateLedger = async (data, res) => {
  try {
    // ✅ SUPPORT ALL LEDGER ID FORMATS
    const ledgerId = data.id || data._id || data.ledger?.id || data.ledger_id;
    const updateData = { ...data };
    
    // Remove ID fields from update data
    delete updateData.id;
    delete updateData._id;
    delete updateData.ledger_id;
    if (updateData.ledger) delete updateData.ledger.id;
    
    if (!ledgerId) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger ID is required"
          }
        }
      });
    }

    const existingLedger = await LedgerAccount.findOne({ where: { id: ledgerId } });
    if (!existingLedger) {
      return res.json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Ledger not found"
          }
        }
      });
    }

    // Update only allowed fields
    const allowedFields = ['name', 'phone', 'email', 'address', 'region'];
    const filteredData = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    filteredData.modified_at = Math.floor(Date.now() / 1000);

    await LedgerAccount.update(filteredData, {
      where: { id: ledgerId }
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Ledger updated successfully"
        },
        data: { 
          ledger: ledgerId
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to update ledger: ${error.message}`);
  }
};

// 🔹 UPDATE LEDGER WITH SALE TRANSACTION - COMPLETELY FIXED
const updateSaleLedger = async (data, res) => {
  try {
    // ✅ SUPPORT ALL LEDGER ID FORMATS
    const ledgerId = data.ledgerId || data._id || data.ledger?.id || data.ledger_id;
    const { amount, type, description, date } = data;

    if (!ledgerId || !amount || !type) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger ID and sale data are required"
          }
        }
      });
    }

    console.log(`💰 Processing sale for ledger: ${ledgerId}`);

    const ledger = await LedgerAccount.findOne({ where: { id: ledgerId } });
    if (!ledger) {
      return res.json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Ledger not found"
          }
        }
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Invalid amount"
          }
        }
      });
    }

    let newSaleTotal = parseFloat(ledger.saleTotal || 0);
    let newDepositedSalesTotal = parseFloat(ledger.depositedSalesTotal || 0);
    let balanceChange = 0;

    if (type === 'sale') {
      newSaleTotal += parsedAmount;
      // For customer: Sale increases receivable (positive balance)
      balanceChange = parsedAmount;
    } else if (type === 'return') {
      newSaleTotal -= parsedAmount;
      // Return decreases receivable (negative balance)
      balanceChange = -parsedAmount;
    } else if (type === 'payment') {
      // Payment reduces receivable (negative balance)
      newDepositedSalesTotal += parsedAmount;
      balanceChange = -parsedAmount;
    } else {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Invalid type. Must be 'sale', 'return', or 'payment'"
          }
        }
      });
    }

    const newCurrentBalance = parseFloat(ledger.currentBalance || 0) + balanceChange;

    // Update ledger account
    await LedgerAccount.update({
      saleTotal: newSaleTotal,
      depositedSalesTotal: newDepositedSalesTotal,
      currentBalance: newCurrentBalance,
      modified_at: Math.floor(Date.now() / 1000)
    }, {
      where: { id: ledgerId }
    });

    // ✅ CREATE LEDGER TRANSACTION RECORD
    try {
      await LedgerTransaction.create({
        ledger_id: ledgerId,
        company_code: ledger.company_code,
        transaction_type: type,
        amount: parsedAmount,
        paid_amount: type === 'payment' ? parsedAmount : 0,
        balance_change: balanceChange,
        description: description || `${type} transaction`,
        date: date || new Date().toISOString().split('T')[0],
        created_at: Math.floor(Date.now() / 1000)
      });
      console.log(`✅ Ledger transaction recorded for ${type}: ${ledgerId}`);
    } catch (transactionError) {
      console.log('Failed to save ledger transaction:', transactionError.message);
    }

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Sale ledger updated successfully"
        },
        data: {
          ledger: ledgerId,
          updatedFields: {
            saleTotal: newSaleTotal,
            depositedSalesTotal: newDepositedSalesTotal,
            currentBalance: newCurrentBalance
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to update ledger with sale: ${error.message}`);
  }
};

// 🔹 UPDATE LEDGER WITH PURCHASE TRANSACTION - FIXED
const updatePurchaseLedger = async (data, res) => {
  try {
    // ✅ SUPPORT ALL LEDGER ID FORMATS
    const ledgerId = data.ledgerId || data._id || data.ledger?.id || data.ledger_id;
    const { amount, type, description, date } = data;

    if (!ledgerId || !amount || !type) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger ID and purchase data are required"
          }
        }
      });
    }

    console.log(`🛒 Processing purchase for ledger: ${ledgerId}`);

    const ledger = await LedgerAccount.findOne({ where: { id: ledgerId } });
    if (!ledger) {
      return res.json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Ledger not found"
          }
        }
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Invalid amount"
          }
        }
      });
    }

    // ✅ FIXED CALCULATIONS
    let newPurchasesTotal = parseFloat(ledger.purchasesTotal || 0);
    let newDepositedPurchasesTotal = parseFloat(ledger.depositedPurchasesTotal || 0);
    let balanceChange = 0;

    if (type === 'purchase') {
      newPurchasesTotal += parsedAmount;
      // For supplier: Purchase increases liability (negative balance)
      balanceChange = -parsedAmount;
    } else if (type === 'return') {
      newPurchasesTotal -= parsedAmount;
      // Return decreases liability (positive balance)
      balanceChange = parsedAmount;
    } else if (type === 'payment') {
      // Handle purchase payments separately
      newDepositedPurchasesTotal += parsedAmount;
      // Payment reduces liability (positive balance)
      balanceChange = parsedAmount;
    } else {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Invalid type. Must be 'purchase', 'return', or 'payment'"
          }
        }
      });
    }

    const newCurrentBalance = parseFloat(ledger.currentBalance || 0) + balanceChange;

    // Update ledger account
    await LedgerAccount.update({
      purchasesTotal: newPurchasesTotal,
      depositedPurchasesTotal: newDepositedPurchasesTotal,
      currentBalance: newCurrentBalance,
      modified_at: Math.floor(Date.now() / 1000)
    }, {
      where: { id: ledgerId }
    });

    // ✅ CREATE LEDGER TRANSACTION RECORD
    try {
      await LedgerTransaction.create({
        ledger_id: ledgerId,
        company_code: ledger.company_code,
        transaction_type: type,
        amount: parsedAmount,
        paid_amount: type === 'payment' ? parsedAmount : 0,
        balance_change: balanceChange,
        description: description || `${type} transaction`,
        date: date || new Date().toISOString().split('T')[0],
        created_at: Math.floor(Date.now() / 1000)
      });
      console.log(`✅ Ledger transaction recorded for ${type}: ${ledgerId}`);
    } catch (transactionError) {
      console.log('Failed to save ledger transaction:', transactionError.message);
    }

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Purchase ledger updated successfully"
        },
        data: {
          ledger: ledgerId,
          updatedFields: {
            purchasesTotal: newPurchasesTotal,
            depositedPurchasesTotal: newDepositedPurchasesTotal,
            currentBalance: newCurrentBalance
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to update ledger with purchase: ${error.message}`);
  }
};

// 🔹 DELETE LEDGER - FIXED
const deleteLedger = async (data, res) => {
  try {
    // ✅ SUPPORT ALL LEDGER ID FORMATS
    const ledgerId = data.id || data._id || data.ledger?.id || data.ledger_id;
    
    if (!ledgerId) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger ID is required"
          }
        }
      });
    }

    console.log(`🗑️ Deleting ledger: ${ledgerId}`);

    const existingLedger = await LedgerAccount.findOne({ where: { id: ledgerId } });
    if (!existingLedger) {
      return res.json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Ledger not found"
          }
        }
      });
    }

    await LedgerAccount.destroy({
      where: { id: ledgerId }
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Ledger deleted successfully"
        },
        data: { 
          ledger: ledgerId
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to delete ledger: ${error.message}`);
  }
};

// 🔹 GET LEDGER HISTORY - FIXED WITH ENHANCED DEBUGGING
const getLedgerHistory = async (data, res) => {
  try {
    // ✅ SUPPORT ALL LEDGER ID FORMATS
    const ledgerId = data.id || data._id || data.ledger?.id || data.ledger_id;
    
    if (!ledgerId) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger ID is required"
          }
        }
      });
    }

    console.log(`📊 Getting history for ledger: ${ledgerId}`);

    const ledger = await LedgerAccount.findOne({ where: { id: ledgerId } });
    if (!ledger) {
      return res.json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Ledger not found"
          }
        }
      });
    }

    console.log(`🔍 Ledger found: ${ledger.name}, Company: ${ledger.company_code}`);

    // ✅ GET TRANSACTIONS FROM SALES AND PURCHASES TABLES
    let sales = [];
    let purchases = [];
    
    try {
      // Enhanced debugging: Check ALL sales and purchases to see what ledger_ids exist
      const allSalesSample = await Sale.findAll({
        where: { company_code: ledger.company_code },
        limit: 10,
        attributes: ['id', 'name', 'ledger_id', 'total_price', 'date'],
        raw: true
      });
      
      const allPurchasesSample = await Purchase.findAll({
        where: { company_code: ledger.company_code },
        limit: 10,
        attributes: ['id', 'name', 'ledger_id', 'total_price', 'date'],
        raw: true
      });

      console.log('🔍 ALL Sales sample (first 10):', allSalesSample);
      console.log('🔍 ALL Purchases sample (first 10):', allPurchasesSample);

      // Count transactions for this specific ledger
      const salesCount = await Sale.count({ 
        where: { 
          ledger_id: ledgerId, 
          company_code: ledger.company_code 
        } 
      });
      
      const purchasesCount = await Purchase.count({ 
        where: { 
          ledger_id: ledgerId, 
          company_code: ledger.company_code 
        } 
      });
      
      console.log(`📈 Transactions for ledger ${ledgerId}: Sales: ${salesCount}, Purchases: ${purchasesCount}`);

      // Get transactions if they exist
      if (salesCount > 0) {
        sales = await Sale.findAll({
          where: { 
            ledger_id: ledgerId,
            company_code: ledger.company_code
          },
          order: [['date', 'DESC'], ['created_at', 'DESC']],
          raw: true
        });
        console.log(`✅ Loaded ${sales.length} sales for ledger`);
      } else {
        console.log(`ℹ️ No sales found for ledger ${ledgerId}`);
      }

      if (purchasesCount > 0) {
        purchases = await Purchase.findAll({
          where: { 
            ledger_id: ledgerId,
            company_code: ledger.company_code
          },
          order: [['date', 'DESC'], ['created_at', 'DESC']],
          raw: true
        });
        console.log(`✅ Loaded ${purchases.length} purchases for ledger`);
      } else {
        console.log(`ℹ️ No purchases found for ledger ${ledgerId}`);
      }

    } catch (transactionError) {
      console.log('❌ Error fetching sales/purchases:', transactionError.message);
    }

    // ✅ FINAL RESPONSE
    const responseData = {
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK"
        },
        data: {
          ledger: {
            id: ledger.id,
            name: ledger.name,
            company_code: ledger.company_code,
            ledgerType: ledger.ledgerType,
            address: ledger.address,
            region: ledger.region,
            phone: ledger.phone,
            email: ledger.email,
            openingBalance: ledger.openingBalance,
            currentBalance: ledger.currentBalance,
            saleTotal: ledger.saleTotal,
            depositedSalesTotal: ledger.depositedSalesTotal,
            purchasesTotal: ledger.purchasesTotal,
            depositedPurchasesTotal: ledger.depositedPurchasesTotal,
            created_at: ledger.created_at,
            modified_at: ledger.modified_at
          },
          transactions: {
            sales: sales,
            purchases: purchases
          }
        }
      }
    };

    console.log(`🎯 Final response prepared with ${sales.length} sales and ${purchases.length} purchases`);
    res.json(responseData);

  } catch (error) {
    console.error('❌ getLedgerHistory error:', error);
    throw new Error(`Failed to fetch ledger history: ${error.message}`);
  }
};

module.exports = { handleLedgerRequest };