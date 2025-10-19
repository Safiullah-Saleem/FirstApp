const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

const Employee = sequelize.define(
  "Employee",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employee_code: {
      type: DataTypes.STRING,
      unique: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    company_code: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // ADDED: Proper employee fields
    phone: {
      type: DataTypes.STRING,
    },
    department: {
      type: DataTypes.STRING,
    },
    position: {
      type: DataTypes.STRING,
    },
    role: {
      type: DataTypes.ENUM('manager', 'staff', 'supervisor', 'accountant'),
      defaultValue: 'staff'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active'
    },
    join_date: {
      type: DataTypes.BIGINT,
    },
    access: {
      type: DataTypes.JSON,
      defaultValue: ["Dashboard"],
    },
    ledgerRegions: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    address: {
      type: DataTypes.TEXT,
    },
    imgURL: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    base_url: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    featuresAccess: {
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
    tableName: "employees",
    timestamps: false,
    hooks: {
      beforeCreate: async (employee) => {
        // Generate unique employee code FIRST (before any DB operations)
        employee.employee_code = await generateUniqueEmployeeCode();
        
        // Hash password if provided, otherwise generate random one
        if (employee.password) {
          employee.password = await bcrypt.hash(employee.password, 12);
        } else {
          // Generate secure random password
          const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          employee.password = await bcrypt.hash(randomPassword, 12);
        }

        // Set timestamps
        const timestamp = Math.floor(Date.now() / 1000);
        employee.created_at = timestamp;
        employee.modified_at = timestamp;
        
        // Set join date if not provided
        if (!employee.join_date) {
          employee.join_date = timestamp;
        }
      },
      beforeUpdate: async (employee) => {
        employee.modified_at = Math.floor(Date.now() / 1000);
        
        // Hash password if it's being updated
        if (employee.changed('password') && employee.password) {
          employee.password = await bcrypt.hash(employee.password, 12);
        }
      },
    },
  }
);

// Generate unique 4-digit employee code (DEFINED AFTER Model)
const generateUniqueEmployeeCode = async () => {
  let isUnique = false;
  let code;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
    const existingEmployee = await Employee.findOne({
      where: { employee_code: code },
    });
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

// Instance method to check password
Employee.prototype.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
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

module.exports = Employee;