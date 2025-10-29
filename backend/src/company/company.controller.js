const User = require("../user/user.model");

// Utility Functions
const buildCompanyResponse = (company) => ({
  _id: company.company_code,
  _rev: `7-${company.id}`,
  access: company.access || [],
  company_name: company.company_name,
  address: company.address,
  created_at: company.created_at,
  modified_at: company.modified_at,
  featuresAccess: company.features_access || [],
  ledgerRegions: company.ledger_regions || [],
  stockValue: company.stock_value || "no",
  billStamp: company.bill_stamp || {},
  terms_conditions: company.terms_conditions || "",
  gst_number: company.gst_number || "",
  company_logo: company.company_logo || "",
  ceo_name: company.name,
  ceo_email: company.email,
  ceo_phone: company.phone,
  isTrial: company.isTrial,
  isPaid: company.isPaid
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

// Extract company data from request - FIXED VERSION
const extractCompanyData = (req) => {
  let companyData, companyId;

  console.log("🔍 Extracting company data from request...");
  console.log("Request body keys:", Object.keys(req.body));

  // Handle different request formats
  if (req.body.request?.data?.company) {
    companyData = req.body.request.data.company;
    companyId = req.body.request.data.company._id;
    console.log("📦 Format 1: request.data.company");
  } else if (req.body.data?.company) {
    companyData = req.body.data.company;
    companyId = req.body.data.company._id;
    console.log("📦 Format 2: data.company");
  } else if (req.body.company) {
    companyData = req.body.company;
    companyId = req.body.company._id;
    console.log("📦 Format 3: company");
  } else if (req.body._id) {
    // Direct fields in request body
    companyData = req.body;
    companyId = req.body._id;
    console.log("📦 Format 4: direct fields");
  } else {
    // No company ID in expected format, use user's company code
    companyData = req.body;
    companyId = null;
    console.log("📦 Format 5: no company ID, using user's company");
  }

  console.log("Extracted companyId:", companyId);
  console.log("Extracted companyData keys:", companyData ? Object.keys(companyData) : 'No data');

  return { companyData, companyId };
};

// Update Company Settings - FIXED VERSION
const updateCompany = async (req, res) => {
  try {
    console.log("=== UPDATE COMPANY SETTINGS ===");
    console.log("Request user:", req.user);
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const { companyData, companyId } = extractCompanyData(req);

    console.log("Company ID from request:", companyId);
    console.log("User's company code:", req.user.company_code);

    // SECURITY FIX: Use user's company code instead of relying on request
    const userCompanyCode = req.user.company_code;
    
    if (!userCompanyCode) {
      return res.status(401).json(
        errorResponse(401, "Unauthorized: Company code not found in user token")
      );
    }

    // ✅ FIXED: Don't require companyId from request, use authenticated user's company
    // Find company by user's company_code (more secure)
    const company = await User.findOne({ 
      where: { company_code: userCompanyCode } 
    });

    if (!company) {
      return res.status(404).json(
        errorResponse(404, "Company not found")
      );
    }

    // Prepare update data
    const updateData = {
      modified_at: Math.floor(Date.now() / 1000),
    };

    // Update allowed fields
    const allowedFields = [
      'company_name', 'address', 'terms_conditions', 'gst_number',
      'company_logo', 'bill_stamp', 'stock_value', 'ledger_regions',
      'access', 'features_access', 'name', 'email', 'phone' // Added CEO fields
    ];

    allowedFields.forEach(field => {
      if (companyData[field] !== undefined) {
        updateData[field] = companyData[field];
      }
    });

    console.log("Update data to apply:", updateData);

    // Update company
    await company.update(updateData);

    console.log("✅ Company settings updated successfully:", userCompanyCode);

    // Reload to get updated data
    await company.reload();

    const companyResponse = buildCompanyResponse(company);

    res.json(
      successResponse("Company settings updated successfully", {
        company: companyResponse,
      })
    );
  } catch (error) {
    console.error("❌ UPDATE COMPANY ERROR:", error);
    res.status(500).json(
      errorResponse(500, error.message || "Internal server error")
    );
  }
};

// Get Company Settings (GET endpoint with path parameter) - FIXED
const getCompanyByPath = async (req, res) => {
  try {
    const { companyCode } = req.params;
    console.log("=== GET COMPANY SETTINGS ===", companyCode);
    console.log("User's company code:", req.user.company_code);

    // SECURITY FIX: More flexible security check
    const userCompanyCode = req.user.company_code;
    
    if (!userCompanyCode) {
      return res.status(401).json(
        errorResponse(401, "Unauthorized: Company code not found")
      );
    }

    // Allow access if:
    // 1. No companyCode provided in URL (use user's company)
    // 2. companyCode matches user's company
    // 3. companyCode is 'current' or 'me'
    const targetCompanyCode = !companyCode || companyCode === 'current' || companyCode === 'me' 
      ? userCompanyCode 
      : companyCode;

    if (targetCompanyCode !== userCompanyCode) {
      return res.status(403).json(
        errorResponse(403, "Access denied. You can only access your own company settings.")
      );
    }

    const company = await User.findOne({
      where: { company_code: userCompanyCode },
      attributes: { exclude: ["password"] },
    });

    if (!company) {
      return res.status(404).json(
        errorResponse(404, "Company not found")
      );
    }

    const companyResponse = buildCompanyResponse(company);

    res.json(
      successResponse("OK", {
        company: companyResponse,
      })
    );
  } catch (error) {
    console.error("❌ GET COMPANY ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Get Company (POST endpoint with wrapped payload) - FIXED
const getCompany = async (req, res) => {
  try {
    console.log("=== GET COMPANY ===");
    console.log("Request user:", req.user);
    console.log("Request body:", req.body);

    let companyCode;

    // Extract company_code from the specific request format
    if (req.body.request?.data?._id) {
      companyCode = req.body.request.data._id;
    } else if (req.body.data?._id) {
      companyCode = req.body.data._id;
    } else if (req.body._id) {
      companyCode = req.body._id;
    } else {
      // If no company ID provided, use user's company code
      companyCode = req.user.company_code;
      console.log("No company ID in request, using user's company:", companyCode);
    }

    console.log("Looking for company with code:", companyCode);
    console.log("User's company code:", req.user.company_code);

    // SECURITY FIX: Use user's company code for lookup
    const userCompanyCode = req.user.company_code;
    
    if (!userCompanyCode) {
      return res.status(401).json(
        errorResponse(401, "Unauthorized: Company code not found")
      );
    }

    // Always use the authenticated user's company code for security
    const targetCompanyCode = companyCode && companyCode !== userCompanyCode ? userCompanyCode : userCompanyCode;

    const company = await User.findOne({
      where: { company_code: userCompanyCode }, // Always use authenticated user's company
      attributes: { exclude: ["password"] },
    });

    if (!company) {
      return res.status(404).json(
        errorResponse(404, "Company not found")
      );
    }

    const companyResponse = buildCompanyResponse(company);

    res.json(
      successResponse("OK", {
        company: companyResponse
      })
    );
  } catch (error) {
    console.error("❌ GET COMPANY ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Update Company Password - FIXED
const updateCompanyPassword = async (req, res) => {
  try {
    console.log("=== UPDATE COMPANY PASSWORD ===");
    console.log("Request user:", req.user);
    console.log("Request body:", req.body);

    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json(
        errorResponse(400, "Current password and new password are required")
      );
    }

    // SECURITY: Use authenticated user's company code
    const userCompanyCode = req.user.company_code;
    
    if (!userCompanyCode) {
      return res.status(401).json(
        errorResponse(401, "Unauthorized: Company code not found")
      );
    }

    // Find company (user's own company)
    const company = await User.findOne({ 
      where: { company_code: userCompanyCode } 
    });

    if (!company) {
      return res.status(404).json(
        errorResponse(404, "Company not found")
      );
    }

    // Verify current password
    const isPasswordValid = await company.correctPassword(current_password);
    if (!isPasswordValid) {
      return res.status(401).json(
        errorResponse(401, "Current password is incorrect")
      );
    }

    // Additional password validation
    if (new_password.length < 6) {
      return res.status(400).json(
        errorResponse(400, "New password must be at least 6 characters long")
      );
    }

    // Prevent setting the same password
    if (current_password === new_password) {
      return res.status(400).json(
        errorResponse(400, "New password must be different from current password")
      );
    }

    // Update password (model hook will hash it)
    await company.update({ 
      password: new_password,
      modified_at: Math.floor(Date.now() / 1000)
    });

    console.log("✅ Company password updated successfully");

    res.json(
      successResponse("Password updated successfully")
    );
  } catch (error) {
    console.error("❌ UPDATE PASSWORD ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Get Current Company (for authenticated user) - FIXED
const getCurrentCompany = async (req, res) => {
  try {
    const userCompanyCode = req.user.company_code;
    
    console.log("=== GET CURRENT COMPANY ===", userCompanyCode);

    if (!userCompanyCode) {
      return res.status(401).json(
        errorResponse(401, "Unauthorized: Company code not found")
      );
    }

    const company = await User.findOne({
      where: { company_code: userCompanyCode },
      attributes: { exclude: ["password"] },
    });

    if (!company) {
      return res.status(404).json(
        errorResponse(404, "Company not found")
      );
    }

    const companyResponse = buildCompanyResponse(company);

    res.json(
      successResponse("OK", {
        company: companyResponse,
      })
    );
  } catch (error) {
    console.error("❌ GET CURRENT COMPANY ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

module.exports = {
  updateCompany,
  getCompany,
  getCompanyByPath,
  updateCompanyPassword,
  getCurrentCompany
};