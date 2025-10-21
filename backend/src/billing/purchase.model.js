const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Purchase = sequelize.define(
  "Purchase",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bill_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'bills',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    company_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      references: {
        model: 'users',
        key: 'company_code'
      },
      validate: {
        notEmpty: true
      }
    },

    // ✅ INTEGRATION FIELDS - LEDGER, BANK, CASH
    ledger_id: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null
    },
    bank_id: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null
    },
    cash_id: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null
    },

    item_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    item_code: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    category: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    unit: {
      type: DataTypes.STRING(50),
      defaultValue: 'pcs',
      validate: {
        notEmpty: true
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    purchase_price: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    sale_price: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    total_price: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    total_profit_margin: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    discount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    vendor: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    selected_imei: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    batch_number: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    purchase_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'pieces',
      validate: {
        notEmpty: true
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },
    timestamp: {
      type: DataTypes.BIGINT,
      defaultValue: () => Math.floor(Date.now() / 1000),
    },
    read_status: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    min_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    img_url: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    paid: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },

    created_at: {
      type: DataTypes.BIGINT,
      defaultValue: () => Math.floor(Date.now() / 1000),
    },
    modified_at: {
      type: DataTypes.BIGINT,
      defaultValue: () => Math.floor(Date.now() / 1000),
    },
  },
  {
    tableName: "purchases",
    timestamps: false,
    indexes: [
      {
        fields: ["company_code"],
        name: "idx_purchases_company_code",
      },
      // ✅ NEW INTEGRATION INDEXES
      {
        fields: ["ledger_id"],
        name: "idx_purchases_ledger_id",
      },
      {
        fields: ["bank_id"],
        name: "idx_purchases_bank_id",
      },
      {
        fields: ["cash_id"],
        name: "idx_purchases_cash_id",
      },
      // EXISTING INDEXES
      {
        fields: ["item_id"],
        name: "idx_purchases_item_id",
      },
      {
        fields: ["date"],
        name: "idx_purchases_date",
      },
      {
        fields: ["bill_id"],
        name: "idx_purchases_bill_id",
      },
      {
        fields: ["category"],
        name: "idx_purchases_category",
      },
      {
        fields: ["purchase_type"],
        name: "idx_purchases_purchase_type",
      },
      {
        fields: ["timestamp"],
        name: "idx_purchases_timestamp",
      },
      {
        fields: ["company_code", "date"],
        name: "idx_purchases_company_date",
      }
    ],
    hooks: {
      beforeValidate: (purchase) => {
        // Auto-calculate total_price
        if (purchase.quantity && purchase.purchase_price) {
          purchase.total_price = parseFloat(purchase.quantity) * parseFloat(purchase.purchase_price);
        }

        // Calculate profit margin if sale_price is provided
        if (purchase.purchase_price && purchase.sale_price && purchase.quantity) {
          const totalPurchaseCost = parseFloat(purchase.purchase_price) * parseFloat(purchase.quantity);
          const totalSaleValue = parseFloat(purchase.sale_price) * parseFloat(purchase.quantity);
          purchase.total_profit_margin = totalSaleValue - totalPurchaseCost;
        }

        // Apply discount if provided
        if (purchase.discount && purchase.total_price) {
          purchase.total_price = Math.max(0, parseFloat(purchase.total_price) - parseFloat(purchase.discount));
          // Recalculate profit margin after discount
          if (purchase.purchase_price && purchase.sale_price && purchase.quantity) {
            const totalPurchaseCost = parseFloat(purchase.purchase_price) * parseFloat(purchase.quantity);
            const totalSaleValue = (parseFloat(purchase.sale_price) * parseFloat(purchase.quantity)) - parseFloat(purchase.discount);
            purchase.total_profit_margin = totalSaleValue - totalPurchaseCost;
          }
        }

        // Ensure numeric fields are properly formatted
        const numericFields = ['purchase_price', 'sale_price', 'total_price', 'total_profit_margin', 'discount', 'paid'];
        numericFields.forEach(field => {
          if (purchase[field] !== undefined && purchase[field] !== null) {
            purchase[field] = parseFloat(purchase[field]) || 0;
          }
        });

        if (purchase.quantity !== undefined && purchase.quantity !== null) {
          purchase.quantity = parseInt(purchase.quantity) || 1;
        }
        if (purchase.min_quantity !== undefined && purchase.min_quantity !== null) {
          purchase.min_quantity = parseInt(purchase.min_quantity) || 0;
        }

        // Set default values if not provided
        if (!purchase.unit || purchase.unit.trim() === '') {
          purchase.unit = 'pcs';
        }
        if (!purchase.purchase_type || purchase.purchase_type.trim() === '') {
          purchase.purchase_type = 'pieces';
        }
      },

      beforeCreate: (purchase) => {
        if (!purchase.timestamp) {
          purchase.timestamp = Math.floor(Date.now() / 1000);
        }
        if (!purchase.created_at) {
          purchase.created_at = Math.floor(Date.now() / 1000);
        }
        purchase.modified_at = Math.floor(Date.now() / 1000);
      },

      beforeUpdate: (purchase) => {
        purchase.modified_at = Math.floor(Date.now() / 1000);
      },

      afterCreate: async (purchase) => {
        console.log(`✅ Purchase recorded for item: ${purchase.name}, Quantity: ${purchase.quantity}`);

        // ✅ AUTO-INTEGRATION LOGIC
        try {
          // If ledger_id provided, update ledger
          if (purchase.ledger_id) {
            const LedgerAccount = require('../../ledger/ledger.account.model');
            const ledger = await LedgerAccount.findOne({ where: { _id: purchase.ledger_id } });
            if (ledger) {
              await LedgerAccount.update({
                purchasesTotal: parseFloat(ledger.purchasesTotal || 0) + parseFloat(purchase.total_price || 0),
                depositedPurchasesTotal: parseFloat(ledger.depositedPurchasesTotal || 0) + parseFloat(purchase.paid || 0),
                currentBalance: parseFloat(ledger.currentBalance || 0) - (parseFloat(purchase.total_price || 0) - parseFloat(purchase.paid || 0)),
                modified_at: Math.floor(Date.now() / 1000)
              }, { where: { _id: purchase.ledger_id } });
              console.log(`✅ Ledger ${purchase.ledger_id} updated with purchase`);
            }
          }

          // If bank_id provided, update bank balance
          if (purchase.bank_id) {
            const BankAccount = require('../../bank/bank.account.model');
            const bank = await BankAccount.findOne({ where: { _id: purchase.bank_id } });
            if (bank) {
              await BankAccount.update({
                balance: parseFloat(bank.balance || 0) - parseFloat(purchase.paid || 0),
                modified_at: Math.floor(Date.now() / 1000)
              }, { where: { _id: purchase.bank_id } });
              console.log(`✅ Bank ${purchase.bank_id} balance updated`);
            }
          }

          // If cash_id provided, update cash balance
          if (purchase.cash_id) {
            const CashAccount = require('../../cash/cash.account.model');
            const cash = await CashAccount.findOne({ where: { _id: purchase.cash_id } });
            if (cash) {
              await CashAccount.update({
                balance: parseFloat(cash.balance || 0) - parseFloat(purchase.paid || 0),
                modified_at: Math.floor(Date.now() / 1000)
              }, { where: { _id: purchase.cash_id } });
              console.log(`✅ Cash ${purchase.cash_id} balance updated`);
            }
          }
        } catch (integrationError) {
          console.log('Integration modules not available yet:', integrationError.message);
        }
      },

      afterUpdate: async (purchase) => {
        console.log(`📝 Purchase updated for item: ${purchase.name}`);
      }
    },
  }
);

// ===== ASSOCIATIONS =====
Purchase.associate = function(models) {
  Purchase.belongsTo(models.Bill, {
    foreignKey: 'bill_id',
    as: 'bill',
    onDelete: 'CASCADE'
  });

  Purchase.belongsTo(models.User, {
    foreignKey: 'company_code',
    targetKey: 'company_code',
    as: 'company'
  });

  Purchase.belongsTo(models.Item, {
    foreignKey: 'item_id',
    targetKey: 'itemId',
    as: 'item'
  });
};

// ===== CLASS METHODS =====

// Find all purchases for a company with pagination
Purchase.findByCompany = function(companyCode, options = {}) {
  const { page = 1, limit = 50, includeBill = true } = options;
  const offset = (page - 1) * limit;

  const queryOptions = {
    where: { company_code: companyCode },
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  };

  if (includeBill) {
    queryOptions.include = [{
      association: 'bill',
      attributes: ['id', 'bill_number', 'customer', 'date']
    }];
  }

  return this.findAndCountAll(queryOptions);
};

// Find purchases by ledger_id (NEW METHOD)
Purchase.findByLedgerId = function(ledgerId, companyCode, options = {}) {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  return this.findAndCountAll({
    where: {
      ledger_id: ledgerId,
      company_code: companyCode
    },
    include: [{
      association: 'bill',
      attributes: ['id', 'bill_number', 'customer', 'date']
    }],
    order: [['date', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  });
};

// Find purchases by bank_id (NEW METHOD)
Purchase.findByBankId = function(bankId, companyCode, options = {}) {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  return this.findAndCountAll({
    where: {
      bank_id: bankId,
      company_code: companyCode
    },
    include: [{
      association: 'bill',
      attributes: ['id', 'bill_number', 'customer', 'date']
    }],
    order: [['date', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  });
};

// Find purchases by item ID
Purchase.findByItemId = function(itemId, companyCode, options = {}) {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  return this.findAndCountAll({
    where: {
      item_id: itemId,
      company_code: companyCode
    },
    include: [{
      association: 'bill',
      attributes: ['id', 'bill_number', 'customer', 'date']
    }],
    order: [['date', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  });
};

// Find purchases by date range
Purchase.findByDateRange = function(companyCode, startDate, endDate, options = {}) {
  const { includeBill = false } = options;

  const queryOptions = {
    where: {
      company_code: companyCode,
      date: {
        [sequelize.Op.between]: [startDate, endDate]
      }
    },
    order: [['date', 'DESC'], ['created_at', 'DESC']]
  };

  if (includeBill) {
    queryOptions.include = [{
      association: 'bill'
    }];
  }

  return this.findAll(queryOptions);
};

// Get purchases summary with advanced analytics
Purchase.getPurchasesSummary = async function(companyCode, startDate, endDate) {
  const purchases = await this.findAll({
    where: {
      company_code: companyCode,
      date: {
        [sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      'item_id',
      'name',
      'category',
      [sequelize.fn('COUNT', sequelize.col('id')), 'purchase_count'],
      [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
      [sequelize.fn('SUM', sequelize.col('total_price')), 'total_cost'],
      [sequelize.fn('SUM', sequelize.col('total_profit_margin')), 'total_profit_margin'],
      [sequelize.fn('AVG', sequelize.col('purchase_price')), 'avg_purchase_price']
    ],
    group: ['item_id', 'name', 'category'],
    order: [[sequelize.fn('SUM', sequelize.col('total_price')), 'DESC']],
    raw: true
  });

  // Calculate overall totals
  const totals = purchases.reduce((acc, item) => ({
    total_purchases: acc.total_purchases + parseInt(item.purchase_count),
    total_quantity: acc.total_quantity + parseInt(item.total_quantity),
    total_cost: acc.total_cost + parseFloat(item.total_cost),
    total_profit_margin: acc.total_profit_margin + parseFloat(item.total_profit_margin)
  }), { total_purchases: 0, total_quantity: 0, total_cost: 0, total_profit_margin: 0 });

  return {
    summary: purchases,
    totals,
    period: { startDate, endDate }
  };
};

// Get daily purchases report
Purchase.getDailyPurchasesReport = async function(companyCode, date) {
  const purchases = await this.findAll({
    where: {
      company_code: companyCode,
      date: date
    },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_purchases'],
      [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
      [sequelize.fn('SUM', sequelize.col('total_price')), 'total_cost'],
      [sequelize.fn('SUM', sequelize.col('total_profit_margin')), 'total_profit_margin']
    ],
    raw: true
  });

  return purchases[0] || { total_purchases: 0, total_quantity: 0, total_cost: 0, total_profit_margin: 0 };
};

// Get top purchased items
Purchase.getTopPurchasedItems = async function(companyCode, limit = 10, startDate, endDate) {
  const whereClause = {
    company_code: companyCode
  };

  if (startDate && endDate) {
    whereClause.date = { [sequelize.Op.between]: [startDate, endDate] };
  }

  return this.findAll({
    where: whereClause,
    attributes: [
      'item_id',
      'name',
      'category',
      [sequelize.fn('SUM', sequelize.col('quantity')), 'total_purchased'],
      [sequelize.fn('SUM', sequelize.col('total_price')), 'total_cost']
    ],
    group: ['item_id', 'name', 'category'],
    order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
    limit: parseInt(limit),
    raw: true
  });
};

// ===== INSTANCE METHODS =====

// Calculate profit margin percentage
Purchase.prototype.getProfitMarginPercentage = function() {
  if (!this.total_price || this.total_price === 0) return 0;
  return ((this.total_profit_margin / this.total_price) * 100).toFixed(2);
};

// Check if low stock alert
Purchase.prototype.isLowStockAlert = function() {
  return this.min_quantity > 0 && this.quantity <= this.min_quantity;
};

// Get purchase details for receipt
Purchase.prototype.getReceiptDetails = function() {
  return {
    itemName: this.name,
    quantity: this.quantity,
    unitPrice: this.purchase_price,
    totalPrice: this.total_price,
    discount: this.discount,
    profitMargin: this.total_profit_margin,
    profitMarginPercentage: this.getProfitMarginPercentage() + '%'
  };
};

// Calculate discount percentage
Purchase.prototype.getDiscountPercentage = function() {
  const originalPrice = (this.purchase_price * this.quantity);
  if (!originalPrice || originalPrice === 0) return 0;
  return ((this.discount / originalPrice) * 100).toFixed(2);
};

// ===== VIRTUAL FIELDS =====
Object.defineProperty(Purchase.prototype, 'profit_margin_percentage', {
  get: function() {
    return this.getProfitMarginPercentage();
  }
});

Object.defineProperty(Purchase.prototype, 'discount_percentage', {
  get: function() {
    return this.getDiscountPercentage();
  }
});

Object.defineProperty(Purchase.prototype, 'original_total', {
  get: function() {
    return (this.purchase_price * this.quantity) + parseFloat(this.discount || 0);
  }
});

module.exports = Purchase;
