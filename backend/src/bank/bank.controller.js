const { Op } = require("sequelize");
const Bank = require("./bank.model");
const Transaction = require("../transaction/transaction.model");
const { ok, badRequest, serverError } = require("../utils/response");

function validateCompanyAccess(company_code, user_company) {
  if (company_code !== user_company) {
    const err = new Error("Unauthorized access to company data");
    err.status = 401;
    throw err;
  }
}

exports.list = async (req, res) => {
  try {
    const { company_code, q = "" } = req.query;
    if (!company_code) return res.status(400).json(badRequest("company_code required"));
    validateCompanyAccess(company_code, company_code);

    const where = { company_code };
    if (q) where.name = { [Op.iLike]: `%${q}%` };

    const banks = await Bank.findAll({ where, order: [["name", "ASC"]] });
    return res.json(ok({ banks }));
  } catch (e) {
    return res.status(e.status || 500).json(serverError(e.message));
  }
};

exports.get = async (req, res) => {
  try {
    const { id, company_code } = req.query;
    if (!id || !company_code) return res.status(400).json(badRequest("id, company_code required"));
    validateCompanyAccess(company_code, company_code);

    const bank = await Bank.findOne({ where: { id, company_code } });
    if (!bank) return res.status(404).json(badRequest("bank not found"));
    return res.json(ok({ bank }));
  } catch (e) {
    return res.status(e.status || 500).json(serverError(e.message));
  }
};

exports.save = async (req, res) => {
  try {
    const { bank } = (req.body && req.body.data) || {};
    if (!bank) return res.status(400).json(badRequest("bank required"));
    const { company_code, name } = bank;
    if (!company_code || !name) return res.status(400).json(badRequest("company_code, name required"));
    validateCompanyAccess(company_code, company_code);

    let saved;
    if (bank.id) {
      saved = await Bank.findOne({ where: { id: bank.id, company_code } });
      if (!saved) return res.status(404).json(badRequest("bank not found"));
      await saved.update({
        name: bank.name,
        account_number: bank.account_number,
        branch: bank.branch,
        opening_balance: bank.opening_balance ?? saved.opening_balance,
        balance: bank.balance ?? saved.balance,
        modified_at: Math.floor(Date.now() / 1000),
      });
    } else {
      saved = await Bank.create({
        company_code: bank.company_code,
        name: bank.name,
        account_number: bank.account_number,
        branch: bank.branch,
        opening_balance: Number(bank.opening_balance || 0),
        balance: Number(bank.balance != null ? bank.balance : bank.opening_balance || 0),
      });
    }
    return res.json(ok({ bank: saved }));
  } catch (e) {
    return res.status(e.status || 500).json(serverError(e.message));
  }
};

exports.remove = async (req, res) => {
  try {
    const { id, company_code } = (req.body && req.body.data) || req.query || {};
    if (!id || !company_code) return res.status(400).json(badRequest("id, company_code required"));
    validateCompanyAccess(company_code, company_code);

    const bank = await Bank.findOne({ where: { id, company_code } });
    if (!bank) return res.status(404).json(badRequest("bank not found"));
    if (Number(bank.balance) !== Number(bank.opening_balance)) {
      // optionally enforce zero balance before delete
    }
    await bank.destroy();
    return res.json(ok({}));
  } catch (e) {
    return res.status(e.status || 500).json(serverError(e.message));
  }
};

// Bank transaction history (payments and invoices where payment_method is bank/cheque and bank_id matches)
exports.history = async (req, res) => {
  try {
    const { company_code, bank_id, start_date, end_date } = req.query;
    if (!company_code || !bank_id) return res.status(400).json(badRequest("company_code, bank_id required"));
    validateCompanyAccess(company_code, company_code);

    const where = { company_code, bank_id, payment_method: { [Op.in]: ["bank", "cheque"] } };
    if (start_date || end_date) {
      where.date = {};
      if (start_date) where.date[Op.gte] = Number(start_date);
      if (end_date) where.date[Op.lte] = Number(end_date);
    }
    const txns = await Transaction.findAll({ where, order: [["date", "DESC"]] });
    return res.json(ok({ transactions: txns }));
  } catch (e) {
    return res.status(e.status || 500).json(serverError(e.message));
  }
};


