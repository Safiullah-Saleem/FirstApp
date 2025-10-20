const { Op } = require("sequelize");
const Transaction = require("./transaction.model");
const Ledger = require("../ledger/ledger.model");
const Bank = require("../bank/bank.account.model");
const Cash = require("../cash/cash.model");
const { sequelize } = require("../config/database");

// CREATE TRANSACTION
exports.createTransaction = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { company_code } = req.user;
    const { 
      ledger_id, 
      bank_id, 
      cash_id, 
      transaction_type, 
      payment_mode, 
      amount, 
      description, 
      reference_number 
    } = req.body;

    // Validation
    if (!ledger_id || !transaction_type || !payment_mode || !amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Ledger ID, transaction type, payment mode, and amount are required"
      });
    }

    if (amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0"
      });
    }

    // Verify ledger exists
    const ledger = await Ledger.findOne({
      where: { id: ledger_id, company_code },
      transaction
    });

    if (!ledger) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Ledger not found"
      });
    }

    // Verify bank if payment mode is bank
    if (payment_mode === "bank" && bank_id) {
      const bank = await Bank.findOne({
        where: { id: bank_id, company_code },
        transaction
      });

      if (!bank) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Bank account not found"
        });
      }
    }

    // Verify cash if payment mode is cash
    if (payment_mode === "cash" && cash_id) {
      const cash = await Cash.findOne({
        where: { id: cash_id, company_code },
        transaction
      });

      if (!cash) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Cash account not found"
        });
      }
    }

    // Create transaction
    const newTransaction = await Transaction.create({
      company_code,
      ledger_id,
      bank_id: payment_mode === "bank" ? bank_id : null,
      cash_id: payment_mode === "cash" ? cash_id : null,
      transaction_type,
      payment_mode,
      amount,
      description,
      reference_number,
      transaction_date: Date.now()
    }, { transaction });

    // Update ledger balance based on transaction type
    let newBalance = parseFloat(ledger.current_balance);
    
    if (transaction_type === "sale" || transaction_type === "receipt" || transaction_type === "income") {
      newBalance += parseFloat(amount);
    } else if (transaction_type === "purchase" || transaction_type === "payment" || transaction_type === "expense") {
      newBalance -= parseFloat(amount);
    }

    await ledger.update({ current_balance: newBalance }, { transaction });

    // Update bank balance if bank transaction
    if (payment_mode === "bank" && bank_id) {
      const bank = await Bank.findByPk(bank_id, { transaction });
      let bankBalance = parseFloat(bank.current_balance);
      
      if (transaction_type === "receipt" || transaction_type === "income") {
        bankBalance += parseFloat(amount);
      } else if (transaction_type === "payment" || transaction_type === "expense") {
        bankBalance -= parseFloat(amount);
      }

      await bank.update({ current_balance: bankBalance }, { transaction });
    }

    // Update cash balance if cash transaction
    if (payment_mode === "cash" && cash_id) {
      const cash = await Cash.findByPk(cash_id, { transaction });
      let cashBalance = parseFloat(cash.current_balance);
      
      if (transaction_type === "receipt" || transaction_type === "income") {
        cashBalance += parseFloat(amount);
      } else if (transaction_type === "payment" || transaction_type === "expense") {
        cashBalance -= parseFloat(amount);
      }

      await cash.update({ current_balance: cashBalance }, { transaction });
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: newTransaction
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Create Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// GET ALL TRANSACTIONS
exports.getAllTransactions = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { 
      page = 1, 
      limit = 20, 
      ledger_id, 
      transaction_type, 
      payment_mode,
      start_date,
      end_date
    } = req.query;

    const where = { company_code };
    
    if (ledger_id) where.ledger_id = ledger_id;
    if (transaction_type) where.transaction_type = transaction_type;
    if (payment_mode) where.payment_mode = payment_mode;
    
    if (start_date && end_date) {
      where.transaction_date = {
        [Op.between]: [parseInt(start_date), parseInt(end_date)]
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where,
      include: [
        {
          model: Ledger,
          as: 'ledger',
          attributes: ['id', 'name', 'type']
        },
        {
          model: Bank,
          as: 'bank',
          attributes: ['id', 'bank_name', 'account_number']
        },
        {
          model: Cash,
          as: 'cash',
          attributes: ['id', 'cash_name']
        }
      ],
      order: [['transaction_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error("Get Transactions Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// GET TRANSACTION BY ID
exports.getTransactionById = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      where: { id, company_code },
      include: [
        {
          model: Ledger,
          as: 'ledger',
          attributes: ['id', 'name', 'type']
        },
        {
          model: Bank,
          as: 'bank',
          attributes: ['id', 'bank_name', 'account_number']
        },
        {
          model: Cash,
          as: 'cash',
          attributes: ['id', 'cash_name']
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error("Get Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// DELETE TRANSACTION
exports.deleteTransaction = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { company_code } = req.user;
    const { id } = req.params;

    const existingTransaction = await Transaction.findOne({
      where: { id, company_code },
      transaction
    });

    if (!existingTransaction) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    // Reverse the balances (this is complex - in real app you might want to prevent deletion)
    await existingTransaction.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Transaction deleted successfully"
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Delete Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};