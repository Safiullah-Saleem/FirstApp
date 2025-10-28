const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

// Generate unique 4-digit employee code (DEFINED BEFORE Model)
const generateUniqueEmployeeCode = async () => {
  let isUnique = false;
  let code;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
    const existingEmployee = await sequelize.models.Employee?.findOne({
      where: { employee_code: code },
    }).catch(() => null);
    if (!existingEmployee) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    // Fallback: timestamp-based code
    code = `EMP${Date.now().toString().slice(-6)}`;
  }

  return code;
};

// Calculate net salary function
const calculateNetSalary = (employee) => {
  const basic = parseFloat(employee.salary_basic) || 0;
  const hra = parseFloat(employee.salary_hra) || 0;
  const allowances = parseFloat(employee.salary_allowances) || 0;
  const pf = parseFloat(employee.salary_pf) || 0;
  const esi = parseFloat(employee.salary_esi) || 0;
  const tax = parseFloat(employee.salary_tax) || 0;

  const grossSalary = basic + hra + allowances;
  const deductions = pf + esi + tax;
  const netSalary = grossSalary - deductions;

  console.log(`💰 Salary Calculation: Gross=${grossSalary}, Deductions=${deductions}, Net=${netSalary}`);
  
  return Math.max(0, netSalary);
};

const Employee = sequelize.define(
  "Employee",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    employee_code: {
      type: DataTypes.STRING,
      unique: true,
      field: 'employee_code'
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      },
      field: 'username'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
      field: 'email'
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'password'
    },
    company_code: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      },
      field: 'company_code'
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'company_name'
    },
    phone: {
      type: DataTypes.STRING,
      field: 'phone'
    },
    department: {
      type: DataTypes.STRING,
      field: 'department'
    },
    position: {
      type: DataTypes.STRING,
      field: 'position'
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'staff',
      field: 'role'
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
      field: 'status'
    },
    join_date: {
      type: DataTypes.BIGINT,
      field: 'join_date'
    },

    // ==================== SALARY FIELDS ====================
    salary_basic: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      field: 'salary_basic'
    },
    salary_hra: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      field: 'salary_hra'
    },
    salary_allowances: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      field: 'salary_allowances'
    },
    salary_pf: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      field: 'salary_pf'
    },
    salary_esi: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      field: 'salary_esi'
    },
    salary_tax: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      field: 'salary_tax'
    },
    salary_net: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      field: 'salary_net'
    },
    salary_currency: {
      type: DataTypes.STRING,
      defaultValue: 'INR',
      field: 'salary_currency'
    },
    salary_payment_type: {
      type: DataTypes.ENUM('monthly', 'weekly', 'bi-weekly', 'hourly'),
      defaultValue: 'monthly',
      field: 'salary_payment_type'
    },
    salary_bank_account: {
      type: DataTypes.STRING,
      field: 'salary_bank_account'
    },
    salary_bank_name: {
      type: DataTypes.STRING,
      field: 'salary_bank_name'
    },
    salary_bank_ifsc: {
      type: DataTypes.STRING,
      field: 'salary_bank_ifsc'
    },
    salary_effective_date: {
      type: DataTypes.BIGINT,
      field: 'salary_effective_date'
    },
    salary_notes: {
      type: DataTypes.TEXT,
      field: 'salary_notes'
    },
    // ==================== END SALARY FIELDS ====================

    access: {
      type: DataTypes.JSON,
      defaultValue: ["Dashboard"],
      field: 'access'
    },
    ledgerregions: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'ledgerregions'
    },
    address: {
      type: DataTypes.TEXT,
      field: 'address'
    },
    imgurl: {
      type: DataTypes.STRING,
      defaultValue: "",
      field: 'imgurl'
    },
    base_url: {
      type: DataTypes.STRING,
      defaultValue: "",
      field: 'base_url'
    },
    featuresaccess: {
      type: DataTypes.JSON,
      defaultValue: [
        {
          index: 0,
          selected: true,
          price: 1000,
          description: "",
          title: "Dashboard",
          infoBtn: false,
          card: "",
          selectCard: "/static/media/dashboardG.632e3da4.svg",
          paid: false,
          url: "dashboard",
          cardWhite: "/static/media/dashboardWhite.fe5f6a4a.svg",
        },
      ],
      field: 'featuresaccess'
    },
    created_at: {
      type: DataTypes.BIGINT,
      defaultValue: () => Math.floor(Date.now() / 1000),
      field: 'created_at'
    },
    modified_at: {
      type: DataTypes.BIGINT,
      defaultValue: () => Math.floor(Date.now() / 1000),
      field: 'modified_at'
    },
  },
  {
    tableName: "employees",
    timestamps: false,
    hooks: {
      beforeCreate: async (employee) => {
        try {
          console.log("=== BEFORE CREATE HOOK ===");
          
          // Generate unique employee code
          employee.employee_code = await generateUniqueEmployeeCode();
          console.log("Generated employee_code:", employee.employee_code);
          
          // Hash password
          if (employee.password) {
            employee.password = await bcrypt.hash(employee.password, 12);
          } else {
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            employee.password = await bcrypt.hash(randomPassword, 12);
          }

          // Set timestamps as BIGINT
          const timestamp = Math.floor(Date.now() / 1000);
          employee.created_at = timestamp;
          employee.modified_at = timestamp;
          
          // Set join_date as BIGINT timestamp
          if (!employee.join_date) {
            employee.join_date = timestamp;
          } else if (employee.join_date instanceof Date) {
            employee.join_date = Math.floor(employee.join_date.getTime() / 1000);
          }

          // Set salary effective date if not provided
          if (!employee.salary_effective_date) {
            employee.salary_effective_date = timestamp;
          }

          // Calculate net salary if salary components are provided
          if (employee.salary_basic || employee.salary_hra || employee.salary_allowances) {
            employee.salary_net = calculateNetSalary(employee);
          }
          
          console.log("Timestamps set - created_at:", employee.created_at, "modified_at:", employee.modified_at);
          
        } catch (error) {
          console.error("Error in beforeCreate hook:", error);
          throw error;
        }
      },
      beforeUpdate: async (employee) => {
        employee.modified_at = Math.floor(Date.now() / 1000);
        
        if (employee.changed('password') && employee.password) {
          employee.password = await bcrypt.hash(employee.password, 12);
        }
        
        // Convert join_date to timestamp if it's a Date object
        if (employee.join_date instanceof Date) {
          employee.join_date = Math.floor(employee.join_date.getTime() / 1000);
        }

        // Calculate net salary if salary components are changed
        if (employee.changed('salary_basic') || employee.changed('salary_hra') || 
            employee.changed('salary_allowances') || employee.changed('salary_pf') || 
            employee.changed('salary_esi') || employee.changed('salary_tax')) {
          employee.salary_net = calculateNetSalary(employee);
        }

        // Set salary effective date if not provided and salary is being updated
        if ((employee.changed('salary_basic') || employee.changed('salary_hra')) && !employee.salary_effective_date) {
          employee.salary_effective_date = Math.floor(Date.now() / 1000);
        }
      },
    },
  }
);

// Instance method to check password
Employee.prototype.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get salary details
Employee.prototype.getSalaryDetails = function () {
  return {
    basic: parseFloat(this.salary_basic) || 0,
    hra: parseFloat(this.salary_hra) || 0,
    allowances: parseFloat(this.salary_allowances) || 0,
    pf: parseFloat(this.salary_pf) || 0,
    esi: parseFloat(this.salary_esi) || 0,
    tax: parseFloat(this.salary_tax) || 0,
    net: parseFloat(this.salary_net) || 0,
    currency: this.salary_currency || 'INR',
    payment_type: this.salary_payment_type || 'monthly',
    bank_account: this.salary_bank_account || '',
    bank_name: this.salary_bank_name || '',
    bank_ifsc: this.salary_bank_ifsc || '',
    effective_date: this.salary_effective_date || this.created_at,
    notes: this.salary_notes || ''
  };
};

// Instance method to calculate salary breakdown
Employee.prototype.calculateSalaryBreakdown = function () {
  const basic = parseFloat(this.salary_basic) || 0;
  const hra = parseFloat(this.salary_hra) || 0;
  const allowances = parseFloat(this.salary_allowances) || 0;
  const pf = parseFloat(this.salary_pf) || 0;
  const esi = parseFloat(this.salary_esi) || 0;
  const tax = parseFloat(this.salary_tax) || 0;
  const net = parseFloat(this.salary_net) || 0;

  const gross = basic + hra + allowances;
  const totalDeductions = pf + esi + tax;

  return {
    gross_salary: gross,
    total_deductions: totalDeductions,
    net_salary: net,
    breakdown: {
      basic: basic,
      hra: hra,
      allowances: allowances,
      pf: pf,
      esi: esi,
      tax: tax
    },
    percentages: {
      basic_percentage: gross > 0 ? ((basic / gross) * 100).toFixed(2) : '0.00',
      hra_percentage: gross > 0 ? ((hra / gross) * 100).toFixed(2) : '0.00',
      allowances_percentage: gross > 0 ? ((allowances / gross) * 100).toFixed(2) : '0.00',
      deductions_percentage: gross > 0 ? ((totalDeductions / gross) * 100).toFixed(2) : '0.00'
    }
  };
};

// Instance method to update salary
Employee.prototype.updateSalary = async function (salaryData) {
  const updateData = {};
  
  const salaryFields = [
    'salary_basic', 'salary_hra', 'salary_allowances', 'salary_pf', 
    'salary_esi', 'salary_tax', 'salary_currency', 'salary_payment_type',
    'salary_bank_account', 'salary_bank_name', 'salary_bank_ifsc', 
    'salary_effective_date', 'salary_notes'
  ];
  
  salaryFields.forEach(field => {
    if (salaryData[field] !== undefined) {
      updateData[field] = salaryData[field];
    }
  });

  // Set effective date if not provided
  if (salaryData.salary_basic && !updateData.salary_effective_date) {
    updateData.salary_effective_date = Math.floor(Date.now() / 1000);
  }

  await this.update(updateData);
  return this.getSalaryDetails();
};

// Instance method to get basic info (without password)
Employee.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

// Static method to find by company
Employee.findByCompany = function (companyCode) {
  return this.findAll({
    where: { company_code: companyCode },
    attributes: { exclude: ['password'] }
  });
};

// Static method to find active employees by company
Employee.findActiveByCompany = function (companyCode) {
  return this.findAll({
    where: { 
      company_code: companyCode,
      status: 'active'
    },
    attributes: { exclude: ['password'] }
  });
};

// Static method to find employees by salary range
Employee.findBySalaryRange = function (companyCode, minSalary = 0, maxSalary = 9999999) {
  return this.findAll({
    where: { 
      company_code: companyCode,
      salary_net: {
        [Op.between]: [minSalary, maxSalary]
      }
    },
    attributes: { exclude: ['password'] }
  });
};

// Static method to get company salary summary
Employee.getCompanySalarySummary = async function (companyCode) {
  const employees = await this.findAll({
    where: { 
      company_code: companyCode,
      status: 'active'
    },
    attributes: [
      'id', 'employee_code', 'username', 'department', 'position',
      'salary_basic', 'salary_hra', 'salary_allowances', 'salary_net'
    ]
  });

  let totalBasic = 0;
  let totalHra = 0;
  let totalAllowances = 0;
  let totalNet = 0;

  employees.forEach(employee => {
    totalBasic += parseFloat(employee.salary_basic) || 0;
    totalHra += parseFloat(employee.salary_hra) || 0;
    totalAllowances += parseFloat(employee.salary_allowances) || 0;
    totalNet += parseFloat(employee.salary_net) || 0;
  });

  return {
    total_employees: employees.length,
    total_basic: totalBasic,
    total_hra: totalHra,
    total_allowances: totalAllowances,
    total_net_salary: totalNet,
    average_salary: employees.length > 0 ? totalNet / employees.length : 0
  };
};

module.exports = Employee;