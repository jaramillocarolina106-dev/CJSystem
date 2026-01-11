// ======================================================
// 📌 MODELO DE USUARIO — CJSystem HelpDesk SaaS
// ======================================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // ✅ FALTABA ESTO

const UserSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: [true, "El correo es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Correo inválido"],
      index: true
    },

    password: {
  type: String,
  required: true,
  minlength: 6,
  select: false
},

debeCambiarPassword: {
  type: Boolean,
  default: false
},

    rol: {
      type: String,
      enum: ["superadmin", "admin", "agente", "usuario"],
      default: "usuario",
    },

    empresa: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Empresa",
  required: function () {
    return this.rol !== "superadmin";
  }
},

    avatar: {
      type: String,
      default: null,
    },

    telefono: {
      type: String,
      default: null,
      trim: true
    },

    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }

  
);

// 🔐 HASH AUTOMÁTICO
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.index({ empresa: 1, rol: 1 });

module.exports = mongoose.model("User", UserSchema);
