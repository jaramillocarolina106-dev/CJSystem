const mongoose = require("mongoose");

const DiaSchema = {
  activo: { type: Boolean, default: false },
  inicio: { type: String, default: null }, // "08:00"
  fin: { type: String, default: null }     // "17:00"
};

const ConfigEmpresaSchema = new mongoose.Schema({
  empresa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Empresa",
    unique: true,
    required: true
  },

  // ⏱ SLA POR PRIORIDAD (HORAS)
  sla: {
    alta: { type: Number, default: null },
    media: { type: Number, default: null },
    baja: { type: Number, default: null }
  },

  tipoHorario: {
  type: String,
  enum: ["24x7", "lv", "ls"],
  default: "24x7"
},

  // 🕒 HORARIO LABORAL SEMANAL
  horarioSemanal: {
    lunes: DiaSchema,
    martes: DiaSchema,
    miercoles: DiaSchema,
    jueves: DiaSchema,
    viernes: DiaSchema,
    sabado: DiaSchema,
    domingo: DiaSchema
  },

  // 🎉 FESTIVOS
  trabajaFestivos: {
    type: Boolean,
    default: false
  },

  activo: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("ConfigEmpresa", ConfigEmpresaSchema);
