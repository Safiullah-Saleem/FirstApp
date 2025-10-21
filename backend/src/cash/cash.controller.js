const { Op } = require("sequelize");
const Cash = require("./cash.model");
const Ledger = require("../ledger/ledger.model");
const { sequelize } = require("../config/database");

// CREATE CASH ACCOUNT
exports.createCash = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { company_code } = req.user;
    const { ledger_id, cash_name, opening_balance, location } = req.body;

    if (!ledger_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Ledger ID is required"
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

    const cash = await Cash.create({
      company_code,
      ledger_id,
      cash_name: cash_name || "Cash in Hand",
      opening_balance: opening_balance || 0,
      current_balance: opening_balance || 0,
      location
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Cash account created successfully",
      data: cash
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Create Cash Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// GET ALL CASH ACCOUNTS
exports.getAllCash = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: cashAccounts } = await Cash.findAndCountAll({
      where: { company_code },
      include: [{
        model: Ledger,
        as: 'ledger',
        attributes: ['id', 'name']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        cash_accounts: cashAccounts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error("Get Cash Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// GET CASH BALANCE
exports.getCashBalance = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { id } = req.params;

    const cash = await Cash.findOne({
      where: { id, company_code },
      include: [{
        model: Ledger,
        as: 'ledger',
        attributes: ['id', 'name']
      }]
    });

    if (!cash) {
      return res.status(404).json({
        success: false,
        message: "Cash account not found"
      });
    }

    res.json({
      success: true,
      data: cash
    });

  } catch (error) {
    console.error("Get Cash Balance Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// UPDATE CASH ACCOUNT
exports.updateCash = async (req, res) => {
  try {
    const { company_code } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const cash = await Cash.findOne({ where: { id, company_code } });

    if (!cash) {
      return res.status(404).json({
        success: false,
        message: "Cash account not found"
      });
    }

    await cash.update(updateData);

    res.json({
      success: true,
      message: "Cash account updated successfully",
      data: cash
    });

  } catch (error) {
    console.error("Update Cash Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// DELETE CASH ACCOUNT
exports.deleteCash = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { company_code } = req.user;
    const { id } = req.params;

    const cash = await Cash.findOne({
      where: { id, company_code },
      transaction
    });

    if (!cash) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Cash account not found"
      });
    }

    // Check if cash has balance
    if (parseFloat(cash.current_balance) !== 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete cash account with non-zero balance"
      });
    }

    await cash.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Cash account deleted successfully"
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Delete Cash Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};