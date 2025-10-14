const { Op } = require("sequelize");
const Ledger = require("./ledger.model");
const Transaction = require("./transaction.model");
const { ok, badRequest, serverError } = require("../utils/response");

function validateCompanyAccess(company_code, user_company) {
  if (company_code !== user_company) {
    const err = new Error("Unauthorized access to company data");
    err.status = 401;
    throw err;
  }
}

exports.getByCompany = async (req, res) => {
  try {
    const { company_code } = req.query;
    let { ledgerRegions = [], next_page_token } = req.query;
    if (!company_code) return res.status(400).json(badRequest("company_code required"));

    validateCompanyAccess(company_code, company_code);

    const limit = 20;
    const where = { company_code };
    if (typeof ledgerRegions === "string") ledgerRegions = [ledgerRegions];
    if (Array.isArray(ledgerRegions) && ledgerRegions.length) {
      where.region = { [Op.in]: ledgerRegions };
    }

    const cursor = next_page_token ? { id: { [Op.gt]: Number(next_page_token) } } : {};
    const ledgers = await Ledger.findAll({
      where: { ...where, ...cursor },
      limit: limit + 1,
      order: [["id", "ASC"]],
    });

    let nextToken = "";
    if (ledgers.length > limit) {
      nextToken = String(ledgers[limit - 1].id);
      ledgers.length = limit;
    }

    const ids = ledgers.map((l) => l.id);
    let salesTotal = 0;
    let purchasesTotal = 0;
    if (ids.length) {
      const txAgg = await Transaction.findAll({
        attributes: ["ledger_id", "direction", "remainingAmount"],
        where: { ledger_id: { [Op.in]: ids } },
      });
      txAgg.forEach((t) => {
        if (t.direction === "sale") salesTotal += Number(t.remainingAmount || 0);
        if (t.direction === "purchase") purchasesTotal += Number(t.remainingAmount || 0);
      });
    }

    return res.json(
      ok({
        current_page_token: String(ledgers[0]?.id || ""),
        next_page_token: nextToken,
        salesTotal,
        purchasesTotal,
        ledgers,
      })
    );
  } catch (e) {
    const code = e.status || 500;
    return res.status(code).json(serverError(e.message));
  }
};

exports.saveLedger = async (req, res) => {
  try {
    const { ledger } = (req.body && req.body.data) || {};
    if (!ledger) return res.status(400).json(badRequest("ledger required"));
    const { name, company_code, ledgerType } = ledger;
    if (!name || !company_code || !ledgerType) {
      return res.status(400).json(badRequest("name, company_code, ledgerType required"));
    }
    validateCompanyAccess(company_code, company_code);

    let saved;
    if (ledger._id) {
      saved = await Ledger.findByPk(ledger._id);
      if (!saved) return res.status(404).json(badRequest("ledger not found"));
      await saved.update({ ...ledger, modified_at: Math.floor(Date.now() / 1000) });
    } else {
      saved = await Ledger.create({
        name: ledger.name,
        company_code: ledger.company_code,
        ledgerType: ledger.ledgerType,
        address: ledger.address,
        region: ledger.region,
        phoneNo: ledger.phoneNo,
        dueDate: ledger.dueDate,
      });
    }
    return res.json(ok({ ledger: saved }));
  } catch (e) {
    const code = e.status || 500;
    return res.status(code).json(serverError(e.message));
  }
};

exports.deleteLedger = async (req, res) => {
  try {
    const { ledger_id, company_code } = (req.body && req.body.data) || req.query || {};
    if (!ledger_id || !company_code) return res.status(400).json(badRequest("ledger_id, company_code required"));
    validateCompanyAccess(company_code, company_code);

    const ledger = await Ledger.findByPk(ledger_id);
    if (!ledger) return res.status(404).json(badRequest("ledger not found"));

    if (
      Number(ledger.saleTotal) !== 0 ||
      Number(ledger.purchaseTotal) !== 0 ||
      Number(ledger.depositedSalesTotal) !== 0 ||
      Number(ledger.depositedPurchaseTotal) !== 0
    ) {
      return res.status(400).json(badRequest("Cannot delete ledger with non-zero balances"));
    }

    await Transaction.destroy({ where: { ledger_id: ledger.id } });
    await ledger.destroy();
    return res.json(ok({}));
  } catch (e) {
    const code = e.status || 500;
    return res.status(code).json(serverError(e.message));
  }
};


