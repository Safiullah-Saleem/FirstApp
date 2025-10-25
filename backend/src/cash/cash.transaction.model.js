const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CashTransaction = sequelize.define('CashTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cash_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'cash_accounts',
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
      isIn: [['sale', 'return', 'deposit', 'withdrawal']]
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
  tableName: 'cash_transactions',
  timestamps: false,
  indexes: [
    {
      fields: ['cash_id'],
      name: 'idx_cash_transactions_cash_id'
    },
    {
      fields: ['company_code'],
      name: 'idx_cash_transactions_company_code'
    },
    {
      fields: ['transaction_type'],
      name: 'idx_cash_transactions_type'
    },
    {
      fields: ['sale_id'],
      name: 'idx_cash_transactions_sale_id'
    },
    {
      fields: ['date'],
      name: 'idx_cash_transactions_date'
    }
  ]
});

// Associations
CashTransaction.associate = function(models) {
  CashTransaction.belongsTo(models.CashAccount, {
    foreignKey: 'cash_id',
    as: 'cash'
  });

  CashTransaction.belongsTo(models.User, {
    foreignKey: 'company_code',
    targetKey: 'company_code',
    as: 'company'
  });

  CashTransaction.belongsTo(models.Sale, {
    foreignKey: 'sale_id',
    as: 'sale'
  });
};

// Class methods
CashTransaction.findByCashId = function(cashId, companyCode, options = {}) {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  return this.findAndCountAll({
    where: {
      cash_id: cashId,
      company_code: companyCode
    },
    order: [['date', 'DESC'], ['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  });
};

CashTransaction.getBalance = async function(cashId, companyCode) {
  const result = await this.sum('amount', {
    where: {
      cash_id: cashId,
      company_code: companyCode
    }
  });

  return parseFloat(result) || 0.00;
};

module.exports = CashTransaction;
