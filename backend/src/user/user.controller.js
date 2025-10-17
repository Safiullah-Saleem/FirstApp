const User = require("./user.model");
const { generateToken, verifyPassword } = require("../utils/authUtils");
// ab railway walo ko pade sare theek ho gya ha ustad 

// User Registration
const signupAdmin = async (req, res) => {
  try {
    console.log("=== SIGNUP REQUEST ===");
    console.log("Request body:", req.body);

    let userData;

    // Handle different request formats
    if (
      req.body.request &&
      req.body.request.data &&
      req.body.request.data.user
    ) {
      userData = req.body.request.data.user;
    } else if (req.body.user) {
      userData = req.body.user;
    } else {
      userData = req.body;
    }

    console.log("User data to save:", userData);

    // Check required fields
    if (!userData.email) {
      return res.status(400).json({
        response: {
          status: { statusCode: 400, statusMessage: "Email is required" },
          data: null,
        },
      });
    }

    console.log("Checking if user exists...");
    const existingUser = await User.findOne({
      where: { email: userData.email },
    });
    if (existingUser) {
      console.log("User already exists");
      return res.status(400).json({
        response: {
          status: { statusCode: 400, statusMessage: "User already exists" },
          data: null,
        },
      });
    }

    console.log("Creating new user...");
    const newUser = await User.create({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
      company_name: userData.company_name,
      address: userData.address,
    });

    console.log("USER CREATED SUCCESSFULLY!");
    console.log("User ID:", newUser.id);
    console.log("Company Code:", newUser.company_code);

    // Generate token
    const token = generateToken(newUser);

    // Response
    const userResponse = {
      _id: newUser.email,
      _rev: `1-${newUser.id}`,
      company_name: newUser.company_name,
      address: newUser.address,
      phone: newUser.phone,
      email: newUser.email,
      name: newUser.name,
      company_code: newUser.company_code,
      isTrial: newUser.isTrial,
      isPaid: newUser.isPaid,
      created_at: newUser.created_at,
      modified_at: newUser.modified_at,
      featuresAccess: [],
      imgURL: `https://managekaro-documents.s3.us-west-2.amazonaws.com/${newUser.company_code}/default-avatar.png`,
      base_url: "",
      gst: 0,
    };

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "User registered successfully",
        },
        data: {
          user: userResponse,
          token: token,
        },
      },
    });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    res.status(500).json({
      response: {
        status: { statusCode: 500, statusMessage: error.message },
        data: null,
      },
    });
  }
};

// User Login
const loginAdmin = async (req, res) => {
  try {
    console.log("===LOGIN REQUEST ===");
    console.log("Request body:", req.body);

    let userData;

    // Handle different request formats
    if (req.body.data && req.body.data.user) {
      userData = req.body.data.user;
    } else if (req.body.user) {
      userData = req.body.user;
    } else {
      userData = req.body;
    }

    console.log("Login data:", userData);

    const { email, password } = userData;

    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Email and password are required",
          },
          data: null,
        },
      });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        response: {
          status: {
            statusCode: 401,
            statusMessage: "Invalid email or password",
          },
          data: null,
        },
      });
    }

    // Check password
    const isPasswordValid = await user.correctPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        response: {
          status: {
            statusCode: 401,
            statusMessage: "Invalid email or password",
          },
          data: null,
        },
      });
    }

    // Generate token
    const token = generateToken(user);

    console.log("Login successful for:", email);

    // Prepare user response (exclude password)
    const userResponse = {
      _id: user.email,
      _rev: `1-${user.id}`,
      company_name: user.company_name,
      address: user.address,
      phone: user.phone,
      email: user.email,
      name: user.name,
      company_code: user.company_code,
      isTrial: user.isTrial,
      isPaid: user.isPaid,
      created_at: user.created_at,
      modified_at: user.modified_at,
      featuresAccess: [],
      imgURL: `https://managekaro-documents.s3.us-west-2.amazonaws.com/${user.company_code}/default-avatar.png`,
      base_url: "",
      gst: 0,
    };

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: {
          user: userResponse,
          token: token,
        },
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error",
        },
        data: null,
      },
    });
  }
};

// User Update
const updateUser = async (req, res) => {
  try {
    console.log("=== UPDATE USER REQUEST ===");
    console.log("Request body:", req.body);

    let userData;
    let userId;

    // Handle different request formats
    if (req.body.request && req.body.request.data) {
      userId = req.body.request.data._id;
      userData = req.body.request.data.user || req.body.request.data;
    } else if (req.body.data) {
      userId = req.body.data._id;
      userData = req.body.data.user || req.body.data;
    } else {
      userId = req.body._id;
      userData = req.body.user || req.body;
    }

    console.log("User ID to update:", userId);
    console.log("Update data:", userData);

    if (!userId) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "User ID is required",
          },
          data: null,
        },
      });
    }

    // Find user by email (since _id is email in your example)
    const user = await User.findOne({ where: { email: userId } });

    if (!user) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "User not found",
          },
          data: null,
        },
      });
    }

    // Prepare update data
    const updateData = {
      modified_at: Math.floor(Date.now() / 1000),
    };

    // Update allowed fields
    if (userData.name) updateData.name = userData.name;
    if (userData.company_name) updateData.company_name = userData.company_name;
    if (userData.phone) updateData.phone = userData.phone;

    // Handle address (could be string or object)
    if (userData.address) {
      if (typeof userData.address === "object") {
        updateData.address = userData.address.street || userData.address;
      } else {
        updateData.address = userData.address;
      }
    }

    // Update user
    await user.update(updateData);

    console.log("User updated successfully:", userId);

    // Prepare response
    const userResponse = {
      _id: user.email,
      _rev: `2-${user.id}`,
      company_name: user.company_name,
      address: user.address,
      phone: user.phone,
      email: user.email,
      name: user.name,
      company_code: user.company_code,
      isTrial: user.isTrial,
      isPaid: user.isPaid,
      created_at: user.created_at,
      modified_at: user.modified_at,
      featuresAccess: [],
      imgURL: `https://managekaro-documents.s3.us-west-2.amazonaws.com/${user.company_code}/default-avatar.png`,
      base_url: "",
      gst: 0,
    };

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "User updated successfully",
        },
        data: {
          user: userResponse,
        },
      },
    });
  } catch (error) {
    console.error(" UPDATE ERROR:", error);
    res.status(500).json({
      response: {
        status: {
          statusCode: 500,
          statusMessage: "Internal server error",
        },
        data: null,
      },
    });
  }
};

// Get specific user
const getUser = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({
      where: { email },
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({
        response: {
          status: { statusCode: 404, statusMessage: "User not found" },
          data: null,
        },
      });
    }

    const userResponse = {
      _id: user.email,
      _rev: `1-${user.id}`,
      company_name: user.company_name,
      address: user.address,
      phone: user.phone,
      email: user.email,
      name: user.name,
      company_code: user.company_code,
      isTrial: user.isTrial,
      isPaid: user.isPaid,
      created_at: user.created_at,
      modified_at: user.modified_at,
      featuresAccess: [],
      imgURL: `https://managekaro-documents.s3.us-west-2.amazonaws.com/${user.company_code}/default-avatar.png`,
      base_url: "",
      gst: 0,
    };

    res.json({
      response: {
        status: { statusCode: 200, statusMessage: "OK" },
        data: { user: userResponse },
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      response: {
        status: { statusCode: 500, statusMessage: "Server error" },
        data: null,
      },
    });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    console.log("🔍 Fetching all users from database...");
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
    });

    console.log(` Found ${users.length} users in database`);

    res.json({
      success: true,
      total: users.length,
      users: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: error.message });
  }
};

// Export all functions
module.exports = {
  signupAdmin,
  loginAdmin,
  updateUser,
  getUser,
  getAllUsers,
};
