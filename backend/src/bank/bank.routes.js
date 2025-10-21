const express = require("express");
const { list, get, save, remove, history } = require("./bank.controller");

const router = express.Router();

router.get("/list", list);
router.get("/get", get);
router.post("/save", save);
router.delete("/delete", remove);
router.get("/history", history);

module.exports = router;


