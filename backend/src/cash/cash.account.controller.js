const CashAccount = require('./cash.account.model');
const BankAccount = require('../bank/bank.account.model');
const { ok, badRequest, notFound, serverError } = require('../utils/response');

const handleCashRequest = async (req, res) => {
  try {
    const { method, data } = req.body.request;

    console.log('Cash API Called:', method, data);

    switch (method) {
      case 'getCashByCompany':
        return await getCashByCompany(data, res);

      case 'getCashById':
        return await getCashById(data, res);

      case 'saveCash':
        return await saveCash(data, res);

      case 'updateCash':
        return await updateCash(data, res);

      case 'deleteCash':
        return await deleteCash(data, res);

      case 'updateCashBalance':
        return await updateCashBalance(data, res);

      case 'getCashHistory':
        return await getCashHistory(data, res);

      case 'getCashInHandBankByCompany':
        return await getCashInHandBankByCompany(data, res);

      case 'saveCashInHand':
        return await saveCashInHand(data, res);

      default:
        return res.json({
          response: notFound(`Method ${method} not found`)
        });
    }
  } catch (error) {
    console.error('Cash API Error:', error);
    res.json({
      response: serverError(error.message)
    });
  }
};

// 🔹 GET CASH BY COMPANY (Auto-create if not exists)
const getCashByCompany = async (data, res) => {
  try {
    const { company_code } = data;

    if (!company_code) {
      return res.json({
        response: badRequest("Company code is required")
      });
    }

    let cashAccount = await CashAccount.findOne({
      where: {
        company_code,
        cashName: 'cashInHand'
      }
    });

    // If no cash account exists, create one automatically
    if (!cashAccount) {
      cashAccount = await CashAccount.create({
        company_code,
        cashName: 'cashInHand',
        balance: 0.00,
        date: new Date(),
        description: '',
        created_at: Math.floor(Date.now() / 1000),
        modified_at: Math.floor(Date.now() / 1000)
      });
    }

    res.json({
      response: ok({
        cash: cashAccount
      })
    });
  } catch (error) {
    throw new Error(`Failed to fetch cash account: ${error.message}`);
  }
};

// 🔹 GET CASH BY ID
const getCashById = async (data, res) => {
  try {
    const { _id } = data;

    if (!_id) {
      return res.json({
        response: badRequest("Cash account ID is required")
      });
    }

    const cashAccount = await CashAccount.findOne({
      where: { _id }
    });

    if (!cashAccount) {
      return res.json({
        response: notFound("Cash account not found")
      });
    }

    res.json({
      response: ok({
        cash: cashAccount
      })
    });
  } catch (error) {
    throw new Error(`Failed to fetch cash account: ${error.message}`);
  }
};

// 🔹 CREATE CASH ACCOUNT
const saveCash = async (data, res) => {
  try {
    const { company_code, balance, date, description, cashName } = data;

    if (!company_code) {
      return res.json({
        response: badRequest("Company code is required")
      });
    }

    // Check if cash account already exists for this company
    const existingCash = await CashAccount.findOne({
      where: {
        company_code,
        cashName: cashName || 'cashInHand'
      }
    });

    if (existingCash) {
      return res.json({
        response: badRequest("Cash account already exists for this company")
      });
    }

    const cashData = {
      company_code,
      cashName: cashName || 'cashInHand',
      balance: parseFloat(balance) || 0.00,
      date: date ? new Date(date) : new Date(),
      description: description || '',
      created_at: Math.floor(Date.now() / 1000),
      modified_at: Math.floor(Date.now() / 1000)
    };

    const cashAccount = await CashAccount.create(cashData);

    res.json({
      response: ok({
        cash: cashAccount._id
      })
    });
  } catch (error) {
    throw new Error(`Failed to create cash account: ${error.message}`);
  }
};

// 🔹 UPDATE CASH ACCOUNT
const updateCash = async (data, res) => {
  try {
    const { _id, ...updateData } = data;

    if (!_id) {
      return res.json({
        response: badRequest("Cash account ID is required")
      });
    }

    const existingCash = await CashAccount.findOne({ where: { _id } });
    if (!existingCash) {
      return res.json({
        response: notFound("Cash account not found")
      });
    }

    // Convert balance to number if provided
    if (updateData.balance) {
      updateData.balance = parseFloat(updateData.balance);
    }

    // Convert date to Date object if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    updateData.modified_at = Math.floor(Date.now() / 1000);

    await CashAccount.update(updateData, {
      where: { _id }
    });

    res.json({
      response: ok({
        cash: _id
      })
    });
  } catch (error) {
    throw new Error(`Failed to update cash account: ${error.message}`);
  }
};

// 🔹 DELETE CASH ACCOUNT
const deleteCash = async (data, res) => {
  try {
    const { _id } = data;

    if (!_id) {
      return res.json({
        response: badRequest("Cash account ID is required")
      });
    }

    const existingCash = await CashAccount.findOne({ where: { _id } });
    if (!existingCash) {
      return res.json({
        response: notFound("Cash account not found")
      });
    }

    await CashAccount.destroy({
      where: { _id }
    });

    res.json({
      response: ok({
        cash: _id
      })
    });
  } catch (error) {
    throw new Error(`Failed to delete cash account: ${error.message}`);
  }
};

// 🔹 UPDATE CASH BALANCE (Add/Subtract)
const updateCashBalance = async (data, res) => {
  try {
    const { _id, amount, type, description } = data; // type: 'add' or 'subtract'

    if (!_id || !amount || !type) {
      return res.json({
        response: badRequest("Cash ID, amount and type are required")
      });
    }

    const cashAccount = await CashAccount.findOne({ where: { _id } });
    if (!cashAccount) {
      return res.json({
        response: notFound("Cash account not found")
      });
    }

    let newBalance = parseFloat(cashAccount.balance);
    const amountValue = parseFloat(amount);

    if (type === 'add') {
      newBalance += amountValue;
    } else if (type === 'subtract') {
      if (amountValue > newBalance) {
        return res.json({
          response: badRequest("Insufficient cash balance")
        });
      }
      newBalance -= amountValue;
    } else {
      return res.json({
        response: badRequest("Type must be 'add' or 'subtract'")
      });
    }

    await CashAccount.update({
      balance: newBalance,
      modified_at: Math.floor(Date.now() / 1000)
    }, {
      where: { _id }
    });

    // Here you can also create a transaction record if needed
    console.log(`Cash balance updated: ${type} ${amount}, New Balance: ${newBalance}`);

    res.json({
      response: ok({
        cash: _id,
        newBalance,
        previousBalance: cashAccount.balance,
        description: description || `${type} ${amount}`
      })
    });
  } catch (error) {
    throw new Error(`Failed to update cash balance: ${error.message}`);
  }
};

// 🔹 GET CASH HISTORY (Integration with Sales/Purchases)
const getCashHistory = async (data, res) => {
  try {
    const { _id } = data;

    if (!_id) {
      return res.json({
        response: badRequest("Cash account ID is required")
      });
    }

    const cashAccount = await CashAccount.findOne({ where: { _id } });
    if (!cashAccount) {
      return res.json({
        response: notFound("Cash account not found")
      });
    }

    // Get transactions linked to this cash account
    let sales = [];
    let purchases = [];

    try {
      const Sale = require('../billing/sale.model.js');
      const Purchase = require('../billing/purchase.model.js');

      sales = await Sale.findAll({
        where: { cash_id: _id },
        order: [['date', 'DESC']]
      });

      purchases = await Purchase.findAll({
        where: { cash_id: _id },
        order: [['date', 'DESC']]
      });
    } catch (importError) {
      console.log('Billing models not available yet');
    }

    res.json({
      response: ok({
        cashAccount,
        transactions: {
          sales,
          purchases
        }
      })
    });
  } catch (error) {
    throw new Error(`Failed to fetch cash history: ${error.message}`);
  }
};

// 🔹 SAVE CASH IN HAND
const saveCashInHand = async (data, res) => {
  try {
    const { company_code, balance, startDate, endDate } = data;

    if (!company_code) {
      return res.json({
        response: badRequest("Company code is required")
      });
    }

    // Find existing cash in hand account for the company
    let cashAccount = await CashAccount.findOne({
      where: {
        company_code,
        cashName: 'cashInHand'
      }
    });

    if (cashAccount) {
      // Update the existing account
      await CashAccount.update({
        balance: parseFloat(balance) || 0.00,
        date: startDate ? new Date(startDate) : new Date(),
        modified_at: Math.floor(Date.now() / 1000)
      }, {
        where: { _id: cashAccount._id }
      });

      res.json({
        response: ok({
          message: "Cash in hand updated successfully",
          cash: cashAccount._id,
          newBalance: parseFloat(balance) || 0.00
        })
      });
    } else {
      // Create new cash in hand account
      const cashData = {
        company_code,
        cashName: 'cashInHand',
        balance: parseFloat(balance) || 0.00,
        date: startDate ? new Date(startDate) : new Date(),
        description: `Cash in hand for company ${company_code}`,
        created_at: Math.floor(Date.now() / 1000),
        modified_at: Math.floor(Date.now() / 1000)
      };

      cashAccount = await CashAccount.create(cashData);

      res.json({
        response: ok({
          message: "Cash in hand created successfully",
          cash: cashAccount._id,
          newBalance: parseFloat(balance) || 0.00
        })
      });
    }
  } catch (error) {
    throw new Error(`Failed to save cash in hand: ${error.message}`);
  }
};

// 🔹 GET CASH IN HAND AND BANK ACCOUNTS BY COMPANY
const getCashInHandBankByCompany = async (data, res) => {
  try {
    const { company_code } = data;

    if (!company_code) {
      return res.json({
        response: badRequest("Company code is required")
      });
    }

    // Get all bank accounts for the company
    const banks = await BankAccount.findAll({
      where: { company_code },
      order: [['created_at', 'DESC']]
    });

    // Get cash in hand account for the company (specific cashName)
    const cashInHand = await CashAccount.findOne({
      where: {
        company_code,
        cashName: 'cashInHand'
      }
    });

    // If no cash account exists, create one automatically
    let cashAccount = cashInHand;
    if (!cashAccount) {
      cashAccount = await CashAccount.create({
        company_code,
        cashName: 'cashInHand',
        balance: 0.00,
        date: new Date(),
        description: '',
        created_at: Math.floor(Date.now() / 1000),
        modified_at: Math.floor(Date.now() / 1000)
      });
    }

    // Calculate total bank balance
    const totalBankBalance = banks.reduce((total, bank) => {
      return total + parseFloat(bank.balance || 0);
    }, 0);

    // Get cash balance
    const cashBalance = parseFloat(cashAccount.balance || 0);

    res.json({
      response: ok({
        banks,
        cashInHand: cashAccount,
        summary: {
          totalBankBalance,
          cashBalance,
          totalBalance: totalBankBalance + cashBalance
        }
      })
    });
  } catch (error) {
    throw new Error(`Failed to fetch cash in hand and bank accounts: ${error.message}`);
  }
};

// 🔹 UTILITY METHODS FOR CASH ACCOUNT MANAGEMENT

// Create cash account with proper balance
const createCashAccountWithBalance = async (data, res) => {
  try {
    const { company_code, cashName, balance, description } = data;

    if (!company_code || !cashName || balance === undefined) {
      return res.json({
        response: badRequest("Company code, cash name, and balance are required")
      });
    }

    // Check if cash account already exists
    const existingCash = await CashAccount.findOne({
      where: { company_code, cashName }
    });

    if (existingCash) {
      return res.json({
        response: badRequest("Cash account already exists for this company with this name")
      });
    }

    const cashAccount = await CashAccount.create({
      company_code,
      cashName,
      balance: parseFloat(balance),
      date: new Date(),
      description: description || '',
      created_at: Math.floor(Date.now() / 1000),
      modified_at: Math.floor(Date.now() / 1000)
    });

    res.json({
      response: ok({
        message: "Cash account created successfully",
        cashAccount: {
          _id: cashAccount._id,
          company_code: cashAccount.company_code,
          cashName: cashAccount.cashName,
          balance: cashAccount.balance,
          description: cashAccount.description
        }
      })
    });
  } catch (error) {
    throw new Error(`Failed to create cash account: ${error.message}`);
  }
};

// Update cash account balance directly
const setCashAccountBalance = async (data, res) => {
  try {
    const { _id, balance, description } = data;

    if (!_id || balance === undefined) {
      return res.json({
        response: badRequest("Cash account ID and balance are required")
      });
    }

    const cashAccount = await CashAccount.findOne({ where: { _id } });
    if (!cashAccount) {
      return res.json({
        response: notFound("Cash account not found")
      });
    }

    const previousBalance = parseFloat(cashAccount.balance);
    const newBalance = parseFloat(balance);

    await CashAccount.update({
      balance: newBalance,
      modified_at: Math.floor(Date.now() / 1000)
    }, {
      where: { _id }
    });

    res.json({
      response: ok({
        message: "Cash account balance updated successfully",
        cashAccount: {
          _id: cashAccount._id,
          company_code: cashAccount.company_code,
          cashName: cashAccount.cashName,
          previousBalance,
          newBalance,
          description: description || `Balance updated to ${newBalance}`
        }
      })
    });
  } catch (error) {
    throw new Error(`Failed to update cash balance: ${error.message}`);
  }
};

// Enhanced main handler to include new methods
const handleCashRequestEnhanced = async (req, res) => {
  try {
    const { method, data } = req.body.request;

    console.log('Cash API Called:', method, data);

    switch (method) {
      case 'getCashByCompany':
        return await getCashByCompany(data, res);

      case 'getCashById':
        return await getCashById(data, res);

      case 'saveCash':
        return await saveCash(data, res);

      case 'updateCash':
        return await updateCash(data, res);

      case 'deleteCash':
        return await deleteCash(data, res);

      case 'updateCashBalance':
        return await updateCashBalance(data, res);

      case 'getCashHistory':
        return await getCashHistory(data, res);

      case 'getCashInHandBankByCompany':
        return await getCashInHandBankByCompany(data, res);

      case 'saveCashInHand':
        return await saveCashInHand(data, res);

      // New utility methods
      case 'createCashAccountWithBalance':
        return await createCashAccountWithBalance(data, res);

      case 'setCashAccountBalance':
        return await setCashAccountBalance(data, res);

      default:
        return res.json({
          response: notFound(`Method ${method} not found`)
        });
    }
  } catch (error) {
    console.error('Cash API Error:', error);
    res.json({
      response: serverError(error.message)
    });
  }
};

module.exports = {
  handleCashRequest,
  handleCashRequestEnhanced,
  createCashAccountWithBalance,
  setCashAccountBalance
};
