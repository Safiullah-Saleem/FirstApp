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
      saleTotal += Number(x.remaining_amount || 0); // FIXED: remainingAmount → remaining_amount
      depositedSalesTotal += Number(x.deposited_amount || 0); // FIXED: depositedAmount → deposited_amount
    } else if (x.direction === "purchase") {
      purchaseTotal += Number(x.remaining_amount || 0); // FIXED: remainingAmount → remaining_amount
      depositedPurchaseTotal += Number(x.deposited_amount || 0); // FIXED: depositedAmount → deposited_amount
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
        sr_num: srNum || genSr("INV"), // FIXED: srNum → sr_num
        date: date || Math.floor(Date.now() / 1000),
        detail,
        total_amount: totalAmount, // FIXED: totalAmount → total_amount
        deposited_amount: depositedAmount, // FIXED: depositedAmount → deposited_amount
        remaining_amount: remainingAmount, // FIXED: remainingAmount → remaining_amount
        bill_number: billNumber, // FIXED: billNumber → bill_number
        is_return: !!isReturn, // FIXED: isReturn → is_return
        type: "invoice",
        invoice_number: invoiceNumber, // FIXED: invoiceNumber → invoice_number
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
        sr_num: srNum || genSr("PINV"), // FIXED: srNum → sr_num
        date: date || Math.floor(Date.now() / 1000),
        detail,
        total_amount: totalAmount, // FIXED: totalAmount → total_amount
        deposited_amount: depositedAmount, // FIXED: depositedAmount → deposited_amount
        remaining_amount: remainingAmount, // FIXED: remainingAmount → remaining_amount
        bill_number: billNumber, // FIXED: billNumber → bill_number
        is_return: !!isReturn, // FIXED: isReturn → is_return
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
        sr_num: applyTo.length ? { [Op.in]: applyTo } : { [Op.ne]: null }, // FIXED: srNum → sr_num
      },
      order: [["date", "ASC"]],
      transaction: trx,
    });

    let remainingPayment = Number(depositedAmount);
    for (const inv of invoices) {
      if (remainingPayment <= 0) break;
      const invRemaining = Number(inv.remaining_amount || 0); // FIXED: remainingAmount → remaining_amount
      if (invRemaining <= 0) continue;
      const apply = Math.min(invRemaining, remainingPayment);
      const newDeposited = Number(inv.deposited_amount || 0) + apply; // FIXED: depositedAmount → deposited_amount
      const newRemaining = Number(inv.total_amount || 0) - newDeposited; // FIXED: totalAmount → total_amount
      await inv.update({ 
        deposited_amount: newDeposited, // FIXED: depositedAmount → deposited_amount
        remaining_amount: newRemaining, // FIXED: remainingAmount → remaining_amount
        modified_at: Math.floor(Date.now() / 1000) 
      }, { transaction: trx });
      remainingPayment -= apply;
    }

    if (remainingPayment > 0) {
      throw new Error("Payment amount cannot exceed remaining amount");
    }

    const created = await Transaction.create(
      {
        ledger_id,
        company_code,
        sr_num: srNum || genSr("PAY"), // FIXED: srNum → sr_num
        date: date || Math.floor(Date.now() / 1000),
        detail,
        total_amount: 0, // FIXED: totalAmount → total_amount
        deposited_amount: Number(depositedAmount), // FIXED: depositedAmount → deposited_amount
        remaining_amount: 0, // FIXED: remainingAmount → remaining_amount
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
      const original = await Transaction.findOne({ 
        where: { 
          ledger_id, 
          company_code, 
          sr_num: originalSrNum, // FIXED: srNum → sr_num
          direction: type, 
          type: "invoice" 
        }, 
        transaction: trx 
      });
      if (!original) return res.status(404).json(badRequest("original invoice not found"));
      const maxReturnable = Number(original.total_amount || 0); // FIXED: totalAmount → total_amount
      const alreadyReturned = (await Transaction.sum("total_amount", { // FIXED: totalAmount → total_amount
        where: { 
          ledger_id, 
          company_code, 
          direction: type, 
          type: "return", 
          detail: { [Op.like]: `%orig:${originalSrNum}%` } 
        }, 
        transaction: trx 
      })) || 0;
      if (Number(totalAmount) + Number(alreadyReturned) > maxReturnable) {
        throw new Error("Return amount cannot exceed original transaction amount");
      }
    }

    const created = await Transaction.create(
      {
        ledger_id,
        company_code,
        sr_num: srNum || genSr("Return"), // FIXED: srNum → sr_num
        date: date || Math.floor(Date.now() / 1000),
        detail: originalSrNum ? `${detail || "Return"} orig:${originalSrNum}` : detail,
        total_amount: Number(totalAmount), // FIXED: totalAmount → total_amount
        deposited_amount: 0, // FIXED: depositedAmount → deposited_amount
        remaining_amount: -Number(totalAmount), // FIXED: remainingAmount → remaining_amount
        bill_number: billNumber, // FIXED: billNumber → bill_number
        is_return: true, // FIXED: isReturn → is_return
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