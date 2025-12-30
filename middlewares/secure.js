// ==========================================================
// 🛡 MIDDLEWARE COMPLETO — secure()
// (auth + roles + empresa + jerarquía opcional)
// ==========================================================

const permitRoles = require("./permitRoles");
const sameCompany = require("./sameCompany");
const checkHierarchy = require("./checkHierarchy");
const verifyToken = require("./verifyToken");

module.exports = function ({
  roles = [],
  protegerEmpresa = false,
  jerarquiaContra = null
}) {
  return [
    verifyToken,
    roles.length ? permitRoles(...roles) : (req, res, next) => next(),
    protegerEmpresa ? sameCompany : (req, res, next) => next(),
    jerarquiaContra ? checkHierarchy(jerarquiaContra) : (req, res, next) => next()
  ];
};
