import mongoose from "mongoose";

export const conectarDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔥 MongoDB conectado");
  } catch (error) {
    console.error("❌ Error DB:", error);
    process.exit(1);
  }
};
