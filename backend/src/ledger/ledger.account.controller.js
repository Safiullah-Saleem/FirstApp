const LedgerAccount = require('./ledger.account.model');

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
    const { company_code, ledgerRegions = [], next_page_token = "" } = data;
    
    if (!company_code) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Company code is required"
          }
        }
      });
    }

    // Build where condition
    let whereCondition = { company_code };
    
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

// 🔹 GET SINGLE LEDGER BY ID
const getLedgerById = async (data, res) => {
  try {
    const { _id } = data;
    
    if (!_id) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger ID is required"
          }
        }
      });
    }

    const ledger = await LedgerAccount.findOne({
      where: { _id }
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
    const { ledger } = data;
    
    if (!ledger) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger data is required"
          }
        }
      });
    }

    const { name, company_code, ledgerType, address, region, phone, email, openingBalance } = ledger;
    
    if (!name || !company_code || !ledgerType) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Name, company code and ledger type are required"
          }
        }
      });
    }

    const ledgerData = {
      _id: ledger._id, // Use provided _id or auto-generate
      name,
      company_code,
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

    const newLedger = await LedgerAccount.create(ledgerData);

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Ledger created successfully"
        },
        data: { 
          ledger: newLedger._id 
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to create ledger: ${error.message}`);
  }
};

// 🔹 UPDATE LEDGER GENERAL INFORMATION
const updateLedgerGeneral = async (data, res) => {
  try {
    const { _id, ...updateData } = data;
    
    if (!_id) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger ID is required"
          }
        }
      });
    }

    const existingLedger = await LedgerAccount.findOne({ where: { _id } });
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
      where: { _id }
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Ledger updated successfully"
        },
        data: { 
          ledger: _id 
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to update ledger: ${error.message}`);
  }
};

// 🔹 UPDATE LEDGER
const updateLedger = async (data, res) => {
  try {
    const { _id, ...updateData } = data;
    
    if (!_id) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger ID is required"
          }
        }
      });
    }

    const existingLedger = await LedgerAccount.findOne({ where: { _id } });
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
      where: { _id }
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Ledger updated successfully"
        },
        data: { 
          ledger: _id 
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to update ledger: ${error.message}`);
  }
};

// 🔹 UPDATE LEDGER WITH SALE TRANSACTION
const updateSaleLedger = async (data, res) => {
  try {
    const { ledgerId, amount, type } = data;

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

    const ledger = await LedgerAccount.findOne({ where: { _id: ledgerId } });
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
      // Assuming no deposit for simplicity, remaining amount affects balance
      balanceChange = parsedAmount;
    } else if (type === 'return') {
      newSaleTotal -= parsedAmount;
      // For returns, subtract from balance
      balanceChange = -parsedAmount;
    } else {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Invalid type. Must be 'sale' or 'return'"
          }
        }
      });
    }

    await LedgerAccount.update({
      saleTotal: newSaleTotal,
      depositedSalesTotal: newDepositedSalesTotal,
      currentBalance: parseFloat(ledger.currentBalance || 0) + balanceChange,
      modified_at: Math.floor(Date.now() / 1000)
    }, {
      where: { _id: ledgerId }
    });

    // Here you would typically also save the sale transaction details
    // in a separate sales table with ledger_id reference

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Sale ledger updated successfully"
        },
        data: {
          ledger: ledgerId
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to update ledger with sale: ${error.message}`);
  }
};

// 🔹 UPDATE LEDGER WITH PURCHASE TRANSACTION - FIXED VERSION
const updatePurchaseLedger = async (data, res) => {
  try {
    const { ledgerId, amount, type, purchaseData } = data;

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

    const ledger = await LedgerAccount.findOne({ where: { _id: ledgerId } });
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

    await LedgerAccount.update({
      purchasesTotal: newPurchasesTotal,
      depositedPurchasesTotal: newDepositedPurchasesTotal,
      currentBalance: newCurrentBalance,
      modified_at: Math.floor(Date.now() / 1000)
    }, {
      where: { _id: ledgerId }
    });

    // Save purchase transaction details if purchaseData is provided
    if (purchaseData && type === 'purchase') {
      try {
        const Purchase = require('../billing/purchase.model');

        const purchaseRecord = {
          ...purchaseData,
          ledger_id: ledgerId,
          total_price: parsedAmount,
          date: purchaseData.date || new Date().toISOString().split('T')[0],
          company_code: ledger.company_code,
          timestamp: Math.floor(Date.now() / 1000),
          created_at: Math.floor(Date.now() / 1000),
          modified_at: Math.floor(Date.now() / 1000)
        };

        await Purchase.create(purchaseRecord);
        console.log(`✅ Purchase transaction recorded for ledger ${ledgerId}`);
      } catch (purchaseError) {
        console.log('Failed to save purchase transaction details:', purchaseError.message);
      }
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

// 🔹 DELETE LEDGER
const deleteLedger = async (data, res) => {
  try {
    const { _id } = data;
    
    if (!_id) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger ID is required"
          }
        }
      });
    }

    const existingLedger = await LedgerAccount.findOne({ where: { _id } });
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
      where: { _id }
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Ledger deleted successfully"
        },
        data: { 
          ledger: _id 
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to delete ledger: ${error.message}`);
  }
};

// 🔹 GET LEDGER HISTORY (Integration with Sales/Purchases) - FIXED VERSION
const getLedgerHistory = async (data, res) => {
  try {
    const { _id } = data;
    
    if (!_id) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Ledger ID is required"
          }
        }
      });
    }

    const ledger = await LedgerAccount.findOne({ where: { _id } });
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

    // Get transactions linked to this ledger
    let sales = [];
    let purchases = [];
    
    try {
      // ✅ FIXED: Use correct path to purchase model
      const Purchase = require('../billing/purchase.model');
      
      purchases = await Purchase.findAll({
        where: { ledger_id: _id },
        order: [['date', 'DESC']]
      });
      
      // If you have sales model, uncomment this:
      // const Sale = require('./sale.model');
      // sales = await Sale.findAll({
      //   where: { ledger_id: _id },
      //   order: [['date', 'DESC']]
      // });
      
    } catch (importError) {
      console.log('Purchase model not available:', importError.message);
    }

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK"
        },
        data: {
          ledger,
          transactions: {
            sales,
            purchases
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to fetch ledger history: ${error.message}`);
  }
};

module.exports = { handleLedgerRequest };
