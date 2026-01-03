const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // 🔥 1. Intentar desde cookie
    let token = req.cookies?.token;

    // 🔁 2. Fallback: Authorization header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts[0] === "Bearer") token = parts[1];
    }

    if (!token) {
      return res.status(401).json({ msg: "Token no proporcionado" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({ msg: "Token inválido" });
  }
};
