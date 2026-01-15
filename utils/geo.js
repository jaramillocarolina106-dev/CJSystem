const geoip = require("geoip-lite");

module.exports = function getGeoFromIP(ip) {
  if (!ip) return null;

  // limpiar IPv6 mapeada
  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  // ❌ IPv6 puro (geoip-lite no lo soporta)
  if (ip.includes(":")) {
    return null;
  }

  // ❌ IPs privadas
  const isPrivateIPv4 = ip => {
    if (ip.startsWith("10.")) return true;
    if (ip.startsWith("192.168.")) return true;
    if (ip === "127.0.0.1") return true;

    const parts = ip.split(".");
    if (parts[0] === "172") {
      const second = Number(parts[1]);
      if (second >= 16 && second <= 31) return true;
    }

    return false;
  };

  if (isPrivateIPv4(ip)) {
    return null;
  }

  const geo = geoip.lookup(ip);

  if (!geo) return null;

  return {
    pais: geo.country || null,
    region: geo.region || null,
    ciudad: geo.city || null,
    lat: geo.ll?.[0] ?? null,
    lon: geo.ll?.[1] ?? null,
    timezone: geo.timezone || null,
    fuente: "geoip-lite"
  };
};
