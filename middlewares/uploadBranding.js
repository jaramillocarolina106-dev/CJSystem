const multer = require("multer");
const path = require("path");
const fs = require("fs");

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo imágenes"));
    }
    cb(null, true);
  }
});
