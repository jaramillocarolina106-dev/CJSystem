const mongoose = require("mongoose");

const ConfigGlobalSchema = new mongoose.Schema(
  {
    nombreSistema: {
      type: String,
      default: "CJSystem HelpDesk"
    },

    logoURL: {
      type: String,
      default: ""
    },

    modoDefault: {
      type: String,
      enum: ["dark", "light"],
      default: "dark"
    },

    permitirRegistroEmpresas: {
      type: Boolean,
      default: true
    },

    limiteTicketsPorEmpresa: {
      type: Number,
      default: 0
    },

    // ⏱ SLA GLOBAL (FALLBACK)
    sla: {
      alta: { type: Number, default: 4 },
      media: { type: Number, default: 12 },
      baja: { type: Number, default: 24 }
    },

    // 🕒 HORARIO GLOBAL (FALLBACK)
    horario: {
      tipo: {
        type: String,
        enum: ["24x7", "lv", "ls"],
        default: "24x7"
      },
      horaInicio: {
        type: String,
        default: null
      },
      horaFin: {
        type: String,
        default: null
      },
      trabajaFestivos: {
        type: Boolean,
        default: false
      }
    },

    logsHabilitados: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// 👉 Siempre habrá SOLO un documento
ConfigGlobalSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model("ConfigGlobal", ConfigGlobalSchema);
