const mongoose = require("mongoose");

const pushSubscriptionSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    endpoint: {
      type: String,
      required: true,
      unique: true
    },

    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    },

    navegador: {
      type: String,
      default: "desconocido"
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


pushSubscriptionSchema.index({ usuario: 1, activo: 1 });

module.exports = mongoose.model(
  "PushSubscription",
  pushSubscriptionSchema
);
