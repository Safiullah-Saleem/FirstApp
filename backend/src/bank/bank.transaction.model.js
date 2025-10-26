const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BankTransaction = sequelize.define('BankTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  bank_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  company_code: {
    type: DataTypes.STRING(10),
    allowNull: false
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
    allowNull: true
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
  tableName: 'bank_transactions',
  timestamps: false,
  indexes: [
    {
      fields: ['bank_id'],
      name: 'idx_bank_transactions_bank_id'
    },
    {
      fields: ['company_code'],
      name: 'idx_bank_transactions_company_code'
    },
    {
      fields: ['transaction_type'],
      name: 'idx_bank_transactions_type'
    },
    {
      fields: ['sale_id'],
      name: 'idx_bank_transactions_sale_id'
    },
    {
      fields: ['date'],
      name: 'idx_bank_transactions_date'
    }
  ]
});

// Associations
BankTransaction.associate = function(models) {
  BankTransaction.belongsTo(models.BankAccount, {
    foreignKey: 'bank_id',
    as: 'bank'
  });

  BankTransaction.belongsTo(models.User, {
    foreignKey: 'company_code',
    targetKey: 'company_code',
    as: 'company'
  });

  BankTransaction.belongsTo(models.Sale, {
    foreignKey: 'sale_id',
    as: 'sale'
  });
};

// Class methods
BankTransaction.findByBankId = function(bankId, companyCode, options = {}) {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  return this.findAndCountAll({
    where: {
      bank_id: bankId,
      company_code: companyCode
    },
    order: [['date', 'DESC'], ['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  });
};

BankTransaction.getBalance = async function(bankId, companyCode) {
  const result = await this.sum('amount', {
    where: {
      bank_id: bankId,
      company_code: companyCode
    }
  });

  return parseFloat(result) || 0.00;
};

module.exports = BankTransaction;
