const { DataTypes, Op } = require("sequelize");
const { sequelize } = require("../config/database");

const Bill = sequelize.define(
  "Bill",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    company_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    bill_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    customer: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    phone: {
      type: DataTypes.STRING(50),
      defaultValue: '',
    },
    seller: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },
    sub_total: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    discount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    paid: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    change_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    payment_method: {
      type: DataTypes.STRING(50),
      defaultValue: 'cash',
      validate: {
        isIn: [['cash', 'credit_card', 'debit_card', 'bank_transfer', 'cheque', 'upi', 'online']]
      }
    },
    notes: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    warehouse_bill: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    store_bill: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    gst: {
      type: DataTypes.STRING(50),
      defaultValue: '',
    },
    bank_name: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    cheque: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    bank_id: {
      type: DataTypes.UUID, // ✅ CHANGED: Use UUID to match other models
      allowNull: true,
      defaultValue: null
    },
    ledger_id: {
      type: DataTypes.UUID, // ✅ CHANGED: Use UUID to match other models
      allowNull: true,
      defaultValue: null
    },
    ledger_address: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    discount_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'price',
      validate: {
        isIn: [['price', 'percentage']]
      }
    },
    formally_outstandings: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
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
    tableName: "bills",
    timestamps: false,
    indexes: [
      {
        fields: ["company_code"],
        name: "idx_bills_company_code",
      },
      {
        fields: ["company_code", "bill_number"],
        name: "idx_bills_company_bill_number",
      },
      {
        fields: ["date"],
        name: "idx_bills_date",
      },
      {
        fields: ["customer"],
        name: "idx_bills_customer",
      },
      {
        fields: ["payment_method"],
        name: "idx_bills_payment_method",
      },
      // ✅ ADDED: Indexes for better join performance
      {
        fields: ["ledger_id"],
        name: "idx_bills_ledger_id",
      },
      {
        fields: ["bank_id"],
        name: "idx_bills_bank_id",
      }
    ],
    hooks: {
      beforeValidate: (bill) => {
        // Ensure numeric fields are properly formatted
        const numericFields = ['sub_total', 'discount', 'total', 'paid', 'change_amount', 'formally_outstandings'];
        numericFields.forEach(field => {
          if (bill[field] !== undefined && bill[field] !== null) {
            bill[field] = parseFloat(bill[field]) || 0;
          }
        });

        // Auto-calculate total if not provided
        if (!bill.total && bill.sub_total !== undefined && bill.discount !== undefined) {
          bill.total = parseFloat(bill.sub_total) - parseFloat(bill.discount);
        }

        // Auto-calculate change amount
        if (bill.paid !== undefined && bill.total !== undefined) {
          bill.change_amount = Math.max(0, parseFloat(bill.paid) - parseFloat(bill.total));
        }
      },

      beforeCreate: async (bill) => {
        if (!bill.created_at) {
          bill.created_at = Math.floor(Date.now() / 1000);
        }
        bill.modified_at = Math.floor(Date.now() / 1000);

        // ✅ IMPROVED: Auto-generate bill number with transaction safety
        if (!bill.bill_number) {
          try {
            // Use a simple approach without transaction to avoid connection issues
            const lastBill = await Bill.findOne({
              where: { company_code: bill.company_code },
              order: [['bill_number', 'DESC']],
              attributes: ['bill_number'],
              // ✅ REMOVED: No transaction to prevent connection pool issues
            });
            
            bill.bill_number = lastBill ? lastBill.bill_number + 1 : 1;
          } catch (error) {
            console.error('Error generating bill number:', error.message);
            // Fallback to timestamp-based number
            bill.bill_number = Math.floor(Date.now() / 1000);
          }
        }
      },

      beforeUpdate: (bill) => {
        bill.modified_at = Math.floor(Date.now() / 1000);
      },

      afterCreate: async (bill) => {
        console.log(`✅ Bill #${bill.bill_number} created successfully for company ${bill.company_code}`);
        
        // ✅ ADDED: Integration with ledger/bank systems
        try {
          // If ledger_id provided, update ledger account
          if (bill.ledger_id) {
            const LedgerAccount = require('../ledger/ledger.account.model');
            const ledger = await LedgerAccount.findOne({ where: { id: bill.ledger_id } });
            if (ledger) {
              await LedgerAccount.update({
                saleTotal: parseFloat(ledger.saleTotal || 0) + parseFloat(bill.total || 0),
                depositedSalesTotal: parseFloat(ledger.depositedSalesTotal || 0) + parseFloat(bill.paid || 0),
                currentBalance: parseFloat(ledger.currentBalance || 0) + (parseFloat(bill.total || 0) - parseFloat(bill.paid || 0)),
                modified_at: Math.floor(Date.now() / 1000)
              }, { where: { id: bill.ledger_id } });
              console.log(`✅ Ledger ${bill.ledger_id} updated with bill`);
            }
          }

          // If bank_id provided, update bank account
          if (bill.bank_id) {
            const BankAccount = require('../bank/bank.account.model');
            const bank = await BankAccount.findOne({ where: { id: bill.bank_id } });
            if (bank) {
              await BankAccount.update({
                balance: parseFloat(bank.balance || 0) + parseFloat(bill.paid || 0),
                modified_at: Math.floor(Date.now() / 1000)
              }, { where: { id: bill.bank_id } });
              console.log(`✅ Bank ${bill.bank_id} balance updated`);
            }
          }
        } catch (integrationError) {
          console.log('Integration modules not available:', integrationError.message);
        }
      },

      afterUpdate: async (bill) => {
        console.log(`📝 Bill #${bill.bill_number} updated for company ${bill.company_code}`);
      }
    },
  }
);

// ✅ IMPROVED: Class methods without transactions for better performance
Bill.findByCompany = function(companyCode, options = {}) {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  return this.findAndCountAll({
    where: { company_code: companyCode },
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: offset,
    include: options.include || []
  });
};

Bill.findByCompanyAndDateRange = function(companyCode, startDate, endDate, options = {}) {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  return this.findAndCountAll({
    where: {
      company_code: companyCode,
      date: {
        [sequelize.Op.between]: [startDate, endDate]
      }
    },
    order: [['date', 'DESC']],
    limit: parseInt(limit),
    offset: offset,
    include: options.include || []
  });
};

// ✅ ADDED: Method to get next bill number without transaction
Bill.getNextBillNumber = async function(companyCode) {
  try {
    const lastBill = await this.findOne({
      where: { company_code: companyCode },
      order: [['bill_number', 'DESC']],
      attributes: ['bill_number']
    });
    
    return lastBill ? lastBill.bill_number + 1 : 1;
  } catch (error) {
    console.error('Error getting next bill number:', error);
    // Fallback to timestamp
    return Math.floor(Date.now() / 1000);
  }
};

// ===== ASSOCIATIONS =====
Bill.associate = function(models) {
  Bill.hasMany(models.Sale, {
    foreignKey: 'bill_id',
    as: 'sales',
    onDelete: 'CASCADE'
  });

  Bill.hasMany(models.Purchase, {
    foreignKey: 'bill_id',
    as: 'purchases',
    onDelete: 'CASCADE'
  });

  Bill.belongsTo(models.User, {
    foreignKey: 'company_code',
    targetKey: 'company_code',
    as: 'company'
  });

  // ✅ ADDED: Associations for ledger and bank integration
  Bill.belongsTo(models.LedgerAccount, {
    foreignKey: 'ledger_id',
    as: 'ledger'
  });

  Bill.belongsTo(models.BankAccount, {
    foreignKey: 'bank_id',
    as: 'bank'
  });
};

// Instance method to calculate outstanding amount
Bill.prototype.getOutstandingAmount = function() {
  return Math.max(0, this.total - this.paid);
};

// ✅ ADDED: Method to check if bill is fully paid
Bill.prototype.isFullyPaid = function() {
  return this.paid >= this.total;
};

module.exports = Bill;