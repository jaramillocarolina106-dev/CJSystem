const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

webpush.setVapidDetails(
  "https://cjsystemhelpdesk.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);


exports.enviarPushUsuario = async (usuarioId, payload) => {
  const subs = await PushSubscription.find({
    usuario: usuarioId,
    activo: true
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys
        },
        JSON.stringify(payload)
      );
    } catch (err) {
      // 🔥 si la suscripción murió, la desactivamos
      if (err.statusCode === 410 || err.statusCode === 404) {
        sub.activo = false;
        await sub.save();
      } else {
        console.error("❌ Push error:", err.message);
      }
    }
  }
};
