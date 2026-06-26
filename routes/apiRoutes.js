const express = require("express");
const centro = require("../controllers/centroController");
const necesidad = require("../controllers/necesidadController");

const router = express.Router();

router.get("/stats", necesidad.getStats);
router.get("/centros", centro.listCentros);
router.get("/centros/:id", centro.getCentro);
router.get("/necesidades", necesidad.listNecesidades);
router.get("/necesidades/:id", necesidad.getNecesidad);
router.post("/centros/proponer", centro.proposeCentro);
router.post("/reportes", centro.createReporte);
router.get("/actualizar-centro/:token", centro.getCentroByToken);
router.post("/actualizar-centro/:token", centro.updateCentroByToken);

module.exports = router;
