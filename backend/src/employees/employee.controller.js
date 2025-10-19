const { Op } = require("sequelize");
const Employee = require("./employee.model");
const User = require("../user/user.model");
const { generateToken } = require("../utils/authUtils");

// Utility Functions
const buildEmployeeResponse = (employee) => ({
  _id: employee.employee_code,
  _rev: `1-${employee.id}`,
  username: employee.username,
  email: employee.email,
  phone: employee.phone,
  department: employee.department,
  position: employee.position,
  role: employee.role,
  status: employee.status,
  join_date: employee.join_date,
  company_code: employee.company_code,
  company_name: employee.company_name,
  access: employee.access,
  ledgerRegions: employee.ledgerRegions,
  address: employee.address,
  imgURL: employee.imgURL,
  base_url: employee.base_url,
  featuresAccess: employee.featuresAccess,
  created_at: employee.created_at,
  modified_at: employee.modified_at
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

// Create Employee (for company admin)
const createEmployee = async (req, res) => {
  try {
    console.log("=== CREATE EMPLOYEE ===");
    console.log("Request body:", req.body);

    const companyCode = req.user.company_code; // From authenticated admin
    let employeeData;

    // Handle different request formats
    if (req.body.request?.data?.employee) {
      employeeData = req.body.request.data.employee;
    } else if (req.body.employee) {
      employeeData = req.body.employee;
    } else if (req.body.user) {
      employeeData = req.body.user;
    } else {
      employeeData = req.body;
    }

    console.log("Employee data:", employeeData);

    // Validate required fields
    if (!employeeData.username || !employeeData.email) {
      return res.status(400).json(
        errorResponse(400, "Username and email are required")
      );
    }

    // Check if employee email already exists
    const existingEmployee = await Employee.findOne({
      where: { 
        email: employeeData.email
      }
    });

    if (existingEmployee) {
      return res.status(400).json(
        errorResponse(400, "Employee with this email already exists")
      );
    }

    // Check if username exists in company
    const existingUsername = await Employee.findOne({
      where: { 
        username: employeeData.username,
        company_code: companyCode 
      }
    });

    if (existingUsername) {
      return res.status(400).json(
        errorResponse(400, "Username already exists in your company")
      );
    }

    // Get company info
    const company = await User.findOne({ 
      where: { company_code: companyCode },
      attributes: ['company_name']
    });

    if (!company) {
      return res.status(400).json(
        errorResponse(400, "Company not found")
      );
    }

    // Create employee with ALL fields from the model
    const newEmployee = await Employee.create({
      username: employeeData.username,
      email: employeeData.email,
      password: employeeData.password, // Let model handle hashing and defaults
      company_code: companyCode,
      company_name: company.company_name,
      phone: employeeData.phone,
      department: employeeData.department,
      position: employeeData.position,
      role: employeeData.role || 'staff',
      status: employeeData.status || 'active',
      access: employeeData.access || ["Dashboard"],
      ledgerRegions: employeeData.ledgerRegions || [],
      address: employeeData.address || "",
      imgURL: employeeData.imgURL || "",
      base_url: employeeData.base_url || "",
      featuresAccess: employeeData.featuresAccess || [
        {
          index: 0,
          selected: true,
          price: 1000,
          description: "",
          title: "Dashboard",
          infoBtn: false,
          card: "",
          selectCard: "/static/media/dashboardG.632e3da4.svg",
          paid: false,
          url: "dashboard",
          cardWhite: "/static/media/dashboardWhite.fe5f6a4a.svg",
        },
      ],
      join_date: employeeData.join_date || Math.floor(Date.now() / 1000)
    });

    console.log("✅ EMPLOYEE CREATED SUCCESSFULLY:", newEmployee.employee_code);

    const employeeResponse = buildEmployeeResponse(newEmployee);

    res.json(
      successResponse("Employee created successfully", {
        employee: employeeResponse
      })
    );

  } catch (error) {
    console.error("❌ CREATE EMPLOYEE ERROR:", error);
    res.status(500).json(
      errorResponse(500, error.message || "Internal server error")
    );
  }
};

// Get All Employees for a Company (SECURITY FIXED)
const getCompanyEmployees = async (req, res) => {
  try {
    const companyCode = req.user.company_code;
    
    console.log("🔍 Fetching employees for company:", companyCode);

    const employees = await Employee.findAll({
      where: { 
        company_code: companyCode // ✅ SECURITY: Only show company employees
      },
      attributes: { exclude: ["password"] },
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ Found ${employees.length} employees for company ${companyCode}`);

    const employeeResponses = employees.map(employee => buildEmployeeResponse(employee));

    res.json(
      successResponse("OK", {
        employees: employeeResponses,
        total: employees.length,
      })
    );
  } catch (error) {
    console.error("❌ GET EMPLOYEES ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Get Specific Employee
const getEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const companyCode = req.user.company_code;

    console.log("🔍 Fetching employee:", employeeId, "for company:", companyCode);

    const employee = await Employee.findOne({
      where: { 
        [Op.or]: [
          { employee_code: employeeId }, 
          { email: employeeId },
          { username: employeeId }
        ],
        company_code: companyCode // ✅ SECURITY: Only access company employees
      },
      attributes: { exclude: ["password"] }
    });

    if (!employee) {
      return res.status(404).json(
        errorResponse(404, "Employee not found")
      );
    }

    const employeeResponse = buildEmployeeResponse(employee);

    res.json(
      successResponse("OK", {
        employee: employeeResponse
      })
    );
  } catch (error) {
    console.error("❌ GET EMPLOYEE ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Update Employee
const updateEmployee = async (req, res) => {
  try {
    console.log("=== UPDATE EMPLOYEE REQUEST ===");
    
    const companyCode = req.user.company_code;
    const { employeeId } = req.params;
    let employeeData;

    // Handle different request formats
    if (req.body.request?.data?.employee) {
      employeeData = req.body.request.data.employee;
    } else if (req.body.employee) {
      employeeData = req.body.employee;
    } else if (req.body.user) {
      employeeData = req.body.user;
    } else {
      employeeData = req.body;
    }

    console.log("Updating employee:", employeeId, "Data:", employeeData);

    // Find employee in company
    const employee = await Employee.findOne({
      where: { 
        [Op.or]: [
          { employee_code: employeeId }, 
          { email: employeeId },
          { username: employeeId }
        ],
        company_code: companyCode 
      }
    });

    if (!employee) {
      return res.status(404).json(
        errorResponse(404, "Employee not found")
      );
    }

    // Prepare update data
    const updateData = {
      modified_at: Math.floor(Date.now() / 1000)
    };

    // Update allowed fields (including new fields from model)
    const allowedFields = [
      'username', 'email', 'phone', 'department', 'position', 
      'role', 'status', 'access', 'ledgerRegions', 'address', 
      'imgURL', 'base_url', 'featuresAccess', 'join_date'
    ];
    
    allowedFields.forEach(field => {
      if (employeeData[field] !== undefined) {
        updateData[field] = employeeData[field];
      }
    });

    // Update password if provided (model hook will hash it)
    if (employeeData.password) {
      updateData.password = employeeData.password;
    }

    // Check if email is being changed and if it's already taken
    if (employeeData.email && employeeData.email !== employee.email) {
      const existingEmail = await Employee.findOne({
        where: { 
          email: employeeData.email,
          id: { [Op.ne]: employee.id } // Exclude current employee
        }
      });

      if (existingEmail) {
        return res.status(400).json(
          errorResponse(400, "Email already exists")
        );
      }
    }

    // Check if username is being changed and if it's already taken in company
    if (employeeData.username && employeeData.username !== employee.username) {
      const existingUsername = await Employee.findOne({
        where: { 
          username: employeeData.username,
          company_code: companyCode,
          id: { [Op.ne]: employee.id } // Exclude current employee
        }
      });

      if (existingUsername) {
        return res.status(400).json(
          errorResponse(400, "Username already exists in your company")
        );
      }
    }

    // Update employee
    await employee.update(updateData);

    console.log("✅ EMPLOYEE UPDATED SUCCESSFULLY:", employeeId);

    const employeeResponse = buildEmployeeResponse(employee);

    res.json(
      successResponse("Employee updated successfully", {
        employee: employeeResponse
      })
    );

  } catch (error) {
    console.error("❌ UPDATE EMPLOYEE ERROR:", error);
    res.status(500).json(
      errorResponse(500, error.message || "Internal server error")
    );
  }
};

// Delete Employee (Soft Delete - update status to inactive)
const deleteEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const companyCode = req.user.company_code;

    console.log("🗑️ Deleting employee:", employeeId, "from company:", companyCode);

    const employee = await Employee.findOne({
      where: { 
        [Op.or]: [
          { employee_code: employeeId }, 
          { email: employeeId },
          { username: employeeId }
        ],
        company_code: companyCode 
      }
    });

    if (!employee) {
      return res.status(404).json(
        errorResponse(404, "Employee not found")
      );
    }

    // Soft delete by updating status to inactive
    await employee.update({
      status: 'inactive',
      modified_at: Math.floor(Date.now() / 1000)
    });

    console.log("✅ EMPLOYEE DELETED SUCCESSFULLY:", employeeId);

    res.json(
      successResponse("Employee deleted successfully")
    );

  } catch (error) {
    console.error("❌ DELETE EMPLOYEE ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Employee Login
const employeeLogin = async (req, res) => {
  try {
    console.log("=== EMPLOYEE LOGIN ===");
    console.log("Request body:", req.body);

    let loginData;

    // Handle different request formats
    if (req.body.request && req.body.request.data) {
      loginData = req.body.request.data;
    } else {
      loginData = req.body;
    }

    console.log("Login data:", loginData);

    const { _id, password } = loginData;

    if (!_id || !password) {
      return res.status(400).json(
        errorResponse(400, "Employee code/email and password are required")
      );
    }

    // Find employee by employee_code, email, or username
    const employee = await Employee.findOne({
      where: {
        [Op.or]: [
          { employee_code: _id }, 
          { email: _id },
          { username: _id }
        ],
        status: 'active' // Only allow active employees to login
      },
    });

    if (!employee) {
      return res.status(401).json(
        errorResponse(401, "Invalid employee code, email, or username")
      );
    }

    // Check password
    const isPasswordValid = await employee.correctPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json(
        errorResponse(401, "Invalid password")
      );
    }

    // Generate token
    const token = generateToken(employee);

    console.log("Employee login successful:", employee.username);

    const employeeResponse = buildEmployeeResponse(employee);

    res.json(
      successResponse("OK", {
        user: employeeResponse,
        token: token,
      })
    );
  } catch (error) {
    console.error("❌ EMPLOYEE LOGIN ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Get Employee Profile (for logged-in employee)
const getEmployeeProfile = async (req, res) => {
  try {
    const employeeId = req.user.id; // From auth token
    const companyCode = req.user.company_code;

    console.log("🔍 Fetching employee profile for:", employeeId);

    const employee = await Employee.findOne({
      where: { 
        id: employeeId,
        company_code: companyCode,
        status: 'active'
      },
      attributes: { exclude: ["password"] }
    });

    if (!employee) {
      return res.status(404).json(
        errorResponse(404, "Employee profile not found")
      );
    }

    const employeeResponse = buildEmployeeResponse(employee);

    res.json(
      successResponse("OK", {
        employee: employeeResponse
      })
    );
  } catch (error) {
    console.error("❌ GET EMPLOYEE PROFILE ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

module.exports = {
  createEmployee,
  getCompanyEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  employeeLogin,
  getEmployeeProfile
};