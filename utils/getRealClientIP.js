// utils/getRealClientIP.js
module.exports = function getRealClientIP(req) {
  const xff = req.headers["x-forwarded-for"];

  if (xff) {
    const ips = xff
      .split(",")
      .map(ip => ip.trim())
      .filter(ip =>
        // ❌ descartar IPs privadas / internas
        !ip.startsWith("10.") &&
        !ip.startsWith("192.168.") &&
        !ip.startsWith("172.") &&
        ip !== "127.0.0.1" &&
        ip !== "::1"
      );

    if (ips.length > 0) {
      return ips[0]; // 👈 IP pública REAL
    }
  }

  return req.ip;
};
