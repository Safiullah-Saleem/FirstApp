const express = require("express");
const {
  createCash,
  getAllCash,
  getCashById,
  updateCash,
  deleteCash
} = require("./cash.controller");

const router = express.Router();

// Cash CRUD Routes
router.post("/", createCash);
router.get("/", getAllCash);
router.get("/:id", getCashById);
router.put("/:id", updateCash);
router.delete("/:id", deleteCash);

module.exports = router;
