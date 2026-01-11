const Ticket = require("../models/Ticket");
const Empresa = require("../models/Empresa");
const User = require("../models/User");

exports.dashboard = async (req, res) => {
  try {
    if (!req.user || req.user.rol !== "superadmin") {
      return res.status(403).json({ msg: "Acceso solo para superadmin" });
    }

    // ===============================
    // 📈 TICKETS ÚLTIMOS 12 MESES
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
    // 📊 CARDS GLOBALES
    // ===============================
    const empresas = await Empresa.countDocuments();
    const tickets = await Ticket.countDocuments();
    
    const agentes = await User.countDocuments({
  rol: "agente",
  activo: true
});

const admins = await User.countDocuments({
  rol: "admin",
  activo: true
});

const usuarios = await User.countDocuments({
  rol: "usuario",   
  activo: true
});


    // ===============================
    // 🏢 TOP EMPRESAS
    // ===============================
    const topEmpresas = await Ticket.aggregate([
      { $group: { _id: "$empresa", tickets: { $sum: 1 } } },
      {
        $lookup: {
          from: "empresas",
          localField: "_id",
          foreignField: "_id",
          as: "empresa"
        }
      },
      { $unwind: "$empresa" },
      {
        $project: {
          nombre: "$empresa.nombre",
          tickets: 1
        }
      },
      { $sort: { tickets: -1 } },
      { $limit: 5 }
    ]);

    // ===============================
    // 👨‍💻 TOP AGENTES
    // ===============================
    const topAgentes = await Ticket.aggregate([
      { $match: { asignadoA: { $ne: null } } },
      { $group: { _id: "$asignadoA", total: { $sum: 1 } } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "agente"
        }
      },
      { $unwind: "$agente" },
      {
        $project: {
          nombre: {
            $concat: [
              "$agente.nombre",
              " ",
              { $ifNull: ["$agente.apellido", ""] }
            ]
          },
          total: 1
        }
      },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      empresas,
      admins,
      agentes,
      usuarios,
      tickets,

      labelsMeses,
      meses,

      topEmpresas,
      topAgentes
    });

  } catch (err) {
    console.error("❌ Error dashboard superadmin:", err);
    res.status(500).json({ msg: "Error dashboard superadmin" });
  }
};
