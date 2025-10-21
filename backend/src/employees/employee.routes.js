const express = require("express");
const { 
  authenticate, 
  allowEmployeesAndAdmins,
  requireAdminForEmployeeManagement,
  requireSameCompany
} = require("../middleware/auth"); // IMPORT NEW MIDDLEWARE

const {
  createEmployee,
  getCompanyEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  employeeLogin,
  getEmployeeProfile
} = require("./employee.controller");

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.post("/login", employeeLogin);

// ==================== PROTECTED ROUTES ====================
// Employee can view their own profile
router.get("/profile/me", authenticate, requireSameCompany, getEmployeeProfile);

// Only company admins can create employees
router.post("/register", authenticate, requireAdminForEmployeeManagement, createEmployee);

// Only company admins can list all employees
router.get("/", authenticate, requireAdminForEmployeeManagement, getCompanyEmployees);

// Both admins and employees can view specific employee details
router.get("/:employeeId", authenticate, allowEmployeesAndAdmins, getEmployee);

// Both admins and employees can update (with proper checks in controller)
router.put("/:employeeId", authenticate, allowEmployeesAndAdmins, updateEmployee);

// Only company admins can delete employees
router.delete("/:employeeId", authenticate, requireAdminForEmployeeManagement, deleteEmployee);

// DEBUG ROUTE - Check your token and permissions
router.get("/debug/auth-info", authenticate, (req, res) => {
  res.json({
    user: req.user,
    permissions: {
      isAdmin: req.user.type === 'user',
      isEmployee: req.user.type === 'employee',
      companyCode: req.user.company_code,
      canManageEmployees: req.user.type === 'user'
    },
    requestInfo: {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      query: req.query
    }
  });
});

module.exports = router;