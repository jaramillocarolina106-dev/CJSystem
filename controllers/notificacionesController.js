const PushSubscription = require("../models/PushSubscription");

/**
 * 🔔 Guardar / reactivar suscripción push
 */
exports.suscribir = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ msg: "Suscripción inválida" });
    }

    let sub = await PushSubscription.findOne({ endpoint });

    if (sub) {
      sub.activo = true;
      sub.usuario = req.user.id;
      await sub.save();
    } else {
      await PushSubscription.create({
        usuario: req.user.id,
        endpoint,
        keys,
        navegador: req.headers["user-agent"]
      });
    }

    res.json({ ok: true });

  } catch (err) {
    console.error("❌ Error suscribiendo push:", err);
    res.status(500).json({ msg: "Error guardando suscripción" });
  }
};
