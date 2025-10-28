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
  ledgerRegions: employee.ledgerregions,
  address: employee.address,
  imgURL: employee.imgurl,
  base_url: employee.base_url,
  featuresAccess: employee.featuresaccess,
  
  // ==================== SALARY FIELDS ====================
  salary: {
    basic: employee.salary_basic,
    hra: employee.salary_hra,
    allowances: employee.salary_allowances,
    pf: employee.salary_pf,
    esi: employee.salary_esi,
    tax: employee.salary_tax,
    net: employee.salary_net,
    currency: employee.salary_currency,
    payment_type: employee.salary_payment_type,
    bank_account: employee.salary_bank_account,
    bank_name: employee.salary_bank_name,
    bank_ifsc: employee.salary_bank_ifsc,
    effective_date: employee.salary_effective_date,
    notes: employee.salary_notes
  },
  // ==================== END SALARY FIELDS ====================

  created_at: employee.created_at,
  modified_at: employee.modified_at,
  message: "Employee created successfully",
  success: true,
  timestamp: Math.floor(Date.now() / 1000),
  error: null,
  data: "Employee data retrieved successfully"
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

// Get current timestamp as BIGINT
const getCurrentTimestamp = () => Math.floor(Date.now() / 1000);

// Create Employee (for company admin)
const createEmployee = async (req, res) => {
  try {
    console.log("=== CREATE EMPLOYEE ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // ✅ ADD DEBUG LOGGING FOR USER INFO
    console.log("🔍 AUTHENTICATED USER DETAILS:", {
      user_id: req.user.id,
      company_code_from_token: req.user.company_code,
      user_type: req.user.type,
      email: req.user.email
    });

    const companyCode = req.user.company_code;
    
    // ✅ ADD THIS DEBUG CHECK
    console.log("🏢 USING COMPANY CODE:", companyCode);
    
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

    console.log("Extracted employee data:", employeeData);

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

    // Get company info - WITH DEBUGGING
    console.log("🔍 Looking up company with code:", companyCode);
    const company = await User.findOne({ 
      where: { company_code: companyCode },
      attributes: ['id', 'company_name', 'company_code']
    });

    if (!company) {
      console.log("❌ COMPANY NOT FOUND with code:", companyCode);
      return res.status(400).json(
        errorResponse(400, `Company not found with code: ${companyCode}`)
      );
    }

    console.log("✅ COMPANY FOUND:", {
      company_name: company.company_name,
      company_code: company.company_code
    });

    // Prepare employee data with proper field mapping
    const employeeCreateData = {
      username: employeeData.username,
      email: employeeData.email,
      password: employeeData.password || 'tempPassword123',
      company_code: companyCode, // This should be 5861
      company_name: company.company_name,
      phone: employeeData.phone || '',
      department: employeeData.department || '',
      position: employeeData.position || '',
      address: employeeData.address || '',
      role: employeeData.role || 'staff',
      status: employeeData.status || 'active'
    };

    // Handle join_date - convert to timestamp if provided as Date
    if (employeeData.join_date) {
      if (employeeData.join_date instanceof Date) {
        employeeCreateData.join_date = Math.floor(employeeData.join_date.getTime() / 1000);
      } else if (typeof employeeData.join_date === 'string') {
        employeeCreateData.join_date = Math.floor(new Date(employeeData.join_date).getTime() / 1000);
      } else {
        employeeCreateData.join_date = employeeData.join_date;
      }
    }

    // ==================== SALARY DATA HANDLING ====================
    const salaryFields = [
      'salary_basic', 'salary_hra', 'salary_allowances', 'salary_pf', 
      'salary_esi', 'salary_tax', 'salary_currency', 'salary_payment_type',
      'salary_bank_account', 'salary_bank_name', 'salary_bank_ifsc', 
      'salary_effective_date', 'salary_notes'
    ];
    
    salaryFields.forEach(field => {
      if (employeeData[field] !== undefined) {
        // Handle salary_effective_date conversion
        if (field === 'salary_effective_date' && employeeData[field]) {
          if (employeeData[field] instanceof Date) {
            employeeCreateData[field] = Math.floor(employeeData[field].getTime() / 1000);
          } else if (typeof employeeData[field] === 'string') {
            employeeCreateData[field] = Math.floor(new Date(employeeData[field]).getTime() / 1000);
          } else {
            employeeCreateData[field] = employeeData[field];
          }
        } else {
          employeeCreateData[field] = employeeData[field];
        }
      }
    });

    // Add optional fields
    const optionalFields = [
      'access', 'ledgerregions', 'imgurl', 'base_url', 'featuresaccess'
    ];
    
    optionalFields.forEach(field => {
      if (employeeData[field] !== undefined) {
        employeeCreateData[field] = employeeData[field];
      }
    });

    console.log("🎯 FINAL EMPLOYEE DATA FOR CREATION:", {
      ...employeeCreateData,
      password: '***HIDDEN***' // Hide password in logs
    });

    // Create employee
    const newEmployee = await Employee.create(employeeCreateData);

    console.log("✅ EMPLOYEE CREATED SUCCESSFULLY:", {
      employee_code: newEmployee.employee_code,
      company_code: newEmployee.company_code,
      username: newEmployee.username
    });

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

// Get All Employees for a Company
const getCompanyEmployees = async (req, res) => {
  try {
    const companyCode = req.user.company_code;
    
    console.log("🔍 Fetching employees for company:", companyCode);

    const employees = await Employee.findAll({
      where: { 
        company_code: companyCode
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
        company_code: companyCode
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
    const updateData = {};

    // Update allowed fields
    const allowedFields = [
      'username', 'email', 'phone', 'department', 'position', 
      'role', 'status', 'access', 'ledgerregions', 'address', 
      'imgurl', 'base_url', 'featuresaccess', 'join_date'
    ];
    
    allowedFields.forEach(field => {
      if (employeeData[field] !== undefined) {
        // Handle join_date conversion to timestamp
        if (field === 'join_date' && employeeData[field]) {
          if (employeeData[field] instanceof Date) {
            updateData[field] = Math.floor(employeeData[field].getTime() / 1000);
          } else if (typeof employeeData[field] === 'string') {
            updateData[field] = Math.floor(new Date(employeeData[field]).getTime() / 1000);
          } else {
            updateData[field] = employeeData[field];
          }
        } else {
          updateData[field] = employeeData[field];
        }
      }
    });

    // ==================== SALARY UPDATE FIELDS ====================
    const salaryFields = [
      'salary_basic', 'salary_hra', 'salary_allowances', 'salary_pf', 
      'salary_esi', 'salary_tax', 'salary_currency', 'salary_payment_type',
      'salary_bank_account', 'salary_bank_name', 'salary_bank_ifsc', 
      'salary_effective_date', 'salary_notes'
    ];
    
    salaryFields.forEach(field => {
      if (employeeData[field] !== undefined) {
        // Handle salary_effective_date conversion
        if (field === 'salary_effective_date' && employeeData[field]) {
          if (employeeData[field] instanceof Date) {
            updateData[field] = Math.floor(employeeData[field].getTime() / 1000);
          } else if (typeof employeeData[field] === 'string') {
            updateData[field] = Math.floor(new Date(employeeData[field]).getTime() / 1000);
          } else {
            updateData[field] = employeeData[field];
          }
        } else {
          updateData[field] = employeeData[field];
        }
      }
    });

    // Update password if provided
    if (employeeData.password) {
      updateData.password = employeeData.password;
    }

    // Check if email is being changed and if it's already taken
    if (employeeData.email && employeeData.email !== employee.email) {
      const existingEmail = await Employee.findOne({
        where: { 
          email: employeeData.email,
          id: { [Op.ne]: employee.id }
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
          id: { [Op.ne]: employee.id }
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

// Delete Employee (Soft Delete)
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
      status: 'inactive'
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

// Employee Login - FIXED VERSION
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
        status: 'active'
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

    // ✅ FIX: Generate token with 'employee' type
    const token = generateToken(employee, 'employee'); // Add 'employee' type here

    console.log("✅ Employee login successful:", employee.username);
    console.log("🔐 Token generated with type: employee");

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

// Get Employee Profile
const getEmployeeProfile = async (req, res) => {
  try {
    const employeeId = req.user.id;
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

// ==================== SALARY-SPECIFIC CONTROLLERS ====================

// Update Employee Salary
const updateEmployeeSalary = async (req, res) => {
  try {
    console.log("=== UPDATE EMPLOYEE SALARY ===");
    
    const companyCode = req.user.company_code;
    const { employeeId } = req.params;
    let salaryData;

    // Handle different request formats
    if (req.body.request?.data?.salary) {
      salaryData = req.body.request.data.salary;
    } else if (req.body.salary) {
      salaryData = req.body.salary;
    } else {
      salaryData = req.body;
    }

    console.log("Updating salary for employee:", employeeId, "Data:", salaryData);

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

    // Update employee salary using the model method
    await employee.updateSalary(salaryData);

    console.log("✅ EMPLOYEE SALARY UPDATED SUCCESSFULLY:", employeeId);

    // Reload to get updated data
    await employee.reload();

    const employeeResponse = buildEmployeeResponse(employee);
    const salaryBreakdown = employee.calculateSalaryBreakdown();

    const response = {
      employee: employeeResponse,
      salary_breakdown: salaryBreakdown
    };

    res.json(
      successResponse("Employee salary updated successfully", response)
    );

  } catch (error) {
    console.error("❌ UPDATE EMPLOYEE SALARY ERROR:", error);
    res.status(500).json(
      errorResponse(500, error.message || "Internal server error")
    );
  }
};

// Get Employee Salary Details
// Get Employee Salary Details - SECURED VERSION
const getEmployeeSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const companyCode = req.user.company_code;
    const userType = req.user.type;

    console.log("💰 Fetching salary for employee:", employeeId, "Company:", companyCode, "User type:", userType);

    // If employee is trying to view someone else's salary, restrict access
    if (userType === 'employee') {
      const requestedEmployeeId = employeeId;
      const loggedInEmployeeId = req.user.employee_code || req.user.id.toString();
      
      // Employees can only view their own salary
      if (requestedEmployeeId !== loggedInEmployeeId && 
          requestedEmployeeId !== req.user.username &&
          requestedEmployeeId !== req.user.email) {
        console.log("❌ Employee trying to access other employee's salary");
        return res.status(403).json(
          errorResponse(403, "Access denied. You can only view your own salary information.")
        );
      }
    }

    const employee = await Employee.findOne({
      where: { 
        [Op.or]: [
          { employee_code: employeeId },
          { id: employeeId },
          { email: employeeId },
          { username: employeeId }
        ],
        company_code: companyCode
      },
      attributes: { exclude: ["password"] }
    });

    if (!employee) {
      return res.status(404).json(
        errorResponse(404, "Employee not found")
      );
    }

    const salaryDetails = employee.getSalaryDetails();
    const salaryBreakdown = employee.calculateSalaryBreakdown();

    const response = {
      employee: {
        employee_code: employee.employee_code,
        username: employee.username,
        email: employee.email,
        department: employee.department,
        position: employee.position
      },
      salary_details: salaryDetails,
      salary_breakdown: salaryBreakdown,
      access_level: userType === 'employee' ? 'personal' : 'company'
    };

    res.json(
      successResponse("OK", response)
    );
  } catch (error) {
    console.error("❌ GET EMPLOYEE SALARY ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Get Salary Report for Company
// Get Salary Report for Company - FIXED VERSION
const getCompanySalaryReport = async (req, res) => {
  try {
    const companyCode = req.user.company_code;
    const userType = req.user.type;

    console.log("📊 Generating salary report for company:", companyCode, "User type:", userType);

    let employees;

    if (userType === 'employee') {
      // Employee can only see their own data
      console.log("👤 Employee view - showing only own data");
      employees = await Employee.findAll({
        where: { 
          company_code: companyCode,
          id: req.user.id, // Only show the logged-in employee
          status: 'active'
        },
        attributes: { exclude: ["password"] }
      });
    } else {
      // Admin can see all employees in their company
      console.log("👨‍💼 Admin view - showing all company employees");
      employees = await Employee.findAll({
        where: { 
          company_code: companyCode,
          status: 'active'
        },
        attributes: { exclude: ["password"] }
      });
    }

    console.log(`📊 Found ${employees.length} employees for report`);

    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;

    const salaryReport = employees.map(employee => {
      const breakdown = employee.calculateSalaryBreakdown();
      
      totalGross += breakdown.gross_salary;
      totalNet += breakdown.net_salary;
      totalDeductions += breakdown.total_deductions;

      return {
        employee_code: employee.employee_code,
        username: employee.username,
        department: employee.department,
        position: employee.position,
        salary: employee.getSalaryDetails(),
        breakdown: breakdown
      };
    });

    const reportSummary = {
      total_employees: employees.length,
      total_gross_salary: totalGross,
      total_net_salary: totalNet,
      total_deductions: totalDeductions,
      average_salary: employees.length > 0 ? totalNet / employees.length : 0,
      company_code: companyCode,
      report_type: userType === 'employee' ? 'personal' : 'company_wide'
    };

    const response = {
      report_summary: reportSummary,
      employees: salaryReport
    };

    res.json(
      successResponse("Salary report generated successfully", response)
    );
  } catch (error) {
    console.error("❌ GET SALARY REPORT ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Employee Self-Service: Update Own Profile
const updateEmployeeProfile = async (req, res) => {
  try {
    console.log("=== UPDATE EMPLOYEE PROFILE ===");
    
    const employeeId = req.user.id;
    const companyCode = req.user.company_code;
    let profileData;

    // Handle different request formats
    if (req.body.request?.data?.employee) {
      profileData = req.body.request.data.employee;
    } else if (req.body.employee) {
      profileData = req.body.employee;
    } else if (req.body.user) {
      profileData = req.body.user;
    } else {
      profileData = req.body;
    }

    console.log("Updating profile for employee:", employeeId, "Data:", profileData);

    // Find employee
    const employee = await Employee.findOne({
      where: { 
        id: employeeId,
        company_code: companyCode 
      }
    });

    if (!employee) {
      return res.status(404).json(
        errorResponse(404, "Employee not found")
      );
    }

    // Prepare update data - only allow certain fields for self-update
    const updateData = {};
    const allowedFields = [
      'phone', 'address', 'imgurl'
    ];
    
    allowedFields.forEach(field => {
      if (profileData[field] !== undefined) {
        updateData[field] = profileData[field];
      }
    });

    // Update password if provided
    if (profileData.password) {
      updateData.password = profileData.password;
    }

    // Update employee
    await employee.update(updateData);

    console.log("✅ EMPLOYEE PROFILE UPDATED SUCCESSFULLY:", employeeId);

    const employeeResponse = buildEmployeeResponse(employee);

    res.json(
      successResponse("Profile updated successfully", {
        employee: employeeResponse
      })
    );

  } catch (error) {
    console.error("❌ UPDATE EMPLOYEE PROFILE ERROR:", error);
    res.status(500).json(
      errorResponse(500, error.message || "Internal server error")
    );
  }
};

// Search Employees
const searchEmployees = async (req, res) => {
  try {
    const companyCode = req.user.company_code;
    const { query, department, position, status } = req.query;

    console.log("🔍 Searching employees:", { query, department, position, status });

    const whereClause = { company_code: companyCode };

    // Build search conditions
    if (query) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { employee_code: { [Op.like]: `%${query}%` } },
        { department: { [Op.like]: `%${query}%` } },
        { position: { [Op.like]: `%${query}%` } }
      ];
    }

    if (department) {
      whereClause.department = department;
    }

    if (position) {
      whereClause.position = position;
    }

    if (status) {
      whereClause.status = status;
    }

    const employees = await Employee.findAll({
      where: whereClause,
      attributes: { exclude: ["password"] },
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ Found ${employees.length} employees matching search criteria`);

    const employeeResponses = employees.map(employee => buildEmployeeResponse(employee));

    res.json(
      successResponse("OK", {
        employees: employeeResponses,
        total: employees.length,
      })
    );
  } catch (error) {
    console.error("❌ SEARCH EMPLOYEES ERROR:", error);
    res.status(500).json(
      errorResponse(500, "Internal server error")
    );
  }
};

// Bulk Update Employee Status
const bulkUpdateEmployeeStatus = async (req, res) => {
  try {
    const companyCode = req.user.company_code;
    const { employeeIds, status } = req.body;

    console.log("🔄 Bulk updating employee status:", { employeeIds, status });

    if (!employeeIds || !employeeIds.length || !status) {
      return res.status(400).json(
        errorResponse(400, "Employee IDs and status are required")
      );
    }

    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(
        errorResponse(400, "Invalid status. Must be: active, inactive, or suspended")
      );
    }

    const result = await Employee.update(
      { status: status },
      {
        where: {
          id: { [Op.in]: employeeIds },
          company_code: companyCode
        }
      }
    );

    console.log(`✅ Updated ${result[0]} employees to status: ${status}`);

    res.json(
      successResponse(`Successfully updated ${result[0]} employees`)
    );
  } catch (error) {
    console.error("❌ BULK UPDATE EMPLOYEE STATUS ERROR:", error);
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
  getEmployeeProfile,
  updateEmployeeSalary,
  getEmployeeSalary,
  getCompanySalaryReport,
  updateEmployeeProfile,
  searchEmployees,
  bulkUpdateEmployeeStatus
};