const BankAccount = require('./bank.account.model.js');
const { ok, badRequest, notFound, serverError } = require('../utils/response');

const handleBankRequest = async (req, res) => {
  try {
    const { method, data } = req.body.request;
    
    console.log('Bank API Called:', method, data);
    
    switch (method) {
      case 'getBanksByCompany':
        return await getBanksByCompany(data, res);
      
      case 'getBankById':
        return await getBankById(data, res);
      
      case 'saveBank':
        return await saveBank(data, res);
      
      case 'updateBank':
        return await updateBank(data, res);
      
      case 'deleteBank':
        return await deleteBank(data, res);
      
      case 'getBankHistory':
        return await getBankHistory(data, res);

      case 'getCashInHandBankByCompany':
        return await getCashInHandBankByCompany(data, res);

      default:
        return res.json({
          response: notFound(`Method ${method} not found`)
        });
    }
  } catch (error) {
    console.error('Bank API Error:', error);
    res.json({
      response: serverError(error.message)
    });
  }
};

// 🔹 GET ALL BANKS BY COMPANY
const getBanksByCompany = async (data, res) => {
  try {
    const { company_code } = data;
    
    if (!company_code) {
      return res.json({
        response: badRequest("Company code is required")
      });
    }

    const banks = await BankAccount.findAll({
      where: { company_code },
      order: [['created_at', 'DESC']]
    });

    res.json({
      response: ok({ banks })
    });
  } catch (error) {
    throw new Error(`Failed to fetch banks: ${error.message}`);
  }
};

// 🔹 GET SINGLE BANK BY ID
const getBankById = async (data, res) => {
  try {
    const { id } = data;
    
    if (!id) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Bank ID is required"
          }
        }
      });
    }

    const bank = await BankAccount.findOne({
      where: { id }
    });

    if (!bank) {
      return res.json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Bank not found"
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
        data: { bank }
      }
    });
  } catch (error) {
    throw new Error(`Failed to fetch bank: ${error.message}`);
  }
};

// 🔹 CREATE NEW BANK
const saveBank = async (data, res) => {
  try {
    const { company_code, bankName, balance, date, accountNumber } = data;
    
    if (!company_code || !bankName) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Company code and bank name are required"
          }
        }
      });
    }

    const bankData = {
      company_code,
      bankName,
      balance: parseFloat(balance) || 0,
      date: date || new Date(),
      accountNumber: accountNumber || '',
      created_at: Math.floor(Date.now() / 1000),
      modified_at: Math.floor(Date.now() / 1000)
    };

    const bank = await BankAccount.create(bankData);

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Bank created successfully"
        },
        data: { 
          bank: bank.id 
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to create bank: ${error.message}`);
  }
};

// 🔹 UPDATE BANK
const updateBank = async (data, res) => {
  try {
    const { id, ...updateData } = data;
    
    if (!id) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Bank ID is required"
          }
        }
      });
    }

    const existingBank = await BankAccount.findOne({ where: { id } });
    if (!existingBank) {
      return res.json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Bank not found"
          }
        }
      });
    }

    // Convert balance to number if provided
    if (updateData.balance) {
      updateData.balance = parseFloat(updateData.balance);
    }
    
    updateData.modified_at = Math.floor(Date.now() / 1000);

    await BankAccount.update(updateData, {
      where: { id }
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Bank updated successfully"
        },
        data: { 
          bank: id 
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to update bank: ${error.message}`);
  }
};

// 🔹 DELETE BANK
const deleteBank = async (data, res) => {
  try {
    const { id } = data;
    
    if (!id) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Bank ID is required"
          }
        }
      });
    }

    const existingBank = await BankAccount.findOne({ where: { id } });
    if (!existingBank) {
      return res.json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Bank not found"
          }
        }
      });
    }

    await BankAccount.destroy({
      where: { id }
    });

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Bank deleted successfully"
        },
        data: { 
          bank: id 
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to delete bank: ${error.message}`);
  }
};

// 🔹 GET BANK HISTORY (Integration with Sales/Purchases)
const getBankHistory = async (data, res) => {
  try {
    const { id } = data;
    
    if (!id) {
      return res.json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Bank ID is required"
          }
        }
      });
    }

    const bank = await BankAccount.findOne({ where: { id } });
    if (!bank) {
      return res.json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Bank not found"
          }
        }
      });
    }

    // Get transactions linked to this bank
    let sales = [];
    let purchases = [];
    
    try {
      const Sale = require('../billing/sale.model.js');
      const Purchase = require('../billing/purchase.model.js');
      
      sales = await Sale.findAll({
        where: { bank_id: id },
        order: [['date', 'DESC']]
      });
      
      purchases = await Purchase.findAll({
        where: { bank_id: id },
        order: [['date', 'DESC']]
      });
    } catch (importError) {
      console.log('Billing models not available yet');
    }

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK"
        },
        data: {
          bank,
          transactions: {
            sales,
            purchases
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to fetch bank history: ${error.message}`);
  }
};

// 🔹 GET CASH IN HAND AND BANK ACCOUNTS BY COMPANY
const getCashInHandBankByCompany = async (data, res) => {
  try {
    const { company_code } = data;

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

    // Get all bank accounts for the company
    const banks = await BankAccount.findAll({
      where: { company_code },
      order: [['created_at', 'DESC']]
    });

    // Get cash in hand account for the company
    let cashInHand = null;
    try {
      const CashAccount = require('../cash/cash.account.model.js');
      cashInHand = await CashAccount.findOne({
        where: {
          company_code,
          cashName: 'cashInHand'
        }
      });

      // If no cash account exists, create one automatically
      if (!cashInHand) {
        cashInHand = await CashAccount.create({
          company_code,
          cashName: 'cashInHand',
          balance: 0.00,
          date: new Date(),
          description: '',
          created_at: Math.floor(Date.now() / 1000),
          modified_at: Math.floor(Date.now() / 1000)
        });
      }
    } catch (importError) {
      console.log('Cash model not available yet');
    }

    // Calculate total bank balance
    const totalBankBalance = banks.reduce((total, bank) => {
      return total + parseFloat(bank.balance || 0);
    }, 0);

    // Get cash in hand balance
    const cashBalance = cashInHand ? parseFloat(cashInHand.balance || 0) : 0;

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK"
        },
        data: {
          banks,
          cashInHand,
          summary: {
            totalBankBalance,
            cashBalance,
            totalBalance: totalBankBalance + cashBalance
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to fetch cash in hand and bank accounts: ${error.message}`);
  }
};

module.exports = {
  handleBankRequest
};
