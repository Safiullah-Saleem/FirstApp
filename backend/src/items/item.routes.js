const express = require("express");
const {
  saveItem,
  getAllItems,
  getItem,
  updateItem,
  deleteItem,
} = require("./item.controller");

const router = express.Router();

// Item routes
router.post("/save", saveItem);
router.get("/", getAllItems);
router.get("/:id", getItem);
router.put("/update", updateItem);
router.delete("/:id", deleteItem);
router.post("/delete", deleteItem);

module.exports = router;
