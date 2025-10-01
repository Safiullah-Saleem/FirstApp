const express = require("express");
const {
  saveItem,
  getAllItems,
  getItem,
  updateItem,
} = require("./item.controller");

const router = express.Router();

// Item routes
router.post("/save", saveItem);
router.get("/", getAllItems);
router.get("/:id", getItem);
router.put("/update", updateItem);

module.exports = router;
