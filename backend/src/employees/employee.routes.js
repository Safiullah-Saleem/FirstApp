const express = require("express");
const {
  saveUser,
  employeeLogin,
  getAllEmployees,
  getEmployee,
} = require("./employee.controller");

const router = express.Router();

// Employee routes
router.post("/register", saveUser);
router.post("/login", employeeLogin);
router.get("/", getAllEmployees);
router.get("/:id", getEmployee);

module.exports = router;
