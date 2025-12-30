router.get("/", verifyToken, async (req, res) => {
  try {
    let empresaId = req.user.empresa;

    // 🔥 SUPERADMIN IMPERSONANDO
    if (req.user.rol === "superadmin" && req.cookies.empresaActiva) {
      empresaId = req.cookies.empresaActiva;
    }

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
});
