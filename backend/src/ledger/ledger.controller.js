const { Op } = require("sequelize");
const Ledger = require("./ledger.model");
const Transaction = require("../transaction/transaction.model");
const Bank = require("../bank/bank.account.model");
const { sequelize } = require("../config/database");

// CREATE LEDGER
exports.createLedger = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { name, type, opening_balance, contact_number, email, address } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "Name and type are required"
      });
    }

    // Check for duplicate ledger name in company
    const existingLedger = await Ledger.findOne({
      where: { company_code, name }
    });

    if (existingLedger) {
      return res.status(400).json({
        success: false,
        message: "Ledger with this name already exists"
      });
    }

    const ledger = await Ledger.create({
      company_code,
      name,
      type,
      opening_balance: opening_balance || 0,
      current_balance: opening_balance || 0,
      contact_number,
      email,
      address
    });

    res.status(201).json({
      success: true,
      message: "Ledger created successfully",
      data: ledger
    });

  } catch (error) {
    console.error("Create Ledger Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// GET ALL LEDGERS WITH TRANSACTIONS AND BANKS
exports.getAllLedgers = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { page = 1, limit = 10, type, search, include_banks = false } = req.query;

    const where = { company_code };
    
    if (type) where.type = type;
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const offset = (page - 1) * limit;

    const include = [{
      model: Transaction,
      as: 'transactions',
      attributes: ['id', 'amount', 'type', 'created_at'],
      limit: 5,
      order: [['created_at', 'DESC']]
    }];

    // ✅ ADD BANK INCLUSION IF REQUESTED
    if (include_banks === 'true') {
      include.push({
        model: Bank,
        as: 'banks',
        attributes: ['id', 'bank_name', 'account_number', 'current_balance', 'is_active']
      });
    }

    const { count, rows: ledgers } = await Ledger.findAndCountAll({
      where,
      include,
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        ledgers,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error("Get Ledgers Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// GET LEDGER DETAILS WITH FULL TRANSACTION HISTORY AND BANKS
exports.getLedgerDetails = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const ledger = await Ledger.findOne({
      where: { id, company_code },
      include: [{
        model: Bank,
        as: 'banks',
        attributes: ['id', 'bank_name', 'account_number', 'current_balance', 'account_type', 'is_active']
      }]
    });

    if (!ledger) {
      return res.status(404).json({
        success: false,
        message: "Ledger not found"
      });
    }

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: { ledger_id: id },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        ledger,
        transactions: {
          items: transactions,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      }
    });

  } catch (error) {
    console.error("Get Ledger Details Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// GET LEDGER WITH BANK ACCOUNTS (SPECIFIC FOR BANK OPERATIONS)
exports.getLedgerWithBanks = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { id } = req.params;

    const ledger = await Ledger.findOne({
      where: { id, company_code },
      include: [{
        model: Bank,
        as: 'banks',
        attributes: { exclude: ['created_at', 'modified_at'] },
        where: { is_active: true } // Only active banks
      }]
    });

    if (!ledger) {
      return res.status(404).json({
        success: false,
        message: "Ledger not found"
      });
    }

    // Calculate total bank balance for this ledger
    const totalBankBalance = await Bank.sum('current_balance', {
      where: { 
        ledger_id: id, 
        company_code,
        is_active: true 
      }
    });

    res.json({
      success: true,
      data: {
        ledger,
        bank_summary: {
          total_bank_balance: totalBankBalance || 0,
          bank_count: ledger.banks ? ledger.banks.length : 0
        }
      }
    });

  } catch (error) {
    console.error("Get Ledger With Banks Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// GET LEDGERS BY TYPE WITH BANK SUMMARY
exports.getLedgersByTypeWithBanks = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { type } = req.params;

    const ledgers = await Ledger.findAll({
      where: { 
        company_code, 
        type,
        is_active: true 
      },
      include: [{
        model: Bank,
        as: 'banks',
        attributes: ['id', 'bank_name', 'account_number', 'current_balance'],
        where: { is_active: true },
        required: false // Left join to include ledgers without banks
      }],
      order: [['name', 'ASC']]
    });

    // Calculate summary
    const summary = {
      total_ledgers: ledgers.length,
      total_bank_accounts: 0,
      total_bank_balance: 0
    };

    ledgers.forEach(ledger => {
      if (ledger.banks) {
        summary.total_bank_accounts += ledger.banks.length;
        ledger.banks.forEach(bank => {
          summary.total_bank_balance += parseFloat(bank.current_balance || 0);
        });
      }
    });

    res.json({
      success: true,
      data: {
        ledgers,
        summary
      }
    });

  } catch (error) {
    console.error("Get Ledgers By Type With Banks Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// UPDATE LEDGER
exports.updateLedger = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const ledger = await Ledger.findOne({ where: { id, company_code } });

    if (!ledger) {
      return res.status(404).json({
        success: false,
        message: "Ledger not found"
      });
    }

    // Check for duplicate name if changing
    if (updateData.name && updateData.name !== ledger.name) {
      const existing = await Ledger.findOne({
        where: { company_code, name: updateData.name, id: { [Op.ne]: id } }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Ledger with this name already exists"
        });
      }
    }

    await ledger.update(updateData);

    res.json({
      success: true,
      message: "Ledger updated successfully",
      data: ledger
    });

  } catch (error) {
    console.error("Update Ledger Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// DELETE LEDGER (WITH BANK CHECK)
exports.deleteLedger = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { company_code } = req.user;
    const { id } = req.params;

    const ledger = await Ledger.findOne({
      where: { id, company_code },
      include: [{
        model: Bank,
        as: 'banks'
      }],
      transaction
    });

    if (!ledger) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Ledger not found"
      });
    }

    // Check if ledger has banks
    if (ledger.banks && ledger.banks.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete ledger with associated bank accounts. Delete bank accounts first."
      });
    }

    // Check if ledger has transactions
    const transactionCount = await Transaction.count({
      where: { ledger_id: id },
      transaction
    });

    if (transactionCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete ledger with existing transactions"
      });
    }

    await ledger.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Ledger deleted successfully"
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Delete Ledger Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// GET LEDGER SUMMARY WITH BANKS
exports.getLedgerSummary = async (req, res) => {
  try {
    const { company_code } = req.user;

    // Get ledger counts by type
    const ledgerCounts = await Ledger.findAll({
      where: { company_code },
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('current_balance')), 'total_balance']
      ],
      group: ['type'],
      raw: true
    });

    // Get bank summary
    const bankSummary = await Bank.findAll({
      where: { company_code, is_active: true },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_banks'],
        [sequelize.fn('SUM', sequelize.col('current_balance')), 'total_bank_balance']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        ledger_summary: ledgerCounts,
        bank_summary: bankSummary[0] || { total_banks: 0, total_bank_balance: 0 }
      }
    });

  } catch (error) {
    console.error("Get Ledger Summary Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
