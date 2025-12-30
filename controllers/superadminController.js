const Ticket = require("../models/Ticket");
const Empresa = require("../models/Empresa");
const User = require("../models/User");

exports.dashboard = async (req, res) => {
  try {
    const ahora = new Date();

    // ===============================
    // 📈 TICKETS ÚLTIMOS 12 MESES (GLOBAL)
    // ===============================
    const meses = [];
    const labelsMeses = [];

    const nombresMeses = [
      "Ene","Feb","Mar","Abr","May","Jun",
      "Jul","Ago","Sep","Oct","Nov","Dic"
    ];

    for (let i = 11; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);

      const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1);

      const total = await Ticket.countDocuments({
        createdAt: { $gte: inicio, $lt: fin }
      });

      meses.push(total);
      labelsMeses.push(
        `${nombresMeses[inicio.getMonth()]} ${inicio.getFullYear()}`
      );
    }

    // ===============================
    // 📊 CARDS
    // ===============================
    const empresas = await Empresa.countDocuments();
    const tickets = await Ticket.countDocuments();
    const agentes = await User.countDocuments({ rol: "agente" });
    const admins = await User.countDocuments({ rol: "admin" });
    const usuarios = await User.countDocuments({ rol: "cliente" });

    res.json({
      empresas,
      tickets,
      agentes,
      admins,
      usuarios,

      // 🔥 ESTO ES LO QUE EL FRONT NECESITA
      labelsMeses,
      meses,

      topEmpresas: [],
      topAgentes: []
    });

  } catch (err) {
    console.error("❌ Error dashboard superadmin:", err);
    res.status(500).json({ msg: "Error dashboard superadmin" });
  }
};
