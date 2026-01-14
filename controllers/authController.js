  // ================================================
  // 🔐 AUTH CONTROLLER — CJSystem HelpDesk SaaS
  // ================================================
  const User = require("../models/User");
  const Empresa = require("../models/Empresa");
  const bcrypt = require("bcryptjs");
  const jwt = require("jsonwebtoken");
  const AuditLog = require("../models/AuditLog");

  // ==========================================================
  // 📌 REGISTRAR USUARIO
  // ==========================================================
  exports.registrar = async (req, res) => {
    try {
      const { nombre, email, password, rol } = req.body;
      const solicitante = req.user;

      const rolesPermitidos = ["usuario", "agente", "admin"];

      if (!rolesPermitidos.includes(rol) && solicitante.rol !== "superadmin") {
        return res.status(400).json({ msg: "Rol inválido" });
      }

      if (rol === "superadmin" && solicitante.rol !== "superadmin") {
        return res.status(403).json({ msg: "No puedes crear superadmins" });
      }

      const empresaAsignada =
        solicitante.rol === "superadmin"
          ? req.headers["x-empresa-activa"]
          : solicitante.empresa;

      if (!empresaAsignada) {
        return res.status(400).json({ msg: "Empresa no existe" });
      }

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

  // ❌ Usuario no existe
  if (!user) {

    await AuditLog.create({
      accion: "LOGIN_FALLIDO",
      detalle: `Intento de login con correo ${email}`,
      severidad: "media",
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return res.status(401).json({ msg: "Credenciales inválidas" });
  }

  // ❌ Usuario desactivado
  if (!user.activo) {
    return res.status(403).json({ msg: "Usuario desactivado" });
  }

  // 🔐 Validar contraseña
  const ok = await bcrypt.compare(password, user.password);

  // ❌ Contraseña incorrecta
  if (!ok) {

    await AuditLog.create({
      accion: "LOGIN_FALLIDO",
      detalle: `Contraseña incorrecta para ${email}`,
      severidad: "media",

      usuario: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      },

      empresa: {
        id: user.empresa?._id || null,
        nombre: user.empresa?.nombre || null
      },

      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return res.status(401).json({ msg: "Credenciales inválidas" });
  }

  // ⚠️ FORZAR CAMBIO DE CONTRASEÑA
  if (user.debeCambiarPassword) {
    return res.json({
      requiereCambioPassword: true,
      userId: user._id,
      msg: "Debes cambiar tu contraseña antes de continuar"
    });
  }



  const token = jwt.sign(
    {
      id: user._id,
      rol: user.rol,
      empresa: user.empresa?._id || null
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  await AuditLog.create({
    accion: "LOGIN",
    detalle: "Login exitoso",
    severidad: "baja",

    usuario: {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    },

    empresa: {
      id: user.empresa?._id || null,
      nombre: user.empresa?.nombre || null
    },

    ip: req.ip,
    userAgent: req.headers["user-agent"]
  });

  res.json({
    msg: "Login exitoso",
    token, 
    usuario: {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      empresa: user.empresa?._id || null
    }
  });


    } catch (err) {
      console.error("❌ ERROR LOGIN:", err);
      res.status(500).json({ msg: "Error interno en login" });
    }
  };
  // ==========================================================
  // 🔐 CAMBIO DE PASSWORD OBLIGATORIO
  // ==========================================================
  exports.cambiarPasswordObligatorio = async (req, res) => {
    try {
      const { userId, nuevaPassword } = req.body;

      if (!nuevaPassword || nuevaPassword.length < 6) {
        return res.status(400).json({ msg: "Contraseña inválida" });
      }

      const user = await User.findById(userId).select("+password");

      if (!user) {
        return res.status(404).json({ msg: "Usuario no encontrado" });
      }

      user.password = nuevaPassword;
      user.debeCambiarPassword = false;

      await user.save();

      // 🔎 Obtener empresa para auditoría
      let empresa = null;
      if (user.empresa) {
        empresa = await Empresa.findById(user.empresa);
      }

      await AuditLog.create({
        accion: "CAMBIO_PASSWORD",
        detalle: "El usuario cambió su contraseña obligatoria",
        severidad: "alta",

        usuario: {
          id: user._id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol
        },

        empresa: {
          id: empresa?._id || null,
          nombre: empresa?.nombre || "-"
        },

        ip: req.ip,
        userAgent: req.headers["user-agent"]
      });

      res.json({ msg: "Contraseña actualizada correctamente" });

    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error cambiando contraseña" });
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
      const empresaId =
  req.headers["x-empresa-activa"] || req.user.empresa;


      if (!empresaId) {
        return res.status(400).json({ msg: "Empresa no definida" });
      }

      const usuarios = await User.find({ empresa: empresaId })
        .select("-password")
        .sort({ createdAt: -1 });

      res.json(usuarios);

    } catch (err) {
      console.error("❌ Error listando usuarios:", err);
      res.status(500).json({ msg: "Error listando usuarios" });
    }
  };

// ==========================================================
// 🔄 ACTIVAR / DESACTIVAR USUARIO
// ==========================================================
exports.toggleUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== "boolean") {
      return res.status(400).json({ msg: "Estado inválido" });
    }

    const usuario = await User.findById(id);

    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    // 🔒 PROTECCIÓN SUPERADMIN
    if (usuario.rol === "superadmin") {
      return res.status(403).json({
        msg: "No se puede modificar este usuario"
      });
    }

    // 🔒 Evitar que un admin se desactive a sí mismo
    if (String(usuario._id) === String(req.user.id)) {
      return res.status(403).json({
        msg: "No puedes desactivarte a ti mismo"
      });
    }

    usuario.activo = activo;
    await usuario.save();

    // 📝 AUDITORÍA
    await AuditLog.create({
      accion: activo ? "USUARIO_ACTIVADO" : "USUARIO_DESACTIVADO",
      detalle: `Usuario ${usuario.email} ${activo ? "activado" : "desactivado"}`,
      severidad: "alta",

      usuario: {
        id: req.user.id,
        nombre: req.user.nombre,
        email: req.user.email,
        rol: req.user.rol
      },

      empresa: usuario.empresa
        ? {
            id: usuario.empresa,
            nombre: "-"
          }
        : null,

      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.json({
      msg: activo ? "Usuario activado correctamente" : "Usuario desactivado correctamente"
    });

  } catch (err) {
    console.error("❌ Error toggle usuario:", err);
    res.status(500).json({ msg: "Error actualizando usuario" });
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

  exports.resetPasswordAdmin = async (req, res) => {
    try {
      const { id } = req.params;
      const { nuevaPassword } = req.body;

      if (!nuevaPassword || nuevaPassword.length < 6) {
        return res.status(400).json({ mensaje: "Contraseña inválida" });
      }

      const user = await User.findById(id).select("+password");

      if (!user) {
        return res.status(404).json({ mensaje: "Usuario no encontrado" });
      }

      // 🔐 Asignar nueva contraseña
      user.password = nuevaPassword;

      // ⚠️ Forzar cambio al login
      user.debeCambiarPassword = true;

      await user.save(); // activa el pre("save")

      // 🔎 Obtener empresa (para auditoría)
      let empresa = null;
      if (user.empresa) {
        empresa = await Empresa.findById(user.empresa);
      }

      await AuditLog.create({
        accion: "RESET_PASSWORD",
        detalle: `Reset de contraseña al usuario ${user.email}`,
        severidad: "alta",

        usuario: {
          id: req.user.id,
          nombre: req.user.nombre,
          email: req.user.email,
          rol: req.user.rol
        },

        empresa: {
          id: empresa?._id || null,
          nombre: empresa?.nombre || "-"
        },

        ip: req.ip,
        userAgent: req.headers["user-agent"]
      });

      res.json({ mensaje: "Contraseña restablecida correctamente" });

    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: "Error del servidor" });
    }
  };
