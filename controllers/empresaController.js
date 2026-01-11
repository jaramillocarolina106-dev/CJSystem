// =====================================================
// 📌 CONTROLADOR DE EMPRESAS — CJSystem HelpDesk
// =====================================================

const Empresa = require("../models/Empresa");
const User = require("../models/User");

// -----------------------------------------------------
// 📌 CREAR EMPRESA (solo superadmin)
// -----------------------------------------------------
exports.crearEmpresa = async (req, res) => {
  try {
    const { nombre, nit, telefono, direccion, colorPrimario, colorSecundario } = req.body;

    const empresa = await Empresa.create({
      nombre,
      nit,
      telefono,
      direccion,
      colorPrimario,
      colorSecundario
    });

    res.json({ msg: "Empresa creada correctamente", empresa });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error creando empresa", err });
  }
};

// -----------------------------------------------------
// 📌 LISTAR TODAS LAS EMPRESAS (solo superadmin)
// -----------------------------------------------------
exports.obtenerEmpresas = async (req, res) => {
  try {
    const empresas = await Empresa.find().sort({ createdAt: -1 });

    const resultado = [];

    for (const emp of empresas) {
      const [admins, agentes, usuarios] = await Promise.all([
        User.countDocuments({
          empresa: emp._id,
          rol: "admin",
          activo: true
        }),
        User.countDocuments({
          empresa: emp._id,
          rol: "agente",
          activo: true
        }),
        User.countDocuments({
          empresa: emp._id,
          rol: "usuario",
          activo: true
        })
      ]);

      resultado.push({
        _id: emp._id,
        nombre: emp.nombre,
        admins,
        agentes,
        usuarios,
        tickets: 0, 
        activa: emp.activa ?? true
      });
    }

    res.json(resultado);

  } catch (err) {
    console.error("❌ Error listando empresas:", err);
    res.status(500).json({ msg: "Error listando empresas" });
  }
};



// -----------------------------------------------------
// 📌 OBTENER UNA EMPRESA POR ID
// -----------------------------------------------------
exports.obtenerEmpresa = async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.params.id);

    if (!empresa)
      return res.status(404).json({ msg: "Empresa no encontrada" });

    res.json(empresa);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al obtener empresa" });
  }
};

// -----------------------------------------------------
// 📌 EDITAR EMPRESA
// -----------------------------------------------------
exports.editarEmpresa = async (req, res) => {
  try {
    const camposPermitidos = [
      "nombre",
      "nit",
      "telefono",
      "direccion",
      "colorPrimario",
      "colorSecundario"
    ];

    const dataActualizada = {};
    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        dataActualizada[campo] = req.body[campo];
      }
    }

    const empresa = await Empresa.findByIdAndUpdate(
      req.params.id,
      dataActualizada,
      { new: true }
    );

    if (!empresa)
      return res.status(404).json({ msg: "Empresa no encontrada" });

    res.json({ msg: "Empresa actualizada", empresa });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al editar empresa" });
  }
};

// -----------------------------------------------------
// 📌 ELIMINAR EMPRESA (solo superadmin)
// -----------------------------------------------------
exports.eliminarEmpresa = async (req, res) => {
  try {
    const empresa = await Empresa.findByIdAndDelete(req.params.id);

    if (!empresa)
      return res.status(404).json({ msg: "Empresa no encontrada" });

    // Reasignar usuarios sin empresa
    await User.updateMany(
      { empresa: req.params.id },
      { $set: { empresa: null } }
    );

    res.json({ msg: "Empresa eliminada correctamente" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al eliminar empresa" });
  }
};
// =====================================================
// 🎨 OBTENER BRANDING DE EMPRESA
// =====================================================
exports.obtenerBranding = async (req, res) => {
  try {
    if (req.user.rol !== "superadmin") {
      return res.status(403).json({ msg: "No autorizado" });
    }

    const empresa = await Empresa.findById(req.params.id);

    if (!empresa) {
      return res.status(404).json({ msg: "Empresa no encontrada" });
    }

    res.json({
      nombreVisible: empresa.branding?.nombreVisible || empresa.nombre,
      logoPath: empresa.branding?.logoPath || "",
      colorPrimario: empresa.branding?.colorPrimario || "#4b7bff",
      colorSecundario: empresa.branding?.colorSecundario || "#8eaaff"
    });

  } catch (err) {
    console.error("❌ Error obtener branding:", err);
    res.status(500).json({ msg: "Error obteniendo branding" });
  }
};

// =====================================================
// 🎨 GUARDAR BRANDING DE EMPRESA (PRO)
// =====================================================
exports.guardarBranding = async (req, res) => {
  try {
    if (req.user.rol !== "superadmin") {
      return res.status(403).json({ msg: "No autorizado" });
    }
    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) {
      return res.status(404).json({ msg: "Empresa no encontrada" });
    }

    // Crear objeto branding si no existe
    if (!empresa.branding) {
      empresa.branding = {};
    }

    // Texto y colores
    if (req.body.nombreVisible !== undefined) {
      empresa.branding.nombreVisible = req.body.nombreVisible;
    }

    if (req.body.colorPrimario) {
      empresa.branding.colorPrimario = req.body.colorPrimario;
    }

    if (req.body.colorSecundario) {
      empresa.branding.colorSecundario = req.body.colorSecundario;
    }

    // Logo (multer)
    if (req.file) {
      empresa.branding.logoPath = `/uploads/logos/${req.file.filename}`;
    }

    await empresa.save();

    res.json({
      msg: "Branding guardado correctamente",
      branding: empresa.branding
    });

  } catch (err) {
    console.error("❌ Error guardando branding:", err);
    res.status(500).json({ msg: "Error guardando branding" });
  }
};

// -----------------------------------------------------
// 📌 CREAR EMPRESA (solo superadmin)
// -----------------------------------------------------
exports.crearEmpresa = async (req, res) => {
  try {
    const { nombre, nit, telefono, direccion, colorPrimario, colorSecundario } = req.body;

    const empresa = await Empresa.create({
      nombre,
      nit,
      telefono,
      direccion,
      colorPrimario,
      colorSecundario
    });

    res.json({ msg: "Empresa creada correctamente", empresa });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error creando empresa", err });
  }
};

// -----------------------------------------------------
// 📌 LISTAR TODAS LAS EMPRESAS (solo superadmin)
// -----------------------------------------------------
exports.obtenerEmpresas = async (req, res) => {
  try {
    const empresas = await Empresa.find().sort({ createdAt: -1 });

    const resultado = [];

    for (const emp of empresas) {

      const usuarios = await User.find({ empresa: emp._id });

      const admins = usuarios.filter(u => u.rol === "admin").length;
      const agentes = usuarios.filter(u => u.rol === "agente").length;
      const usuario = usuarios.filter(u => u.rol === "usuario").length;

      resultado.push({
        _id: emp._id,
        nombre: emp.nombre,
        admins,
        agentes,
        usuarios: usuario,
        usuariosTotal: usuarios.length,
        activa: emp.activa ?? true
      });
    }

    res.json(resultado);

  } catch (err) {
    console.error("❌ Error listando empresas:", err);
    res.status(500).json({ msg: "Error listando empresas" });
  }
};


// -----------------------------------------------------
// 📌 OBTENER UNA EMPRESA POR ID
// -----------------------------------------------------
exports.obtenerEmpresa = async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.params.id);

    if (!empresa)
      return res.status(404).json({ msg: "Empresa no encontrada" });

    res.json(empresa);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al obtener empresa" });
  }
};

// -----------------------------------------------------
// 📌 EDITAR EMPRESA
// -----------------------------------------------------
exports.editarEmpresa = async (req, res) => {
  try {
    const camposPermitidos = [
      "nombre",
      "nit",
      "telefono",
      "direccion",
      "colorPrimario",
      "colorSecundario"
    ];

    const dataActualizada = {};
    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        dataActualizada[campo] = req.body[campo];
      }
    }

    const empresa = await Empresa.findByIdAndUpdate(
      req.params.id,
      dataActualizada,
      { new: true }
    );

    if (!empresa)
      return res.status(404).json({ msg: "Empresa no encontrada" });

    res.json({ msg: "Empresa actualizada", empresa });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al editar empresa" });
  }
};

// -----------------------------------------------------
// 📌 ELIMINAR EMPRESA (solo superadmin)
// -----------------------------------------------------
exports.eliminarEmpresa = async (req, res) => {
  try {
    const empresa = await Empresa.findByIdAndDelete(req.params.id);

    if (!empresa)
      return res.status(404).json({ msg: "Empresa no encontrada" });

    // Reasignar usuarios sin empresa
    await User.updateMany(
      { empresa: req.params.id },
      { $set: { empresa: null } }
    );

    res.json({ msg: "Empresa eliminada correctamente" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al eliminar empresa" });
  }
};
// =====================================================
// 🎨 OBTENER BRANDING DE EMPRESA
// =====================================================
exports.obtenerBranding = async (req, res) => {
  try {
    if (req.user.rol !== "superadmin") {
      return res.status(403).json({ msg: "No autorizado" });
    }

    const empresa = await Empresa.findById(req.params.id);

    if (!empresa) {
      return res.status(404).json({ msg: "Empresa no encontrada" });
    }

    res.json({
      nombreVisible: empresa.branding?.nombreVisible || empresa.nombre,
      logoPath: empresa.branding?.logoPath || "",
      colorPrimario: empresa.branding?.colorPrimario || "#4b7bff",
      colorSecundario: empresa.branding?.colorSecundario || "#8eaaff"
    });

  } catch (err) {
    console.error("❌ Error obtener branding:", err);
    res.status(500).json({ msg: "Error obteniendo branding" });
  }
};

// =====================================================
// 🎨 GUARDAR BRANDING DE EMPRESA (PRO)
// =====================================================
exports.guardarBranding = async (req, res) => {
  try {
    if (req.user.rol !== "superadmin") {
      return res.status(403).json({ msg: "No autorizado" });
    }
    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) {
      return res.status(404).json({ msg: "Empresa no encontrada" });
    }

    // Crear objeto branding si no existe
    if (!empresa.branding) {
      empresa.branding = {};
    }

    // Texto y colores
    if (req.body.nombreVisible !== undefined) {
      empresa.branding.nombreVisible = req.body.nombreVisible;
    }

    if (req.body.colorPrimario) {
      empresa.branding.colorPrimario = req.body.colorPrimario;
    }

    if (req.body.colorSecundario) {
      empresa.branding.colorSecundario = req.body.colorSecundario;
    }

    // Logo (multer)
    if (req.file) {
      empresa.branding.logoPath = `/uploads/logos/${req.file.filename}`;
    }

    await empresa.save();

    res.json({
      msg: "Branding guardado correctamente",
      branding: empresa.branding
    });

  } catch (err) {
    console.error("❌ Error guardando branding:", err);
    res.status(500).json({ msg: "Error guardando branding" });
  }
};
// -----------------------------------------------------
// 📌 ENTRAR A EMPRESA (superadmin)
// -----------------------------------------------------
exports.entrarEmpresa = async (req, res) => {
  try {
    const empresaId = req.params.id;

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ msg: "Empresa no encontrada" });
    }

    // 🔐 TOKEN DE CONTEXTO (NO ES EL LOGIN TOKEN)
    const empresaToken = jwt.sign(
      {
        superadminId: req.user.id,
        empresaId,
        tipo: "empresa-context"
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      msg: "Empresa activa",
      empresaToken
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al entrar a empresa" });
  }
};

