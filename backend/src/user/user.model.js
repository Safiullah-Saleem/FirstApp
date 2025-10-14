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
    // ADDED: Name field that was missing from model but exists in database
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "name", // Explicit field mapping
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
      field: "email",
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "phone",
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "password",
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "address",
    },
    // Company name field
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "company_name",
    },
    company_code: {
      type: DataTypes.STRING,
      unique: true,
      field: "company_code",
    },
    isTrial: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_trial", // FIXED: Changed to match database column name
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_paid", // FIXED: Changed to match database column name
    },

    // COMPANY SETTINGS FIELDS
    terms_conditions: {
      type: DataTypes.TEXT,
      defaultValue: "",
      field: "terms_conditions",
    },
    gst_number: {
      type: DataTypes.STRING,
      defaultValue: "",
      field: "gst_number",
    },
    company_logo: {
      type: DataTypes.STRING,
      defaultValue: "",
      field: "company_logo",
    },
    bill_stamp: {
      type: DataTypes.JSON,
      defaultValue: {},
      field: "bill_stamp",
    },
    stock_value: {
      type: DataTypes.STRING,
      defaultValue: "no",
      field: "stock_value",
    },
    ledger_regions: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: "ledger_regions",
    },
    access: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: "access",
    },
    features_access: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: "features_access",
    },

    // USER PROFILE FIELDS
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "first_name",
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "last_name",
    },
    role: {
      type: DataTypes.ENUM("admin", "user", "manager"),
      defaultValue: "user",
      field: "role",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "email_verified",
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_login",
    },
    profile_image: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "profile_image",
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "date_of_birth",
    },

    // FIXED: updated_at now allows null
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true, // CHANGED from false to true
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
    created_at: {
      type: DataTypes.BIGINT,
      defaultValue: () => Math.floor(Date.now() / 1000),
      field: "created_at",
    },
    modified_at: {
      type: DataTypes.BIGINT,
      defaultValue: () => Math.floor(Date.now() / 1000),
      field: "modified_at",
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

          // Generate unique company code without circular dependency
          let isUnique = false;
          let code;
          let attempts = 0;

          while (!isUnique && attempts < 10) {
            code = Math.floor(1000 + Math.random() * 9000).toString();
            const existingUser = await sequelize.models.User.findOne({
              where: { company_code: code },
            });
            if (!existingUser) {
              isUnique = true;
            }
            attempts++;
          }

          if (!isUnique) {
            // Fallback: timestamp-based code
            code = Date.now().toString().slice(-4);
          }

          user.company_code = code;

          // Set timestamps
          const timestamp = Math.floor(Date.now() / 1000);
          user.created_at = user.created_at || timestamp;
          user.modified_at = user.modified_at || timestamp;
          user.updated_at = user.updated_at || new Date();

          // Initialize required fields with defaults
          user.company_name = user.company_name || "My Company";
          user.first_name = user.first_name || "";
          user.last_name = user.last_name || "";

          // AUTO-GENERATE NAME from first_name + last_name if not provided
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

// Instance method to get user profile (without sensitive data)
User.prototype.getProfile = function () {
  return {
    id: this.id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    company_name: this.company_name,
    company_code: this.company_code,
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
