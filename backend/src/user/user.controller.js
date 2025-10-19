const User = require("./user.model");
const { generateToken } = require("../utils/authUtils");

// Utility Functions
const buildUserResponse = (user) => ({
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
  featuresAccess: user.features_access || [],
  imgURL: user.company_logo || `https://managekaro-documents.s3.us-west-2.amazonaws.com/${user.company_code}/default-avatar.png`,
  base_url: "",
  gst: user.gst_number || 0,
  terms_conditions: user.terms_conditions || "",
  role: user.role || "company_admin"
});

const errorResponse = (statusCode, message) => ({
  response: {
    status: { statusCode, statusMessage: message },
    data: null,
  }
});

const successResponse = (message, data = null) => ({
  response: {
    status: { statusCode: 200, statusMessage: message },
    data
  }
});

// User Registration
const signupAdmin = async (req, res) => {
  try {
    console.log("=== SIGNUP REQUEST ===");
    console.log("Request body:", req.body);

    let userData;

    // Handle different request formats
    if (req.body.request?.data?.user) {
      userData = req.body.request.data.user;
    } else if (req.body.user) {
      userData = req.body.user;
    } else {
      userData = req.body;
    }

    console.log("User data to save:", userData);

    // Check required fields
    if (!userData.email || !userData.password) {
      return res.status(400).json(
        errorResponse(400, "Email and password are required")
      );
    }

    console.log("Checking if user exists...");
    const existingUser = await User.findOne({
      where: { email: userData.email },
    });
    
    if (existingUser) {
      console.log("User already exists");
      return res.status(400).json(
        errorResponse(400, "User already exists")
      );
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
    const token = generateToken(newUser, 'user');

    const userResponse = buildUserResponse(newUser);

    res.json(
      successResponse("User registered successfully", {
        user: userResponse,
        token: token,
      })
    );
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    res.status(500).json(
      errorResponse(500, error.message)
    );
  }
};

// User Login
const loginAdmin = async (req, res) => {
  try {
    console.log("=== LOGIN REQUEST ===");
    console.log("Request body:", req.body);

    let userData;

    // Handle different request formats
    if (req.body.data?.user) {
      userData = req.body.data.user;
    } else if (req.body.user) {
      userData = req.body.user;
    } else {
      userData = req.body;
    }

    console.log("Login data:", userData);

    const { email, password } = userData;

    if (!email || !password) {
      return res.status(400).json(
        errorResponse(400, "Email and password are required")
      );
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json(
        errorResponse(401, "Invalid email or password")
      );
    }

    // Check password
    const isPasswordValid = await user.correctPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json(
        errorResponse(401, "Invalid email or password")
      );
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate token
    const token = generateToken(user, 'user');
    console.log("Login successful for:", email);

    const userResponse = buildUserResponse(user);

    res.json(
      successResponse("OK", {
        user: userResponse,
        token: token,
      })
    );
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
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
    if (req.body.request?.data) {
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
      return res.status(400).json(
        errorResponse(400, "User ID is required")
      );
    }

    // SECURITY: Ensure user can only update users in their company
    const companyCode = req.user.company_code;

    // Find user by email within the same company
    const user = await User.findOne({ 
      where: { 
        email: userId,
        company_code: companyCode // SECURITY: Only same company
      } 
    });

    if (!user) {
      return res.status(404).json(
        errorResponse(404, "User not found")
      );
    }

    // Prepare update data
    const updateData = {
      modified_at: Math.floor(Date.now() / 1000),
    };

    // Update allowed fields
    if (userData.name !== undefined) updateData.name = userData.name;
    if (userData.company_name !== undefined) updateData.company_name = userData.company_name;
    if (userData.phone !== undefined) updateData.phone = userData.phone;
    if (userData.address !== undefined) updateData.address = userData.address;
    if (userData.role !== undefined) updateData.role = userData.role;
    if (userData.is_active !== undefined) updateData.is_active = userData.is_active;

    // Handle address object
    if (userData.address && typeof userData.address === "object") {
      updateData.address = userData.address.street || userData.address;
    }

    // Update user
    await user.update(updateData);
    console.log("User updated successfully:", userId);

    const userResponse = buildUserResponse(user);

    res.json(
      successResponse("User updated successfully", {
        user: userResponse,
      })
    );
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Get specific user
const getUser = async (req, res) => {
  try {
    const { email } = req.params;
    
    // SECURITY: Only allow users to access their own company data
    const companyCode = req.user.company_code;
    
    const user = await User.findOne({
      where: { 
        email,
        company_code: companyCode
      },
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json(
        errorResponse(404, "User not found")
      );
    }

    const userResponse = buildUserResponse(user);

    res.json(
      successResponse("OK", { 
        user: userResponse 
      })
    );
  } catch (error) {
    console.error("GET USER ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Server error")
    );
  }
};

// Get all users - SECURITY FIXED
const getAllUsers = async (req, res) => {
  try {
    const companyCode = req.user.company_code;
    
    console.log("🔍 Fetching COMPANY USERS for:", companyCode);

    const users = await User.findAll({
      where: { 
        company_code: companyCode
      },
      attributes: { exclude: ["password"] },
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ Found ${users.length} users in company ${companyCode}`);

    const userResponses = users.map(user => buildUserResponse(user));

    res.json(
      successResponse("OK", {
        users: userResponses,
        total: users.length,
      })
    );
  } catch (error) {
    console.error("GET ALL USERS ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Get current user profile
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyCode = req.user.company_code;

    console.log("🔍 Fetching current user profile for:", userId);

    const user = await User.findOne({
      where: { 
        id: userId,
        company_code: companyCode
      },
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json(
        errorResponse(404, "User not found")
      );
    }

    const userResponse = buildUserResponse(user);

    res.json(
      successResponse("OK", {
        user: userResponse
      })
    );
  } catch (error) {
    console.error("GET CURRENT USER ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Server error")
    );
  }
};

module.exports = {
  signupAdmin,
  loginAdmin,
  updateUser,
  getUser,
  getAllUsers,
  getCurrentUser
};