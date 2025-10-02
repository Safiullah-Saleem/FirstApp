const User = require("../user/user.model");

// Update Company Settings
const updateCompany = async (req, res) => {
  try {
    console.log("=== UPDATE COMPANY SETTINGS ===");
    console.log("Request body:", req.body);

    let companyData;
    let companyId;

    // Handle different request formats
    if (
      req.body.request &&
      req.body.request.data &&
      req.body.request.data.company
    ) {
      companyData = req.body.request.data.company;
      companyId = req.body.request.data.company._id;
    } else if (req.body.data && req.body.data.company) {
      companyData = req.body.data.company;
      companyId = req.body.data.company._id;
    } else if (req.body.company) {
      companyData = req.body.company;
      companyId = req.body.company._id;
    } else {
      companyData = req.body;
      companyId = req.body._id;
    }

    console.log("Company ID to update:", companyId);
    console.log("Company update data:", companyData);

    if (!companyId) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Company ID is required",
          },
          data: null,
        },
      });
    }

    // Find company by company_code
    const company = await User.findOne({ where: { company_code: companyId } });

    if (!company) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Company not found",
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
    if (companyData.company_name)
      updateData.company_name = companyData.company_name;
    if (companyData.address) updateData.address = companyData.address;
    if (companyData.terms_conditions !== undefined)
      updateData.terms_conditions = companyData.terms_conditions;
    if (companyData.gst_number !== undefined)
      updateData.gst_number = companyData.gst_number;
    if (companyData.company_logo !== undefined)
      updateData.company_logo = companyData.company_logo;
    if (companyData.bill_stamp !== undefined)
      updateData.bill_stamp = companyData.bill_stamp;
    if (companyData.stock_value !== undefined)
      updateData.stock_value = companyData.stock_value;
    if (companyData.ledger_regions !== undefined)
      updateData.ledger_regions = companyData.ledger_regions;
    if (companyData.access !== undefined)
      updateData.access = companyData.access;
    if (companyData.features_access !== undefined)
      updateData.features_access = companyData.features_access;

    // Update company
    await company.update(updateData);

    console.log("Company settings updated successfully:", companyId);

    // Prepare response
    const companyResponse = {
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
    };

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Company settings updated successfully",
        },
        data: {
          company: companyResponse,
        },
      },
    });
  } catch (error) {
    console.error("UPDATE COMPANY ERROR:", error);
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

// Get Company Settings (GET endpoint with path parameter)
const getCompanyByPath = async (req, res) => {
  try {
    const { companyCode } = req.params;
    console.log("=== GET COMPANY SETTINGS ===", companyCode);

    const company = await User.findOne({
      where: { company_code: companyCode },
      attributes: { exclude: ["password"] },
    });

    if (!company) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Company not found",
          },
          data: null,
        },
      });
    }

    // Prepare response
    const companyResponse = {
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
    };

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: {
          company: companyResponse,
        },
      },
    });
  } catch (error) {
    console.error("GET COMPANY ERROR:", error);
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

// Get Company (POST endpoint with wrapped payload)
const getCompany = async (req, res) => {
  try {
    console.log("=== GET COMPANY ===");
    console.log("Request body:", req.body);

    let companyCode;

    // Extract company_code from the specific request format
    if (req.body.request && req.body.request.data && req.body.request.data._id) {
      companyCode = req.body.request.data._id;
    } else {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Invalid request format. Expected: { request: { method: 'getCompany', data: { _id: 'company_code' } } }",
          },
          data: null,
        },
      });
    }

    console.log("Looking for company with code:", companyCode);

    // Check if company exists in the User model
    const company = await User.findOne({
      where: { company_code: companyCode },
      attributes: { exclude: ["password"] },
    });

    if (!company) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Company not found",
          },
          data: null,
        },
      });
    }

    // Prepare response in the exact format specified
    const companyResponse = {
      _id: company.company_code,
      _rev: `7-cef6fa127a9bcfb26d0a4f528ec683c5`,
      access: company.access || [],
      company_name: company.company_name,
      address: company.address,
      created_at: company.created_at,
      modified_at: company.modified_at,
      featuresAccess: company.features_access || [],
      ledgerRegions: company.ledger_regions || ["title"],
      stockValue: company.stock_value || "no",
      billStamp: company.bill_stamp || {
        name: "cjm logo.png",
        url: "https://managekaro-documents.s3.us-west-2.amazonaws.com/4530/1cjm%20logo.png"
      }
    };

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK"
        },
        data: {
          company: [companyResponse]
        }
      }
    });
  } catch (error) {
    console.error("GET COMPANY ERROR:", error);
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

// Update Company Password
const updateCompanyPassword = async (req, res) => {
  try {
    console.log("=== UPDATE COMPANY PASSWORD ===");
    console.log("Request body:", req.body);

    const { company_code, current_password, new_password } = req.body;

    if (!company_code || !current_password || !new_password) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage:
              "Company code, current password and new password are required",
          },
          data: null,
        },
      });
    }

    // Find company
    const company = await User.findOne({ where: { company_code } });

    if (!company) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Company not found",
          },
          data: null,
        },
      });
    }

    // Verify current password
    const isPasswordValid = await company.correctPassword(current_password);
    if (!isPasswordValid) {
      return res.status(401).json({
        response: {
          status: {
            statusCode: 401,
            statusMessage: "Current password is incorrect",
          },
          data: null,
        },
      });
    }

    // Update password
    company.password = new_password;
    await company.save();

    console.log("Company password updated successfully");

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "Password updated successfully",
        },
        data: null,
      },
    });
  } catch (error) {
    console.error("UPDATE PASSWORD ERROR:", error);
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

module.exports = {
  updateCompany,
  getCompany,
  getCompanyByPath,
  updateCompanyPassword,
};
