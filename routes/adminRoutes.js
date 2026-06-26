const express = require("express");
const admin = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/login", admin.login);
router.post("/logout", requireAdmin, admin.logout);
router.get("/session", admin.session);

router.use(requireAdmin);

router.get("/dashboard", admin.dashboard);
router.get("/categorias", admin.categories);

router.get("/centros", admin.adminCentros);
router.post("/centros", admin.saveCentro);
router.put("/centros/:id", admin.updateCentro);
router.delete("/centros/:id", admin.deleteCentro);
router.post("/centros/:id/verificar", admin.verificarCentro);
router.post("/centros/:id/:action(suspender|cerrar)", admin.setCentroEstado);

router.get("/necesidades", admin.adminNecesidades);
router.post("/necesidades", admin.createNecesidad);
router.put("/necesidades/:id", admin.updateNecesidad);
router.delete("/necesidades/:id", admin.deleteNecesidad);
router.post("/necesidades/:id/:action(aprobar|pausar|completar)", admin.setNecesidadEstado);

module.exports = router;
