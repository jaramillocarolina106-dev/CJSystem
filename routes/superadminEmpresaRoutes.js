const uploadBranding = require("../middlewares/uploadBranding");
const { subirLogoEmpresa } = require("../controllers/brandingController");

router.put(
  "/empresas/:id/branding/logo",
  verifyToken,
  onlySuperadmin,
  uploadBranding.single("logo"),
  subirLogoEmpresa
);
