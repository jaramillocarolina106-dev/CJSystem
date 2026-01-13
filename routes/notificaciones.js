const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/verifyToken");
const {
  suscribir
} = require("../controllers/notificacionesController");


router.post("/suscribir", verifyToken, suscribir);

module.exports = router;
