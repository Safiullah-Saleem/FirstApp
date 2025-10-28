const express = require("express");
const { authenticate, allowEmployeesAndAdmins } = require("../middleware/auth");
const {
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
} = require("./employee.controller");

const router = express.Router();

// ✅ ADD ROUTE DEBUGGING MIDDLEWARE
router.use((req, res, next) => {
  console.log('🛣️ Employee Route Hit:', {
    method: req.method,
    url: req.url,
    path: req.path,
    params: req.params,
    query: req.query,
    hasBody: !!req.body
  });
  next();
});

// ==================== PUBLIC ROUTES ====================
router.post("/login", employeeLogin);

// ==================== DEBUG ROUTES (NO AUTH NEEDED) ====================
router.get("/debug/simple-test", (req, res) => {
  console.log("✅ Simple test route hit successfully");
  res.json({
    message: "Simple test route working!",
    timestamp: new Date().toISOString(),
    routes_working: true
  });
});

router.get("/debug/token-check", (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.json({ 
      error: "No token provided",
      help: "Add Authorization: Bearer <token> header"
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    res.json({
      token_valid: true,
      decoded: decoded,
      token_type: decoded.type,
      user_id: decoded.id,
      company_code: decoded.company_code,
      message: `Token is valid for ${decoded.type}`
    });
  } catch (error) {
    res.json({
      token_valid: false,
      error: error.message,
      help: "Token might be expired or invalid"
    });
  }
});

router.get("/debug/db-check", async (req, res) => {
  try {
    const { testConnection } = require('../config/database');
    const dbStatus = await testConnection();
    
    res.json({
      database: "PostgreSQL",
      connected: dbStatus.connected,
      message: dbStatus.message,
      health: "healthy"
    });
  } catch (error) {
    res.json({
      database: "PostgreSQL", 
      connected: false,
      error: error.message,
      health: "unhealthy"
    });
  }
});

// ==================== PROTECTED ROUTES ====================
// ✅ Apply authentication to ALL routes below this line
router.use(authenticate);

// ✅ EMPLOYEE SELF-SERVICE ROUTES (employees can update their own profile)
router.put("/profile/me", allowEmployeesAndAdmins, updateEmployeeProfile);
router.get("/profile/me", allowEmployeesAndAdmins, getEmployeeProfile);

// ✅ ADMIN-ONLY ROUTES (only company admins)
router.post("/register", createEmployee);
router.get("/", getCompanyEmployees);
router.put("/:employeeId", updateEmployee);
router.delete("/:employeeId", deleteEmployee);
router.put("/:employeeId/salary", updateEmployeeSalary);
router.post("/bulk/status", bulkUpdateEmployeeStatus);

// ✅ SEARCH & FILTER ROUTES (both admin and employees with permissions)
router.get("/search/all", allowEmployeesAndAdmins, searchEmployees);

// ✅ SPECIFIC ROUTES (MUST come before parameterized routes)
router.get("/reports/salary", allowEmployeesAndAdmins, getCompanySalaryReport);

// ✅ PARAMETERIZED ROUTES (MUST come LAST to avoid conflicts)
router.get("/:employeeId/salary", allowEmployeesAndAdmins, getEmployeeSalary);
router.get("/:employeeId", allowEmployeesAndAdmins, getEmployee);

// ✅ DEBUG ROUTES (PROTECTED)
router.get("/debug/auth-test", allowEmployeesAndAdmins, (req, res) => {
  console.log("✅ Auth test route - User:", req.user);
  res.json({
    success: true,
    user_type: req.user.type,
    user_id: req.user.id,
    email: req.user.email,
    company_code: req.user.company_code,
    employee_code: req.user.employee_code,
    role: req.user.role,
    message: `Authentication successful for ${req.user.type}`,
    can_access_employee_routes: req.user.type === 'employee' || req.user.type === 'user'
  });
});

router.get("/debug/user-info", allowEmployeesAndAdmins, (req, res) => {
  res.json({
    authenticated: true,
    user_details: {
      id: req.user.id,
      type: req.user.type,
      email: req.user.email,
      company_code: req.user.company_code,
      employee_code: req.user.employee_code,
      username: req.user.username,
      role: req.user.role,
      status: req.user.status,
      is_active: req.user.is_active
    },
    permissions: {
      is_employee: req.user.type === 'employee',
      is_company_admin: req.user.type === 'user',
      can_manage_employees: req.user.type === 'user',
      can_view_salary: req.user.type === 'employee' || req.user.type === 'user',
      can_update_profile: req.user.type === 'employee' || req.user.type === 'user'
    }
  });
});

// ✅ EMPLOYEE PERMISSIONS DEBUG ROUTE
router.get("/debug/permissions-check", allowEmployeesAndAdmins, (req, res) => {
  const user = req.user;
  const permissions = {
    // Employee permissions
    can_view_own_profile: user.type === 'employee',
    can_update_own_profile: user.type === 'employee',
    can_view_own_salary: user.type === 'employee',
    
    // Admin permissions  
    can_create_employees: user.type === 'user',
    can_view_all_employees: user.type === 'user',
    can_update_any_employee: user.type === 'user',
    can_delete_employees: user.type === 'user',
    can_manage_salaries: user.type === 'user',
    can_generate_reports: user.type === 'user',
    can_bulk_update: user.type === 'user'
  };

  res.json({
    user_type: user.type,
    employee_code: user.employee_code,
    company_code: user.company_code,
    permissions: permissions,
    accessible_endpoints: getAccessibleEndpoints(user.type)
  });
});

// Helper function to show accessible endpoints based on user type
function getAccessibleEndpoints(userType) {
  const baseEndpoints = [
    "GET /api/employees/profile/me",
    "PUT /api/employees/profile/me", 
    "GET /api/employees/debug/auth-test",
    "GET /api/employees/debug/user-info",
    "GET /api/employees/debug/permissions-check"
  ];

  const employeeEndpoints = [
    ...baseEndpoints,
    "GET /api/employees/:employeeId/salary",
    "GET /api/employees/search/all",
    "GET /api/employees/reports/salary"
  ];

  const adminEndpoints = [
    ...baseEndpoints,
    "POST /api/employees/register",
    "GET /api/employees/",
    "GET /api/employees/:employeeId", 
    "PUT /api/employees/:employeeId",
    "DELETE /api/employees/:employeeId",
    "PUT /api/employees/:employeeId/salary",
    "GET /api/employees/:employeeId/salary",
    "GET /api/employees/reports/salary",
    "GET /api/employees/search/all",
    "POST /api/employees/bulk/status"
  ];

  return userType === 'employee' ? employeeEndpoints : adminEndpoints;
}

// ✅ 404 HANDLER FOR EMPLOYEE ROUTES
router.use("*", (req, res) => {
  console.log('❌ Employee route not found:', req.originalUrl);
  res.status(404).json({
    error: "Employee route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    available_routes: [
      "PUBLIC:",
      "POST /api/employees/login",
      "GET /api/employees/debug/simple-test",
      "GET /api/employees/debug/token-check", 
      "GET /api/employees/debug/db-check",
      "",
      "PROTECTED (Employee & Admin):",
      "GET /api/employees/profile/me",
      "PUT /api/employees/profile/me",
      "GET /api/employees/search/all",
      "GET /api/employees/reports/salary",
      "GET /api/employees/:employeeId/salary",
      "GET /api/employees/:employeeId",
      "",
      "ADMIN ONLY:",
      "POST /api/employees/register",
      "GET /api/employees/",
      "PUT /api/employees/:employeeId",
      "DELETE /api/employees/:employeeId", 
      "PUT /api/employees/:employeeId/salary",
      "POST /api/employees/bulk/status",
      "",
      "DEBUG:",
      "GET /api/employees/debug/auth-test",
      "GET /api/employees/debug/user-info",
      "GET /api/employees/debug/permissions-check"
    ]
  });
});

module.exports = router;