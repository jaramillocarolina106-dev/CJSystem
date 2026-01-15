// utils/getRealClientIP.js
module.exports = function getRealClientIP(req) {
  const xff = req.headers["x-forwarded-for"];

  const normalize = ip =>
    typeof ip === "string" && ip.startsWith("::ffff:")
      ? ip.replace("::ffff:", "")
      : ip;

  const isPrivateIPv4 = ip => {
    if (!ip) return true;
    if (ip.startsWith("10.")) return true;
    if (ip.startsWith("192.168.")) return true;
    if (ip === "127.0.0.1") return true;

    // 172.16.0.0 – 172.31.255.255
    const parts = ip.split(".");
    if (parts[0] === "172") {
      const second = Number(parts[1]);
      if (second >= 16 && second <= 31) return true;
    }

    return false;
  };

  if (xff) {
    const ips = xff
      .split(",")
      .map(ip => normalize(ip.trim()))
      .filter(ip => !isPrivateIPv4(ip) && ip !== "::1");

    if (ips.length > 0) {
      return ips[0]; 
    }
  }

  // Fallback
  const fallback = normalize(req.ip);
  return fallback || "—";
};
