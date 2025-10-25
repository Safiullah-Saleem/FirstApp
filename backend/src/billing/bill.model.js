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
      references: {
        model: 'users',
        key: 'company_code'
      },
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
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    ledger_id: {
      type: DataTypes.STRING(100),
      defaultValue: '',
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

        // Auto-generate bill number if not provided
        if (!bill.bill_number) {
          const lastBill = await Bill.findOne({
            where: { company_code: bill.company_code },
            order: [['bill_number', 'DESC']],
            attributes: ['bill_number']
          });
          
          bill.bill_number = lastBill ? lastBill.bill_number + 1 : 1;
        }
      },

      beforeUpdate: (bill) => {
        bill.modified_at = Math.floor(Date.now() / 1000);
      },

      afterCreate: async (bill) => {
        console.log(`✅ Bill #${bill.bill_number} created successfully for company ${bill.company_code}`);
      },

      afterUpdate: async (bill) => {
        console.log(`📝 Bill #${bill.bill_number} updated for company ${bill.company_code}`);
      }
    },
  }
);

// Class methods for common queries
Bill.findByCompany = function(companyCode) {
  return this.findAll({
    where: { company_code: companyCode },
    order: [['created_at', 'DESC']]
  });
};

Bill.findByCompanyAndDateRange = function(companyCode, startDate, endDate) {
  return this.findAll({
    where: {
      company_code: companyCode,
      date: {
        [sequelize.Op.between]: [startDate, endDate]
      }
    },
    order: [['date', 'DESC']]
  });
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
};

// Instance method to calculate outstanding amount
Bill.prototype.getOutstandingAmount = function() {
  return Math.max(0, this.total - this.paid);
};

module.exports = Bill;
