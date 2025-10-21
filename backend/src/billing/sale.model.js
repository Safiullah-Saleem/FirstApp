const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Sale = sequelize.define(
  "Sale",
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
      // REMOVED STRICT VALIDATION - Allow any unit value
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
    sale_price: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    cost_price: {
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
    total_profit: {
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
    sale_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'pieces',
      // REMOVED STRICT VALIDATION - Allow any sale_type value
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
    tableName: "sales",
    timestamps: false,
    indexes: [
      {
        fields: ["company_code"],
        name: "idx_sales_company_code",
      },
      {
        fields: ["item_id"],
        name: "idx_sales_item_id",
      },
      {
        fields: ["date"],
        name: "idx_sales_date",
      },
      {
        fields: ["bill_id"],
        name: "idx_sales_bill_id",
      },
      {
        fields: ["category"],
        name: "idx_sales_category",
      },
      {
        fields: ["sale_type"],
        name: "idx_sales_sale_type",
      },
      {
        fields: ["timestamp"],
        name: "idx_sales_timestamp",
      },
      {
        fields: ["company_code", "date"],
        name: "idx_sales_company_date",
      }
    ],
    hooks: {
      beforeValidate: (sale) => {
        // Auto-calculate total_price and total_profit
        if (sale.quantity && sale.sale_price) {
          sale.total_price = parseFloat(sale.quantity) * parseFloat(sale.sale_price);
        }
        
        if (sale.total_price && sale.cost_price && sale.quantity) {
          const totalCost = parseFloat(sale.cost_price) * parseFloat(sale.quantity);
          sale.total_profit = parseFloat(sale.total_price) - totalCost;
        }
        
        // Apply discount if provided
        if (sale.discount && sale.total_price) {
          sale.total_price = Math.max(0, parseFloat(sale.total_price) - parseFloat(sale.discount));
          // Recalculate profit after discount
          if (sale.cost_price && sale.quantity) {
            const totalCost = parseFloat(sale.cost_price) * parseFloat(sale.quantity);
            sale.total_profit = parseFloat(sale.total_price) - totalCost;
          }
        }
        
        // Ensure numeric fields are properly formatted
        const numericFields = ['sale_price', 'cost_price', 'total_price', 'total_profit', 'discount', 'paid'];
        numericFields.forEach(field => {
          if (sale[field] !== undefined && sale[field] !== null) {
            sale[field] = parseFloat(sale[field]) || 0;
          }
        });
        
        if (sale.quantity !== undefined && sale.quantity !== null) {
          sale.quantity = parseInt(sale.quantity) || 1;
        }
        if (sale.min_quantity !== undefined && sale.min_quantity !== null) {
          sale.min_quantity = parseInt(sale.min_quantity) || 0;
        }

        // Set default values if not provided
        if (!sale.unit || sale.unit.trim() === '') {
          sale.unit = 'pcs';
        }
        if (!sale.sale_type || sale.sale_type.trim() === '') {
          sale.sale_type = 'pieces';
        }
      },
      
      beforeCreate: (sale) => {
        if (!sale.timestamp) {
          sale.timestamp = Math.floor(Date.now() / 1000);
        }
        if (!sale.created_at) {
          sale.created_at = Math.floor(Date.now() / 1000);
        }
        sale.modified_at = Math.floor(Date.now() / 1000);
      },
      
      beforeUpdate: (sale) => {
        sale.modified_at = Math.floor(Date.now() / 1000);
      },

      afterCreate: async (sale) => {
        console.log(`✅ Sale recorded for item: ${sale.name}, Quantity: ${sale.quantity}`);
      },

      afterUpdate: async (sale) => {
        console.log(`📝 Sale updated for item: ${sale.name}`);
      }
    },
  }
);

// ===== ASSOCIATIONS =====
Sale.associate = function(models) {
  Sale.belongsTo(models.Bill, {
    foreignKey: 'bill_id',
    as: 'bill',
    onDelete: 'CASCADE'
  });
  
  Sale.belongsTo(models.User, {
    foreignKey: 'company_code',
    targetKey: 'company_code',
    as: 'company'
  });
  
  Sale.belongsTo(models.Item, {
    foreignKey: 'item_id',
    targetKey: 'itemId',
    as: 'item'
  });
};

// ===== CLASS METHODS =====

// Find all sales for a company with pagination
Sale.findByCompany = function(companyCode, options = {}) {
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

// Find sales by item ID
Sale.findByItemId = function(itemId, companyCode, options = {}) {
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

// Find sales by date range
Sale.findByDateRange = function(companyCode, startDate, endDate, options = {}) {
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

// Get sales summary with advanced analytics
Sale.getSalesSummary = async function(companyCode, startDate, endDate) {
  const sales = await this.findAll({
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
      [sequelize.fn('COUNT', sequelize.col('id')), 'sale_count'],
      [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
      [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue'],
      [sequelize.fn('SUM', sequelize.col('total_profit')), 'total_profit'],
      [sequelize.fn('AVG', sequelize.col('sale_price')), 'avg_sale_price']
    ],
    group: ['item_id', 'name', 'category'],
    order: [[sequelize.fn('SUM', sequelize.col('total_price')), 'DESC']],
    raw: true
  });
  
  // Calculate overall totals
  const totals = sales.reduce((acc, item) => ({
    total_sales: acc.total_sales + parseInt(item.sale_count),
    total_quantity: acc.total_quantity + parseInt(item.total_quantity),
    total_revenue: acc.total_revenue + parseFloat(item.total_revenue),
    total_profit: acc.total_profit + parseFloat(item.total_profit)
  }), { total_sales: 0, total_quantity: 0, total_revenue: 0, total_profit: 0 });

  return {
    summary: sales,
    totals,
    period: { startDate, endDate }
  };
};

// Get daily sales report
Sale.getDailySalesReport = async function(companyCode, date) {
  const sales = await this.findAll({
    where: {
      company_code: companyCode,
      date: date
    },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_sales'],
      [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
      [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue'],
      [sequelize.fn('SUM', sequelize.col('total_profit')), 'total_profit']
    ],
    raw: true
  });

  return sales[0] || { total_sales: 0, total_quantity: 0, total_revenue: 0, total_profit: 0 };
};

// Get top selling items
Sale.getTopSellingItems = async function(companyCode, limit = 10, startDate, endDate) {
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
      [sequelize.fn('SUM', sequelize.col('quantity')), 'total_sold'],
      [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue']
    ],
    group: ['item_id', 'name', 'category'],
    order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
    limit: parseInt(limit),
    raw: true
  });
};

// ===== INSTANCE METHODS =====

// Calculate profit margin
Sale.prototype.getProfitMargin = function() {
  if (!this.total_price || this.total_price === 0) return 0;
  return ((this.total_profit / this.total_price) * 100).toFixed(2);
};

// Check if low stock alert
Sale.prototype.isLowStockAlert = function() {
  return this.min_quantity > 0 && this.quantity <= this.min_quantity;
};

// Get sale details for receipt
Sale.prototype.getReceiptDetails = function() {
  return {
    itemName: this.name,
    quantity: this.quantity,
    unitPrice: this.sale_price,
    totalPrice: this.total_price,
    discount: this.discount,
    profit: this.total_profit,
    profitMargin: this.getProfitMargin() + '%'
  };
};

// Calculate discount percentage
Sale.prototype.getDiscountPercentage = function() {
  const originalPrice = (this.sale_price * this.quantity);
  if (!originalPrice || originalPrice === 0) return 0;
  return ((this.discount / originalPrice) * 100).toFixed(2);
};

// ===== VIRTUAL FIELDS =====
Object.defineProperty(Sale.prototype, 'profit_margin', {
  get: function() {
    return this.getProfitMargin();
  }
});

Object.defineProperty(Sale.prototype, 'discount_percentage', {
  get: function() {
    return this.getDiscountPercentage();
  }
});

Object.defineProperty(Sale.prototype, 'original_total', {
  get: function() {
    return (this.sale_price * this.quantity) + parseFloat(this.discount || 0);
  }
});

module.exports = Sale;