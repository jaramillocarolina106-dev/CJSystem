// models/AuditLog.js
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    accion: {
      type: String,
      required: true,
      uppercase: true, 
      index: true
    },

    detalle: {
      type: String,
      default: null
    },

    severidad: {
      type: String,
      enum: ["baja", "media", "alta"],
      default: "media",
      index: true
    },

    usuario: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
      },
      nombre: String,
      email: String,
      rol: String
    },

    empresa: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Empresa",
        index: true
      },
      nombre: String
    },

 ip: {
  type: String,
  default: null,
  index: true
},

ipPrivada: {
  type: Boolean,
  default: false,
  index: true
},


geo: {
  pais: String,
  region: String,
  ciudad: String,
  lat: Number,
  lon: Number,
  timezone: String
},

    userAgent: {
      type: String,
      default: "—"
    },

    // Fecha explícita (útil para queries directas)
    fecha: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true // createdAt / updatedAt (PRO)
  }
);

/* =========================
   📌 ÍNDICES COMPUESTOS
========================= */
auditLogSchema.index({ "empresa.id": 1, fecha: -1 });
auditLogSchema.index({ "usuario.id": 1, fecha: -1 });
auditLogSchema.index({ ip: 1, fecha: -1 });
auditLogSchema.index({ ipPrivada: 1, fecha: -1 });



module.exports = mongoose.model("AuditLog", auditLogSchema);
