// models/AuditLog.js
const mongoose = require("mongoose");



const auditLogSchema = new mongoose.Schema({
  accion: {
    type: String,
    required: true
  },
  detalle: String,

  severidad: {
    type: String,
    enum: ["baja", "media", "alta"],
    default: "media"
  },

  usuario: {
  id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  nombre: String,
  email: String,
  rol: String
  },

  empresa: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Empresa" },
    nombre: String
  },

  ip: String,
  userAgent: String,

  fecha: {
    type: Date,
    default: Date.now
  }
});

/* =========================
   📌 ÍNDICES DE AUDITORÍA
========================= */
auditLogSchema.index({ "empresa.id": 1, fecha: -1 });
auditLogSchema.index({ "usuario.id": 1, fecha: -1 });
auditLogSchema.index({ accion: 1 });
auditLogSchema.index({ severidad: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
