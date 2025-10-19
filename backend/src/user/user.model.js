const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
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
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    company_code: {
      type: DataTypes.STRING,
      unique: true,
    },
    // ✅ CONSISTENT: Use camelCase for JavaScript, let Sequelize handle database mapping
    isTrial: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_trial"
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_paid"
    },
    terms_conditions: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    gst_number: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    company_logo: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    bill_stamp: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    stock_value: {
      type: DataTypes.STRING,
      defaultValue: "no",
    },
    ledger_regions: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    access: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    features_access: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM("super_admin", "company_admin", "staff"),
      defaultValue: "company_admin",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    profile_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
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
    tableName: "users",
    timestamps: false,
    hooks: {
      beforeCreate: async (user) => {
        try {
          // Hash password
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 12);
          }

          // Generate unique company code
          user.company_code = await generateUniqueCompanyCode();

          // Set timestamps
          const timestamp = Math.floor(Date.now() / 1000);
          user.created_at = timestamp;
          user.modified_at = timestamp;

          // Set default values for required fields
          user.company_name = user.company_name || "My Company";
          user.name = user.name || user.company_name || "User";
          user.role = user.role || "company_admin";

          // Initialize company settings with proper defaults
          user.terms_conditions = user.terms_conditions || "";
          user.gst_number = user.gst_number || "";
          user.company_logo = user.company_logo || "";
          user.bill_stamp = user.bill_stamp || {};
          user.stock_value = user.stock_value || "no";
          user.ledger_regions = user.ledger_regions || [];
          user.access = user.access || [];
          user.features_access = user.features_access || [];
          user.is_active = user.is_active !== undefined ? user.is_active : true;
          user.email_verified = user.email_verified !== undefined ? user.email_verified : false;
          user.isTrial = user.isTrial !== undefined ? user.isTrial : true;
          user.isPaid = user.isPaid !== undefined ? user.isPaid : false;

        } catch (error) {
          console.error("Error in user beforeCreate hook:", error);
          throw error;
        }
      },

      beforeUpdate: async (user) => {
        try {
          user.modified_at = Math.floor(Date.now() / 1000);

          // Hash password if it's being updated
          if (user.changed("password") && user.password) {
            user.password = await bcrypt.hash(user.password, 12);
          }

          // Update name if first_name or last_name changed
          if (user.changed("first_name") || user.changed("last_name")) {
            user.name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
          }

        } catch (error) {
          console.error("Error in user beforeUpdate hook:", error);
          throw error;
        }
      },
    },
  }
);

// Generate unique company code
const generateUniqueCompanyCode = async () => {
  let isUnique = false;
  let code;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    
    const existingUser = await User.findOne({
      where: { company_code: code }
    });

    if (!existingUser) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    // Fallback: use timestamp-based code
    code = `COMP${Date.now().toString().slice(-6)}`;
  }

  return code;
};

// Instance method to check password
User.prototype.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get user profile (exclude sensitive data)
User.prototype.getProfile = function () {
  return {
    id: this.id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    address: this.address,
    company_name: this.company_name,
    company_code: this.company_code,
    isTrial: this.isTrial,
    isPaid: this.isPaid,
    first_name: this.first_name,
    last_name: this.last_name,
    role: this.role,
    is_active: this.is_active,
    email_verified: this.email_verified,
    profile_image: this.profile_image,
    date_of_birth: this.date_of_birth,
    created_at: this.created_at,
    last_login: this.last_login,
    company_logo: this.company_logo,
    terms_conditions: this.terms_conditions,
    gst_number: this.gst_number,
    features_access: this.features_access,
    access: this.access
  };
};

// Static method to find active users by company
User.findByCompany = function (companyCode) {
  return this.findAll({
    where: { 
      company_code: companyCode,
      is_active: true
    },
    attributes: { exclude: ['password'] }
  });
};

// Static method to find by email with company code
User.findByEmailWithCompany = function (email) {
  return this.findOne({
    where: { email },
    attributes: { include: ['company_code', 'role', 'is_active'] }
  });
};

// Static method to find admin by company
User.findAdminByCompany = function (companyCode) {
  return this.findOne({
    where: { 
      company_code: companyCode,
      role: 'company_admin',
      is_active: true
    },
    attributes: { exclude: ['password'] }
  });
};

// Override toJSON to exclude password
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

// Instance method to check if user is admin
User.prototype.isAdmin = function () {
  return this.role === 'company_admin' || this.role === 'super_admin';
};

// Instance method to check if user is active
User.prototype.isActive = function () {
  return this.is_active === true;
};

module.exports = User;