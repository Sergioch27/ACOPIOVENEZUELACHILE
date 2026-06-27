const db = require("../config/database");

function listNecesidades(req, res) {
  const { categoria = "", prioridad = "", estado = "", centro = "", region = "" } = req.query;
  const values = [];
  const where = ["n.estado IN ('publicada','pendiente','pausada')"];

  if (categoria) {
    where.push("cat.nombre = ?");
    values.push(categoria);
  }
  if (prioridad) {
    where.push("n.prioridad = ?");
    values.push(prioridad);
  }
  if (estado) {
    where.push("n.estado = ?");
    values.push(estado);
  }
  if (centro) {
    where.push("c.id = ?");
    values.push(centro);
  }
  if (region) {
    where.push("c.region = ?");
    values.push(region);
  }

  const rows = db.prepare(`
    SELECT n.*, cat.nombre AS categoria_nombre,
      GROUP_CONCAT(DISTINCT c.nombre) AS centros_nombres,
      GROUP_CONCAT(DISTINCT c.region) AS regiones,
      MAX(0, n.cantidad_objetivo - n.cantidad_recibida) AS cantidad_faltante,
      MIN(100, ROUND((n.cantidad_recibida * 100.0) / NULLIF(n.cantidad_objetivo, 0), 1)) AS porcentaje
    FROM necesidades n
    JOIN categorias cat ON cat.id = n.categoria_id
    LEFT JOIN centro_necesidades cn ON cn.necesidad_id = n.id
    LEFT JOIN centros c ON c.id = cn.centro_id
    WHERE ${where.join(" AND ")}
    GROUP BY n.id
    ORDER BY n.prioridad = 'urgente' DESC, n.fecha_limite ASC
  `).all(...values);
  res.json(rows);
}

function getFilterOptions(req, res) {
  const categorias = db.prepare(`
    SELECT nombre
    FROM categorias
    ORDER BY nombre
  `).all();

  const regiones = db.prepare(`
    SELECT DISTINCT c.region
    FROM centros c
    JOIN centro_necesidades cn ON cn.centro_id = c.id
    JOIN necesidades n ON n.id = cn.necesidad_id
    WHERE c.region IS NOT NULL
      AND TRIM(c.region) <> ''
      AND n.estado IN ('publicada','pendiente','pausada')
    ORDER BY c.region
  `).all().map((row) => row.region);

  res.json({ categorias, regiones });
}

function getNecesidad(req, res) {
  const row = db.prepare(`
    SELECT n.*, cat.nombre AS categoria_nombre,
      MAX(0, n.cantidad_objetivo - n.cantidad_recibida) AS cantidad_faltante,
      MIN(100, ROUND((n.cantidad_recibida * 100.0) / NULLIF(n.cantidad_objetivo, 0), 1)) AS porcentaje
    FROM necesidades n
    JOIN categorias cat ON cat.id = n.categoria_id
    WHERE n.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Necesidad no encontrada." });
  row.centros = db.prepare(`
    SELECT c.id, c.nombre, c.region, c.comuna, c.direccion
    FROM centro_necesidades cn
    JOIN centros c ON c.id = cn.centro_id
    WHERE cn.necesidad_id = ?
  `).all(req.params.id);
  res.json(row);
}

function getStats(req, res) {
  const stats = {
    centros_verificados: db.prepare("SELECT COUNT(*) AS total FROM centros WHERE estado = 'verificado'").get().total,
    necesidades_urgentes: db.prepare("SELECT COUNT(*) AS total FROM necesidades WHERE prioridad = 'urgente' AND estado = 'publicada'").get().total,
    campanas_activas: db.prepare("SELECT COUNT(*) AS total FROM necesidades WHERE estado = 'publicada'").get().total,
    ultima_actualizacion: db.prepare("SELECT MAX(ultima_actualizacion) AS fecha FROM centros").get().fecha
  };
  res.json(stats);
}

module.exports = { listNecesidades, getFilterOptions, getNecesidad, getStats };
