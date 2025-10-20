const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Ledger = sequelize.define(
  "Ledger",
  {
    id: { 
      type: DataTypes.BIGINT, 
      autoIncrement: true, 
      primaryKey: true 
    },
    company_code: { 
      type: DataTypes.STRING, 
      allowNull: false
    },
    name: { 
      type: DataTypes.STRING, 
      allowNull: false
    },
    type: { 
      type: DataTypes.ENUM("customer", "supplier", "bank", "cash", "income", "expense"), 
      allowNull: false
    },
    opening_balance: { 
      type: DataTypes.DECIMAL(15, 2), 
      defaultValue: 0.00
    },
    current_balance: { 
      type: DataTypes.DECIMAL(15, 2), 
      defaultValue: 0.00
    },
    contact_number: { 
      type: DataTypes.STRING, 
      allowNull: true
    },
    email: { 
      type: DataTypes.STRING, 
      allowNull: true
    },
    address: { 
      type: DataTypes.TEXT, 
      allowNull: true
    },
    is_active: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: true 
    },
    created_at: { 
      type: DataTypes.BIGINT, 
      defaultValue: () => Date.now() 
    }
  },
  {
    tableName: "ledgers",
    timestamps: false,
    indexes: [
      { fields: ["company_code"] },
      { fields: ["type"] },
      { fields: ["is_active"] }
    ]
  }
);

// ✅ ADD ASSOCIATIONS
Ledger.associate = function(models) {
  Ledger.hasMany(models.Transaction, {
    foreignKey: 'ledger_id',
    as: 'transactions'
  });
  
  Ledger.hasMany(models.Bank, {
    foreignKey: 'ledger_id', 
    as: 'banks'
  });
};

module.exports = Ledger;