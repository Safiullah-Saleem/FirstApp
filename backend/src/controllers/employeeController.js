const { Op } = require("sequelize");
const Employee = require("../models/Employee");
const User = require("../models/User");
const { generateToken } = require("../utils/authUtils");

// Employee Register
const saveUser = async (req, res) => {
  try {
    console.log("=== 👥 EMPLOYEE REGISTER ===");
    console.log("Request body:", req.body);

    let employeeData;

    // Handle different request formats
    if (
      req.body.request &&
      req.body.request.data &&
      req.body.request.data.user
    ) {
      employeeData = req.body.request.data.user;
    } else if (req.body.user) {
      employeeData = req.body.user;
    } else {
      employeeData = req.body;
    }

    console.log("Employee data:", employeeData);

    const { username, company_code, email, password } = employeeData;

    // Check required fields
    if (!username || !company_code) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Username and company code are required",
          },
          data: null,
        },
      });
    }

    // Check if company exists
    const company = await User.findOne({ where: { company_code } });
    if (!company) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Invalid company code",
          },
          data: null,
        },
      });
    }

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({
      where: {
        username,
        company_code,
      },
    });

    if (existingEmployee) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Employee already exists in this company",
          },
          data: null,
        },
      });
    }

    // Check if email already exists
    if (email) {
      const existingEmail = await Employee.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: "Email already exists",
            },
            data: null,
          },
        });
      }
    }

    // Create employee
    const newEmployee = await Employee.create({
      username,
      company_code,
      company_name: company.company_name,
      email: email || `${username}@${company_code}.com`,
      password: password || "12345678",
    });

    console.log("Employee created successfully:", newEmployee.employee_code);

    // Response
    const employeeResponse = {
      _id: newEmployee.employee_code,
      _rev: `1-${newEmployee.id}`,
      username: newEmployee.username,
      company_code: newEmployee.company_code,
      company_name: newEmployee.company_name,
      created_at: newEmployee.created_at,
      modified_at: newEmployee.modified_at,
    };

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: employeeResponse,
      },
    });
  } catch (error) {
    console.error("EMPLOYEE REGISTER ERROR:", error);
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

    if (!_id) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Employee code or email is required",
          },
          data: null,
        },
      });
    }

    // Find employee by employee_code or email
    const employee = await Employee.findOne({
      where: {
        [Op.or]: [{ employee_code: _id }, { email: _id }],
      },
    });

    if (!employee) {
      return res.status(401).json({
        response: {
          status: {
            statusCode: 401,
            statusMessage: "Invalid employee code or email",
          },
          data: null,
        },
      });
    }

    // Check password
    const isPasswordValid = await employee.correctPassword(
      password || "12345678"
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        response: {
          status: {
            statusCode: 401,
            statusMessage: "Invalid password",
          },
          data: null,
        },
      });
    }

    // Generate token
    const token = generateToken(employee);

    console.log("Employee login successful:", employee.username);

    // Response
    const employeeResponse = {
      _id: employee.employee_code,
      _rev: `2-${employee.id}`,
      username: employee.username,
      company_code: employee.company_code,
      company_name: employee.company_name,
      created_at: employee.created_at,
      modified_at: employee.modified_at,
      access: employee.access,
      ledgerRegions: employee.ledgerRegions,
      address: employee.address,
      imgURL: employee.imgURL,
      base_url: employee.base_url,
      featuresAccess: employee.featuresAccess,
    };

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: {
          user: employeeResponse,
        },
      },
    });
  } catch (error) {
    console.error("EMPLOYEE LOGIN ERROR:", error);
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

// Get All Employees
const getAllEmployees = async (req, res) => {
  try {
    console.log("=== GET ALL EMPLOYEES ===");

    const employees = await Employee.findAll({
      attributes: { exclude: ["password"] },
    });

    console.log(`Found ${employees.length} employees`);

    const employeesResponse = employees.map((emp) => ({
      _id: emp.employee_code,
      _rev: `1-${emp.id}`,
      username: emp.username,
      company_code: emp.company_code,
      company_name: emp.company_name,
      created_at: emp.created_at,
      modified_at: emp.modified_at,
    }));

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: {
          employees: employeesResponse,
        },
      },
    });
  } catch (error) {
    console.error("GET EMPLOYEES ERROR:", error);
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

// Get Employee by ID
const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("=== 🔍 GET EMPLOYEE ===", id);

    const employee = await Employee.findOne({
      where: {
        [Op.or]: [{ employee_code: id }, { email: id }],
      },
      attributes: { exclude: ["password"] },
    });

    if (!employee) {
      return res.status(404).json({
        response: {
          status: {
            statusCode: 404,
            statusMessage: "Employee not found",
          },
          data: null,
        },
      });
    }

    const employeeResponse = {
      _id: employee.employee_code,
      _rev: `2-${employee.id}`,
      username: employee.username,
      company_code: employee.company_code,
      company_name: employee.company_name,
      created_at: employee.created_at,
      modified_at: employee.modified_at,
      access: employee.access,
      ledgerRegions: employee.ledgerRegions,
      address: employee.address,
      imgURL: employee.imgURL,
      base_url: employee.base_url,
      featuresAccess: employee.featuresAccess,
    };

    res.json({
      response: {
        status: {
          statusCode: 200,
          statusMessage: "OK",
        },
        data: {
          user: employeeResponse,
        },
      },
    });
  } catch (error) {
    console.error("GET EMPLOYEE ERROR:", error);
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
  saveUser,
  employeeLogin,
  getAllEmployees,
  getEmployee,
};
