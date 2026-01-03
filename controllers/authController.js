// ================================================
// 🔐 AUTH CONTROLLER — CJSystem HelpDesk SaaS
// ================================================
const User = require("../models/User");
const Empresa = require("../models/Empresa");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ==========================================================
// 📌 REGISTRAR USUARIO
// ==========================================================
exports.registrar = async (req, res) => {
  try {
    const { nombre, email, password, rol, empresaId } = req.body;
    const solicitante = req.user;

    const rolesPermitidos = ["cliente", "agente", "admin"];

    if (rol === "superadmin" && solicitante.rol !== "superadmin") {
      return res.status(403).json({ msg: "No puedes crear superadmins" });
    }

    if (!rolesPermitidos.includes(rol) && solicitante.rol !== "superadmin") {
      return res.status(400).json({ msg: "Rol inválido" });
    }

    const empresaAsignada =
      solicitante.rol === "superadmin" ? empresaId : solicitante.empresa;

    const empresa = await Empresa.findById(empresaAsignada);
    if (!empresa) {
      return res.status(400).json({ msg: "Empresa no existe" });
    }

    const existe = await User.findOne({ email: email.toLowerCase() });
    if (existe) {
      return res.status(400).json({ msg: "El correo ya está registrado" });
    }

    const usuario = await User.create({
      nombre,
      email: email.toLowerCase(),
      password,
      rol,
      empresa: empresaAsignada
    });

    res.json({
      msg: "Usuario creado con éxito",
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error creando usuario" });
  }
};



// ==========================================================
// 📌 LOGIN
// ==========================================================
// ==========================================================
// 📌 LOGIN — EMPRESA FIJA POR USUARIO
// ==========================================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        msg: "Correo y contraseña son obligatorios"
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase()
    })
      .select("+password")
      .populate("empresa");

    if (!user) {
      return res.status(401).json({ msg: "Credenciales inválidas" });
    }

    if (!user.activo) {
      return res.status(403).json({ msg: "Usuario desactivado" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ msg: "Credenciales inválidas" });
    }

    // Limpieza por si quedó de una sesión anterior
    res.clearCookie("empresaActiva");

const token = jwt.sign(
  {
    id: user._id,
    rol: user.rol,
    empresa: user.empresa?._id || null
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

const isProd = process.env.NODE_ENV === "production";

res.cookie("token", token, {
  httpOnly: true,
  secure: isProd,                    
  sameSite: isProd ? "none" : "lax", 
  maxAge: 24 * 60 * 60 * 1000
});

res.cookie("token", token, {
  httpOnly: true,
  secure: false,     
  sameSite: "lax",   
  maxAge: 24 * 60 * 60 * 1000
});

res.json({
  msg: "Login exitoso",
  usuario: {
    id: user._id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    empresa: user.empresa?._id || null,
    branding: user.empresa?.branding || null
  }
});

  } catch (err) {
    console.error("❌ ERROR LOGIN:", err);
    res.status(500).json({ msg: "Error interno en login" });
  }
};

// ==========================================================
// 📌 PERFIL
// ==========================================================
exports.perfil = async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id).populate("empresa");
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ msg: "Error obteniendo perfil" });
  }
};

// ==========================================================
// 📌 LISTAR USUARIOS
// ==========================================================
exports.listarUsuarios = async (req, res) => {
  try {
    let empresaId = req.user.empresa;

    // 🔥 SUPERADMIN IMPERSONANDO UNA EMPRESA
    if (req.user.rol === "superadmin" && req.cookies.empresaActiva) {
      empresaId = req.cookies.empresaActiva;
    }

    if (!empresaId) {
      return res.status(400).json({ msg: "Empresa no definida" });
    }

    const usuarios = await User.find({ empresa: empresaId })
      .select("-password")
      .populate("empresa", "nombre")
      .sort({ createdAt: -1 });

    res.json(usuarios);

  } catch (err) {
    console.error("❌ Error listando usuarios:", err);
    res.status(500).json({ msg: "Error listando usuarios" });
  }
};

// ==========================================================
// 📌 REGISTRO INICIAL SUPERADMIN (SOLO UNA VEZ)
// ==========================================================
exports.registerSuperadmin = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ msg: "Ruta deshabilitada" });
    }

    const { nombre, email, password } = req.body;

    const existe = await User.findOne({ rol: "superadmin" });
    if (existe) {
      return res.status(403).json({ msg: "Setup ya realizado" });
    }

    await User.create({
      nombre,
      email: email.toLowerCase(),
      password,
      rol: "superadmin",
      empresa: null
    });

    res.json({ msg: "Superadmin creado correctamente" });

  } catch (err) {
    res.status(500).json({ msg: "Error creando superadmin" });
  }
};


