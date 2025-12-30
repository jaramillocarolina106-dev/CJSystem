const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { obtenerBranding } = require("../controllers/brandingController");

router.get("/mi-branding", verifyToken, obtenerBranding);

module.exports = router;
