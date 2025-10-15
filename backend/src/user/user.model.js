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
    is_trial: {
      // CHANGED: Use snake_case to match database
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_trial", // Keep field mapping for consistency
    },
    is_paid: {
      // CHANGED: Use snake_case to match database
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_paid",
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
      type: DataTypes.ENUM("admin", "user", "manager"),
      defaultValue: "user",
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
      allowNull: true,
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
        try {
          // Hash password
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 12);
          }

          // Generate unique company code
          let isUnique = false;
          let code;
          let attempts = 0;

          while (!isUnique && attempts < 10) {
            code = Math.floor(1000 + Math.random() * 9000).toString();

            const [results] = await sequelize.query(
              "SELECT COUNT(*) as count FROM users WHERE company_code = ?",
              {
                replacements: [code],
                type: sequelize.QueryTypes.SELECT,
              }
            );

            if (results.count === 0) {
              isUnique = true;
            }
            attempts++;
          }

          if (!isUnique) {
            code = Date.now().toString().slice(-4);
          }

          user.company_code = code;

          // Set timestamps
          const timestamp = Math.floor(Date.now() / 1000);
          user.created_at = user.created_at || timestamp;
          user.modified_at = user.modified_at || timestamp;
          user.updated_at = user.updated_at || new Date();

          // Initialize required fields
          user.company_name = user.company_name || "My Company";
          user.first_name = user.first_name || "";
          user.last_name = user.last_name || "";

          // Auto-generate name
          if (!user.name && (user.first_name || user.last_name)) {
            user.name = `${user.first_name || ""} ${
              user.last_name || ""
            }`.trim();
          } else if (!user.name) {
            user.name = user.company_name || "User";
          }

          user.role = user.role || "user";
          user.is_active = user.is_active !== undefined ? user.is_active : true;
          user.email_verified =
            user.email_verified !== undefined ? user.email_verified : false;

          // Initialize company settings
          user.terms_conditions = user.terms_conditions || "";
          user.gst_number = user.gst_number || "";
          user.company_logo = user.company_logo || "";
          user.bill_stamp = user.bill_stamp || {};
          user.stock_value = user.stock_value || "no";
          user.ledger_regions = user.ledger_regions || [];
          user.access = user.access || [];
          user.features_access = user.features_access || [];
        } catch (error) {
          console.error("Error in user beforeCreate hook:", error);
          throw error;
        }
      },

      beforeUpdate: async (user) => {
        try {
          user.modified_at = Math.floor(Date.now() / 1000);
          user.updated_at = new Date();

          // Hash password if it's being updated
          if (user.changed("password") && user.password) {
            user.password = await bcrypt.hash(user.password, 12);
          }
        } catch (error) {
          console.error("Error in user beforeUpdate hook:", error);
          throw error;
        }
      },
    },
  }
);

// Instance method to check password
User.prototype.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// UPDATED: Fix property names in getProfile method
User.prototype.getProfile = function () {
  return {
    id: this.id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    company_name: this.company_name,
    company_code: this.company_code,
    is_trial: this.is_trial, // CHANGED: from isTrial
    is_paid: this.is_paid, // CHANGED: from isPaid
    first_name: this.first_name,
    last_name: this.last_name,
    role: this.role,
    is_active: this.is_active,
    email_verified: this.email_verified,
    profile_image: this.profile_image,
    date_of_birth: this.date_of_birth,
    created_at: this.created_at,
    last_login: this.last_login,
  };
};

module.exports = User;
