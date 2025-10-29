const express = require("express");
const { authenticate } = require("../middleware/auth");
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
router.post("/login", employeeLogin); // Employee login (public)

// ==================== PROTECTED ROUTES ====================
// Apply authentication to all management routes
router.post("/register", authenticate, createEmployee); // ✅ SECURED: Create employee
router.get("/", authenticate, getCompanyEmployees);     // ✅ SECURED: Get company employees
router.get("/:employeeId", authenticate, getEmployee);  // ✅ CHANGED: id → employeeId

// ==================== ADDITIONAL PROTECTED ROUTES ====================
router.put("/:employeeId", authenticate, updateEmployee);    // ✅ CHANGED: id → employeeId
router.delete("/:employeeId", authenticate, deleteEmployee); // ✅ CHANGED: id → employeeId
router.get("/profile/me", authenticate, getEmployeeProfile); // Employee gets own profile

module.exports = router;