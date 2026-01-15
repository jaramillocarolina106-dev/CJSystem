const geoip = require("geoip-lite");

module.exports = function getGeoFromIP(ip) {
  if (!ip) return null;

  // limpiar IPv6 mapeada
  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  const geo = geoip.lookup(ip);

  if (!geo) return null;

  return {
    pais: geo.country || null,
    region: geo.region || null,
    ciudad: geo.city || null,
    lat: geo.ll?.[0] || null,
    lon: geo.ll?.[1] || null,
    timezone: geo.timezone || null
  };
};
