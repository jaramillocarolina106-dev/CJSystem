const mongoose = require("mongoose");
const EmpresaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  nit: { type: String, default: null },
  telefono: { type: String, default: null },
  direccion: { type: String, default: null },

  branding: {
    nombreVisible: { type: String, default: "" },
    logoPath: { type: String, default: "" },
    colorPrimario: { type: String, default: "#4b7bff" },
    colorSecundario: { type: String, default: "#8eaaff" }
  },

  notificaciones: {
    correo: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false }
  },

  activa: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Empresa", EmpresaSchema);
