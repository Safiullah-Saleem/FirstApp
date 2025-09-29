const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

// Generate unique 4-digit employee code
const generateUniqueEmployeeCode = async () => {
  let isUnique = false;
  let code;

  while (!isUnique) {
    code = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
    const existingEmployee = await Employee.findOne({
      where: { employee_code: code },
    });
    if (!existingEmployee) {
      isUnique = true;
    }
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
    },
    employee_code: {
      type: DataTypes.STRING,
      unique: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
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
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
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
        // Hash password
        employee.password = await bcrypt.hash(employee.password, 12);

        // Generate unique employee code
        employee.employee_code = await generateUniqueEmployeeCode();

        // Set timestamps
        const timestamp = Math.floor(Date.now() / 1000);
        employee.created_at = timestamp;
        employee.modified_at = timestamp;
      },
      beforeUpdate: (employee) => {
        employee.modified_at = Math.floor(Date.now() / 1000);
      },
    },
  }
);

// Instance method to check password
Employee.prototype.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = Employee;
