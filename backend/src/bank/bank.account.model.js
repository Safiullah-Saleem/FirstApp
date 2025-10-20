const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Bank = sequelize.define(
  "Bank",
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
    ledger_id: { 
      type: DataTypes.BIGINT, 
      allowNull: false
    },
    bank_name: { 
      type: DataTypes.STRING, 
      allowNull: false
    },
    account_number: { 
      type: DataTypes.STRING, 
      allowNull: false
    },
    account_holder_name: { 
      type: DataTypes.STRING, 
      allowNull: false
    },
    branch_name: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },
    ifsc_code: { 
      type: DataTypes.STRING, 
      allowNull: true
    },
    account_type: { 
      type: DataTypes.ENUM("savings", "current", "salary"), 
      defaultValue: "savings"
    },
    current_balance: { 
      type: DataTypes.DECIMAL(15, 2), 
      defaultValue: 0.00
    },
    opening_balance: { 
      type: DataTypes.DECIMAL(15, 2), 
      defaultValue: 0.00
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
    tableName: "banks",
    timestamps: false
  }
);

module.exports = Bank;