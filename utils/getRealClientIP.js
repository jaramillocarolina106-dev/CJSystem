module.exports = function getRealClientIP(req) {
  const normalize = ip =>
    typeof ip === "string" && ip.startsWith("::ffff:")
      ? ip.replace("::ffff:", "")
      : ip;

  const isPrivateIPv4 = ip => {
    if (!ip) return true;
    if (ip === "::1") return true;
    if (ip === "127.0.0.1") return true;
    if (ip.startsWith("10.")) return true;
    if (ip.startsWith("192.168.")) return true;

    const parts = ip.split(".");
    if (parts[0] === "172") {
      const second = Number(parts[1]);
      if (second >= 16 && second <= 31) return true;
    }
    return false;
  };

  /* =================================================
     🔥 1️⃣ CLOUDFARE (PRIORIDAD MÁXIMA)
  ================================================= */
  const cfIp = req.headers["cf-connecting-ip"];
  if (cfIp && !isPrivateIPv4(cfIp)) {
    return normalize(cfIp);
  }

  /* =================================================
     🔥 2️⃣ PROXY ESTÁNDAR
  ================================================= */
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    const ips = xff
      .split(",")
      .map(ip => normalize(ip.trim()))
      .filter(ip => !isPrivateIPv4(ip));

    if (ips.length > 0) {
      return ips[0];
    }
  }

  /* =================================================
     🔁 3️⃣ FALLBACK DIRECTO
  ================================================= */
  const fallback = normalize(req.ip);
  if (!isPrivateIPv4(fallback)) {
    return fallback;
  }

  return null;
};
