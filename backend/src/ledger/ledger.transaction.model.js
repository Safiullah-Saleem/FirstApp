const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LedgerTransaction = sequelize.define('LedgerTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  ledger_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'ledger_accounts',
      key: 'id'
    }
  },
  company_code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    references: {
      model: 'users',
      key: 'company_code'
    }
  },
  transaction_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['sale', 'return', 'payment', 'purchase']]
    }
  },
  sale_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'sales',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  paid_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  balance_change: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  description: {
    type: DataTypes.STRING(255),
    defaultValue: ''
  },
  date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },
  created_at: {
    type: DataTypes.BIGINT,
    defaultValue: () => Math.floor(Date.now() / 1000)
  }
}, {
  tableName: 'ledger_transactions',
  timestamps: false,
  indexes: [
    {
      fields: ['ledger_id'],
      name: 'idx_ledger_transactions_ledger_id'
    },
    {
      fields: ['company_code'],
      name: 'idx_ledger_transactions_company_code'
    },
    {
      fields: ['transaction_type'],
      name: 'idx_ledger_transactions_type'
    },
    {
      fields: ['sale_id'],
      name: 'idx_ledger_transactions_sale_id'
    },
    {
      fields: ['date'],
      name: 'idx_ledger_transactions_date'
    }
  ]
});

// Associations
LedgerTransaction.associate = function(models) {
  LedgerTransaction.belongsTo(models.LedgerAccount, {
    foreignKey: 'ledger_id',
    as: 'ledger'
  });

  LedgerTransaction.belongsTo(models.User, {
    foreignKey: 'company_code',
    targetKey: 'company_code',
    as: 'company'
  });

  LedgerTransaction.belongsTo(models.Sale, {
    foreignKey: 'sale_id',
    as: 'sale'
  });
};

// Class methods
LedgerTransaction.findByLedgerId = function(ledgerId, companyCode, options = {}) {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  return this.findAndCountAll({
    where: {
      ledger_id: ledgerId,
      company_code: companyCode
    },
    order: [['date', 'DESC'], ['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  });
};

LedgerTransaction.getBalance = async function(ledgerId, companyCode) {
  const result = await this.sum('balance_change', {
    where: {
      ledger_id: ledgerId,
      company_code: companyCode
    }
  });

  return parseFloat(result) || 0.00;
};

module.exports = LedgerTransaction;
