module.exports = (req, res, next) => {
  if (req.user.rol !== "superadmin") {
    return res.status(403).json({ msg: "Acceso solo para superadmin" });
  }
  next();
};
