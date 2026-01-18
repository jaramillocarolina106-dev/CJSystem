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

  const rawIP =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.ip ||
    req.socket?.remoteAddress ||
    null;

  const ip = normalize(rawIP);

  return {
    ip,
    isPrivate: isPrivateIPv4(ip)
  };
};
