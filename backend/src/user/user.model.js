const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

// Generate unique 4-digit company code
const generateUniqueCompanyCode = async () => {
  let isUnique = false;
  let code;

  while (!isUnique) {
    code = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
    const existingUser = await User.findOne({ where: { company_code: code } });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return code;
};

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    company_code: {
      type: DataTypes.STRING,
      unique: true,
    },
    isTrial: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // NEW FIELDS FOR COMPANY SETTINGS
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

    // Fields that exist in the database but weren't in the model
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('admin', 'user', 'manager'),
      defaultValue: 'user',
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
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
        // Hash password
        user.password = await bcrypt.hash(user.password, 12);

        // Generate unique company code
        user.company_code = await generateUniqueCompanyCode();

        // Set timestamps
        const timestamp = Math.floor(Date.now() / 1000);
        user.created_at = timestamp;
        user.modified_at = timestamp;

        // Initialize new fields with default values
        user.terms_conditions = user.terms_conditions || "";
        user.gst_number = user.gst_number || "";
        user.company_logo = user.company_logo || "";
        user.bill_stamp = user.bill_stamp || {};
        user.stock_value = user.stock_value || "no";
        user.ledger_regions = user.ledger_regions || [];
        user.access = user.access || [];
        user.features_access = user.features_access || [];

        // Initialize additional fields
        user.first_name = user.first_name || "";
        user.last_name = user.last_name || "";
        user.role = user.role || "user";
        user.is_active = user.is_active !== undefined ? user.is_active : true;
        user.email_verified = user.email_verified !== undefined ? user.email_verified : false;
        user.updated_at = new Date().toISOString();
      },
      beforeUpdate: (user) => {
        user.modified_at = Math.floor(Date.now() / 1000);
        user.updated_at = new Date().toISOString();
      },
    },
  }
);

// Instance method to check password
User.prototype.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
