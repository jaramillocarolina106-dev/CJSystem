// middlewares/requireEmpresaActiva.js
module.exports = (req, res, next) => {
  if (!req.user || !req.user.empresa) {
    return res.status(400).json({
      msg: "Usuario sin empresa asociada"
    });
  }

  next();
};
