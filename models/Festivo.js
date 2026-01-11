const mongoose = require("mongoose");

const FestivoSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    required: true,
    unique: true
  },
  nombre: {
    type: String,
    required: true
  },
  pais: {
    type: String,
    default: "CO"
  }
}, {
  timestamps: true
});

FestivoSchema.index({ fecha: 1 });

module.exports = mongoose.model("Festivo", FestivoSchema);
