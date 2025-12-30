const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    // ------------------------------
    // 🔵 RELACIONES
    // ------------------------------
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Empresa",
      required: true,
      index: true
    },

    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    asignadoA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    // ------------------------------
    // 🔵 DATOS DEL TICKET
    // ------------------------------
    titulo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    descripcion: {
      type: String,
      required: true,
      trim: true
    },

    categoria: {
      type: String,
      default: "General",
      trim: true
    },

   prioridad: {
  type: String,
  enum: ["baja", "media", "alta"],
  default: "media",
  trim: true,
  index: true
},

urgenciaUsuario: {
  type: String,
  enum: ["baja", "media", "alta"],
  default: "media",
  trim: true
},


    estado: {
      type: String,
      enum: ["abierto", "en_progreso", "escalado", "cerrado"],
      default: "abierto",
      index: true
    },

    // ------------------------------
    // 🔴 ESCALADO (PRO)
    // ------------------------------
    escaladoA: {
      tipo: {
        type: String,
        enum: [null, "usuario", "area", "proveedor"],
        default: null
      },

      refId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
      },

      nombre: {
        type: String,
        default: null
      },

      fecha: {
        type: Date,
        default: null
      },

      motivo: {
        type: String,
        default: null
      }
    },

    historialEscalado: [
      {
        fecha: {
          type: Date,
          default: Date.now
        },
        por: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        tipo: String,
        destino: String,
        motivo: String
      }
    ],

    // ------------------------------
    // 🔔 NOTIFICACIONES
    // ------------------------------
    tieneRespuestaNueva: {
      type: Boolean,
      default: false
    },

    ultimaRespuestaPor: {
      type: String,
      enum: [null, "usuario", "agente", "admin"],
      default: null
    },

    // ------------------------------
    // 🔵 IDENTIFICADOR
    // ------------------------------
    codigo: {
      type: String,
      unique: true,
      index: true
    },

// ⏱️ SLA
horasSLA: {
  type: Number,
  default: null
},
    // ------------------------------
    // ⏱️ SLA
    // ------------------------------
    fechaLimite: {
      type: Date,
      default: null
    },

    fechaCierre: {
      type: Date,
      default: null
    },

    // 🔔 ALERTAS SLA
slaAlertaEnviada: {
  type: Boolean,
  default: false
},

slaVencidoNotificado: {
  type: Boolean,
  default: false
},
    // ------------------------------
    // 💬 COMENTARIOS
    // ------------------------------
    comentarios: [
      {
        autor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        mensaje: {
          type: String,
          required: true
        },
        fecha: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // ------------------------------
    // 📎 ADJUNTOS
    // ------------------------------
    adjuntos: [
      {
        nombre: String,
        url: String
      }
    ],

    // ------------------------------
    // 📜 HISTORIAL GENERAL
    // ------------------------------
    historial: [
      {
        accion: {
          type: String,
          required: true
        },
        detalle: {
          type: String,
          default: ""
        },
        fecha: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// ------------------------------
// 📌 ÍNDICES
// ------------------------------
TicketSchema.index({ empresa: 1, createdAt: 1 });
TicketSchema.index({ estado: 1 });
TicketSchema.index({ prioridad: 1 });
TicketSchema.index({ asignadoA: 1, estado: 1 });
TicketSchema.index({ titulo: "text", descripcion: "text" });

module.exports = mongoose.model("Ticket", TicketSchema);
