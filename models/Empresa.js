// ===============================================
// 📌 MODELO DE EMPRESA — CJSystem HelpDesk (PRO)
// ===============================================

const mongoose = require("mongoose");

const EmpresaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre de la empresa es obligatorio"],
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    nit: {
      type: String,
      default: null,
      trim: true,
      index: true
    },

    telefono: {
      type: String,
      default: null,
      trim: true
    },

    direccion: {
      type: String,
      default: null,
      trim: true
    },

   
    // 🎨 Branding por empresa
branding: {
  nombreVisible: {
    type: String,
    default: ""
  },
  logoPath: {
    type: String,
    default: ""
  },
  colorPrimario: {
    type: String,
    default: "#4b7bff"
  },
  colorSecundario: {
    type: String,
    default: "#8eaaff"
  }
},


    // 🔔 Configuración de notificaciones
    notificaciones: {
      correo: {
        type: Boolean,
        default: true
      },
      whatsapp: {
        type: Boolean,
        default: false
      }
    },
    // ⏱ SLA por empresa
sla: {
  alta: {
    type: Number,
    default: null // horas
  },
  media: {
    type: Number,
    default: null
  },
  baja: {
    type: Number,
    default: null
  }
},

// 🕒 Horario laboral
    horarioLaboral: {
      tipo: {
        type: String,
        enum: ["24x7", "lv", "ls"],
        default: "lv"
      },

      horaInicio: {
        type: String,
        default: "08:00"
      },

      horaFin: {
        type: String,
        default: "18:00"
      },

      trabajaFestivos: {
        type: Boolean,
        default: false
      },

      festivos: [{ type: Date }]
    },

    // 🟢 Estado
    activa: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Índices
EmpresaSchema.index({ nombre: 1 });

module.exports = mongoose.model("Empresa", EmpresaSchema);