const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const Transaction = require("./transaction.model");
const Ledger = require("../ledger/ledger.model");
const { ok, badRequest, serverError } = require("../utils/response");

function validateCompanyAccess(company_code, user_company) {
  if (company_code !== user_company) {
    const err = new Error("Unauthorized access to company data");
    err.status = 401;
    throw err;
  }
}

function calcRemaining(total, deposited) {
  const t = Number(total || 0);
  const d = Number(deposited || 0);
  if (t < 0 || d < 0) throw new Error("Amounts must be >= 0");
  return t - d;
}

async function recalcLedgerTotals(ledgerId, t) {
  const txns = await Transaction.findAll({ where: { ledger_id: ledgerId }, transaction: t });
  let saleTotal = 0,
    purchaseTotal = 0,
    depositedSalesTotal = 0,
    depositedPurchaseTotal = 0;
  for (const x of txns) {
    if (x.direction === "sale") {
      saleTotal += Number(x.remainingAmount || 0);
      depositedSalesTotal += Number(x.depositedAmount || 0);
    } else if (x.direction === "purchase") {
      purchaseTotal += Number(x.remainingAmount || 0);
      depositedPurchaseTotal += Number(x.depositedAmount || 0);
    }
  }
  await Ledger.update(
    { saleTotal, purchaseTotal, depositedSalesTotal, depositedPurchaseTotal, modified_at: Math.floor(Date.now() / 1000) },
    { where: { id: ledgerId }, transaction: t }
  );
}

function genSr(prefix = "") {
  const base = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  return prefix ? `${prefix}-${base}` : base;
}

exports.addSale = async (req, res) => {
  const trx = await sequelize.transaction();
  try {
    const { ledger_id, company_code, transaction } = (req.body && req.body.data) || {};
    if (!ledger_id || !company_code || !transaction) return res.status(400).json(badRequest("ledger_id, company_code, transaction required"));
    validateCompanyAccess(company_code, company_code);

    const { srNum, date, detail, totalAmount, depositedAmount = 0, billNumber, isReturn = false, invoiceNumber } = transaction;
    if (totalAmount == null || Number(totalAmount) < 0) return res.status(400).json(badRequest("totalAmount >= 0 required"));
    if (Number(depositedAmount) < 0) return res.status(400).json(badRequest("depositedAmount >= 0 required"));

    const remainingAmount = calcRemaining(totalAmount, depositedAmount);
    const created = await Transaction.create(
      {
        ledger_id,
        company_code,
        srNum: srNum || genSr("INV"),
        date: date || Math.floor(Date.now() / 1000),
        detail,
        totalAmount,
        depositedAmount,
        remainingAmount,
        billNumber,
        isReturn: !!isReturn,
        type: "invoice",
        invoiceNumber,
        direction: "sale",
      },
      { transaction: trx }
    );

    await recalcLedgerTotals(ledger_id, trx);
    await trx.commit();
    return res.json(ok({ transaction: created }));
  } catch (e) {
    await trx.rollback();
    return res.status(e.status || 500).json(serverError(e.message));
  }
};

exports.addPurchase = async (req, res) => {
  const trx = await sequelize.transaction();
  try {
    const { ledger_id, company_code, transaction } = (req.body && req.body.data) || {};
    if (!ledger_id || !company_code || !transaction) return res.status(400).json(badRequest("ledger_id, company_code, transaction required"));
    validateCompanyAccess(company_code, company_code);

    const { srNum, date, detail, totalAmount, depositedAmount = 0, billNumber, isReturn = false } = transaction;
    if (totalAmount == null || Number(totalAmount) < 0) return res.status(400).json(badRequest("totalAmount >= 0 required"));
    if (Number(depositedAmount) < 0) return res.status(400).json(badRequest("depositedAmount >= 0 required"));

    const remainingAmount = calcRemaining(totalAmount, depositedAmount);
    const created = await Transaction.create(
      {
        ledger_id,
        company_code,
        srNum: srNum || genSr("PINV"),
        date: date || Math.floor(Date.now() / 1000),
        detail,
        totalAmount,
        depositedAmount,
        remainingAmount,
        billNumber,
        isReturn: !!isReturn,
        type: "invoice",
        direction: "purchase",
      },
      { transaction: trx }
    );

    await recalcLedgerTotals(ledger_id, trx);
    await trx.commit();
    return res.json(ok({ transaction: created }));
  } catch (e) {
    await trx.rollback();
    return res.status(e.status || 500).json(serverError(e.message));
  }
};

exports.addPayment = async (req, res) => {
  const trx = await sequelize.transaction();
  try {
    const { ledger_id, company_code, type, payment } = (req.body && req.body.data) || {};
    if (!ledger_id || !company_code || !type || !payment) return res.status(400).json(badRequest("ledger_id, company_code, type, payment required"));
    validateCompanyAccess(company_code, company_code);
    if (["sale", "purchase"].indexOf(type) === -1) return res.status(400).json(badRequest("type must be 'sale' or 'purchase'"));

    const { srNum, date, detail, depositedAmount, applyTo = [] } = payment;
    if (depositedAmount == null || Number(depositedAmount) <= 0) return res.status(400).json(badRequest("depositedAmount > 0 required"));

    const invoices = await Transaction.findAll({
      where: {
        ledger_id,
        company_code,
        direction: type,
        type: "invoice",
        srNum: applyTo.length ? { [Op.in]: applyTo } : { [Op.ne]: null },
      },
      order: [["date", "ASC"]],
      transaction: trx,
    });

    let remainingPayment = Number(depositedAmount);
    for (const inv of invoices) {
      if (remainingPayment <= 0) break;
      const invRemaining = Number(inv.remainingAmount || 0);
      if (invRemaining <= 0) continue;
      const apply = Math.min(invRemaining, remainingPayment);
      const newDeposited = Number(inv.depositedAmount || 0) + apply;
      const newRemaining = Number(inv.totalAmount || 0) - newDeposited;
      await inv.update({ depositedAmount: newDeposited, remainingAmount: newRemaining, modified_at: Math.floor(Date.now() / 1000) }, { transaction: trx });
      remainingPayment -= apply;
    }

    if (remainingPayment > 0) {
      throw new Error("Payment amount cannot exceed remaining amount");
    }

    const created = await Transaction.create(
      {
        ledger_id,
        company_code,
        srNum: srNum || genSr("PAY"),
        date: date || Math.floor(Date.now() / 1000),
        detail,
        totalAmount: 0,
        depositedAmount: Number(depositedAmount),
        remainingAmount: 0,
        type: "payment",
        direction: type,
      },
      { transaction: trx }
    );

    await recalcLedgerTotals(ledger_id, trx);
    await trx.commit();
    return res.json(ok({ transaction: created }));
  } catch (e) {
    await trx.rollback();
    return res.status(e.status || 500).json(serverError(e.message));
  }
};

exports.addReturn = async (req, res) => {
  const trx = await sequelize.transaction();
  try {
    const { ledger_id, company_code, type, return: ret } = (req.body && req.body.data) || {};
    if (!ledger_id || !company_code || !type || !ret) return res.status(400).json(badRequest("ledger_id, company_code, type, return required"));
    validateCompanyAccess(company_code, company_code);
    if (["sale", "purchase"].indexOf(type) === -1) return res.status(400).json(badRequest("type must be 'sale' or 'purchase'"));

    const { srNum, date, detail, billNumber, totalAmount, originalSrNum } = ret;
    if (totalAmount == null || Number(totalAmount) <= 0) return res.status(400).json(badRequest("totalAmount > 0 required"));

    if (originalSrNum) {
      const original = await Transaction.findOne({ where: { ledger_id, company_code, srNum: originalSrNum, direction: type, type: "invoice" }, transaction: trx });
      if (!original) return res.status(404).json(badRequest("original invoice not found"));
      const maxReturnable = Number(original.totalAmount || 0);
      const alreadyReturned = (await Transaction.sum("totalAmount", { where: { ledger_id, company_code, direction: type, type: "return", detail: { [Op.like]: `%orig:${originalSrNum}%` } }, transaction: trx })) || 0;
      if (Number(totalAmount) + Number(alreadyReturned) > maxReturnable) {
        throw new Error("Return amount cannot exceed original transaction amount");
      }
    }

    const created = await Transaction.create(
      {
        ledger_id,
        company_code,
        srNum: srNum || genSr("Return"),
        date: date || Math.floor(Date.now() / 1000),
        detail: originalSrNum ? `${detail || "Return"} orig:${originalSrNum}` : detail,
        totalAmount: Number(totalAmount),
        depositedAmount: 0,
        remainingAmount: -Number(totalAmount),
        billNumber,
        isReturn: true,
        type: "return",
        direction: type,
      },
      { transaction: trx }
    );

    await recalcLedgerTotals(ledger_id, trx);
    await trx.commit();
    return res.json(ok({ transaction: created }));
  } catch (e) {
    await trx.rollback();
    return res.status(e.status || 500).json(serverError(e.message));
  }
};



