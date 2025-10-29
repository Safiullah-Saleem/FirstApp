const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

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
      type: DataTypes.BIGINT, // CHANGED: Use BIGINT for timestamp
      field: 'join_date'
    },
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
          
          // Set join_date as BIGINT timestamp (not Date object)
          if (!employee.join_date) {
            employee.join_date = timestamp;
          } else if (employee.join_date instanceof Date) {
            // Convert Date object to timestamp
            employee.join_date = Math.floor(employee.join_date.getTime() / 1000);
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
      },
    },
  }
);

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