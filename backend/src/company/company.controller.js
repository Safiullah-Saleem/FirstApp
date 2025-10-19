const User = require("../user/user.model");
const { authenticate } = require("../middleware/auth");

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

// Extract company data from request
const extractCompanyData = (req) => {
  let companyData, companyId;

  if (req.body.request?.data?.company) {
    companyData = req.body.request.data.company;
    companyId = req.body.request.data.company._id;
  } else if (req.body.data?.company) {
    companyData = req.body.data.company;
    companyId = req.body.data.company._id;
  } else if (req.body.company) {
    companyData = req.body.company;
    companyId = req.body.company._id;
  } else {
    companyData = req.body;
    companyId = req.body._id;
  }

  return { companyData, companyId };
};

// Update Company Settings
const updateCompany = async (req, res) => {
  try {
    console.log("=== UPDATE COMPANY SETTINGS ===");
    console.log("Request body:", req.body);

    const { companyData, companyId } = extractCompanyData(req);

    console.log("Company ID to update:", companyId);
    console.log("Company update data:", companyData);

    if (!companyId) {
      return res.status(400).json(
        errorResponse(400, "Company ID is required")
      );
    }

    // SECURITY: Ensure user can only update their own company
    const userCompanyCode = req.user.company_code;
    if (companyId !== userCompanyCode) {
      return res.status(403).json(
        errorResponse(403, "Access denied. You can only update your own company settings.")
      );
    }

    // Find company by company_code (user's own company)
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
      'access', 'features_access'
    ];

    allowedFields.forEach(field => {
      if (companyData[field] !== undefined) {
        updateData[field] = companyData[field];
      }
    });

    // Update company
    await company.update(updateData);

    console.log("Company settings updated successfully:", userCompanyCode);

    const companyResponse = buildCompanyResponse(company);

    res.json(
      successResponse("Company settings updated successfully", {
        company: companyResponse,
      })
    );
  } catch (error) {
    console.error("UPDATE COMPANY ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Get Company Settings (GET endpoint with path parameter)
const getCompanyByPath = async (req, res) => {
  try {
    const { companyCode } = req.params;
    console.log("=== GET COMPANY SETTINGS ===", companyCode);

    // SECURITY: Ensure user can only access their own company
    const userCompanyCode = req.user.company_code;
    if (companyCode !== userCompanyCode) {
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
    console.error("GET COMPANY ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Get Company (POST endpoint with wrapped payload)
const getCompany = async (req, res) => {
  try {
    console.log("=== GET COMPANY ===");
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
      return res.status(400).json(
        errorResponse(400, "Invalid request format. Company ID (_id) is required.")
      );
    }

    console.log("Looking for company with code:", companyCode);

    // SECURITY: Ensure user can only access their own company
    const userCompanyCode = req.user.company_code;
    if (companyCode !== userCompanyCode) {
      return res.status(403).json(
        errorResponse(403, "Access denied. You can only access your own company.")
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

    // FIXED: Use dynamic _rev and remove array wrapper
    const companyResponse = {
      _id: company.company_code,
      _rev: `7-${company.id}`, // ✅ Dynamic, not hard-coded
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
      ceo_phone: company.phone
    };

    res.json(
      successResponse("OK", {
        company: companyResponse // ✅ Not wrapped in array
      })
    );
  } catch (error) {
    console.error("GET COMPANY ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Update Company Password
const updateCompanyPassword = async (req, res) => {
  try {
    console.log("=== UPDATE COMPANY PASSWORD ===");
    console.log("Request body:", req.body);

    const { company_code, current_password, new_password } = req.body;

    if (!company_code || !current_password || !new_password) {
      return res.status(400).json(
        errorResponse(400, "Company code, current password and new password are required")
      );
    }

    // SECURITY: Ensure user can only update their own company password
    const userCompanyCode = req.user.company_code;
    if (company_code !== userCompanyCode) {
      return res.status(403).json(
        errorResponse(403, "Access denied. You can only update your own company password.")
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

    console.log("Company password updated successfully");

    res.json(
      successResponse("Password updated successfully")
    );
  } catch (error) {
    console.error("UPDATE PASSWORD ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Get Current Company (for authenticated user)
const getCurrentCompany = async (req, res) => {
  try {
    const userCompanyCode = req.user.company_code;
    
    console.log("=== GET CURRENT COMPANY ===", userCompanyCode);

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
    console.error("GET CURRENT COMPANY ERROR:", error);
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