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
    company_name: {
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
      },
      beforeUpdate: (user) => {
        user.modified_at = Math.floor(Date.now() / 1000);
      },
    },
  }
);

// Instance method to check password
User.prototype.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
