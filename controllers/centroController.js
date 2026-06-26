const crypto = require("crypto");
const db = require("../config/database");

const publicCenterFields = `
  c.*, o.nombre AS organizacion_nombre,
  (SELECT GROUP_CONCAT(n.nombre, ', ')
   FROM centro_necesidades cn
   JOIN necesidades n ON n.id = cn.necesidad_id
   WHERE cn.centro_id = c.id) AS necesidades_nombres
`;

function required(body, fields) {
  const missing = fields.filter((field) => !String(body[field] || "").trim());
  if (missing.length) {
    const err = new Error(`Faltan campos obligatorios: ${missing.join(", ")}`);
    err.status = 400;
    throw err;
  }
}

function listCentros(req, res) {
  const { q = "", region = "", comuna = "", estado = "", producto = "" } = req.query;
  const values = [];
  const where = ["c.estado IN ('verificado','requiere_actualizacion')"];

  if (q) {
    where.push("(c.nombre LIKE ? OR c.comuna LIKE ? OR c.region LIKE ? OR o.nombre LIKE ?)");
    values.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (region) {
    where.push("c.region = ?");
    values.push(region);
  }
  if (comuna) {
    where.push("c.comuna = ?");
    values.push(comuna);
  }
  if (estado) {
    where.push("c.estado = ?");
    values.push(estado);
  }
  if (producto) {
    where.push("c.productos_recibidos LIKE ?");
    values.push(`%${producto}%`);
  }

  const rows = db.prepare(`
    SELECT ${publicCenterFields}
    FROM centros c
    LEFT JOIN organizaciones o ON o.id = c.organizacion_id
    WHERE ${where.join(" AND ")}
    ORDER BY c.estado = 'verificado' DESC, c.ultima_actualizacion DESC
  `).all(...values);

  res.json(rows);
}

function getCentro(req, res) {
  const centro = db.prepare(`
    SELECT ${publicCenterFields}
    FROM centros c
    LEFT JOIN organizaciones o ON o.id = c.organizacion_id
    WHERE c.id = ? AND c.estado IN ('verificado','requiere_actualizacion','pendiente')
  `).get(req.params.id);

  if (!centro) return res.status(404).json({ error: "Centro no encontrado." });

  const necesidades = db.prepare(`
    SELECT n.*, cat.nombre AS categoria_nombre,
      MAX(0, n.cantidad_objetivo - n.cantidad_recibida) AS cantidad_faltante,
      MIN(100, ROUND((n.cantidad_recibida * 100.0) / NULLIF(n.cantidad_objetivo, 0), 1)) AS porcentaje
    FROM centro_necesidades cn
    JOIN necesidades n ON n.id = cn.necesidad_id
    JOIN categorias cat ON cat.id = n.categoria_id
    WHERE cn.centro_id = ? AND n.estado IN ('publicada','pendiente')
    ORDER BY n.prioridad = 'urgente' DESC, n.fecha_limite ASC
  `).all(req.params.id);

  res.json({ ...centro, necesidades });
}

function proposeCentro(req, res) {
  required(req.body, [
    "nombre", "organizacion", "responsable_nombre", "telefono", "email",
    "region", "comuna", "direccion", "horario"
  ]);

  const insertOrg = db.prepare(`
    INSERT INTO organizaciones (nombre, telefono, email, estado_verificacion)
    VALUES (?, ?, ?, 'pendiente')
  `);
  const insertCentro = db.prepare(`
    INSERT INTO centros (
      organizacion_id, nombre, responsable_nombre, telefono, email, region, comuna,
      direccion, referencia, horario, fecha_inicio, fecha_cierre, proxima_fecha_despacho,
      productos_recibidos, productos_no_recibidos, destino_donaciones, observaciones,
      estado, token_actualizacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)
  `);

  const tx = db.transaction(() => {
    const org = insertOrg.run(req.body.organizacion, req.body.telefono, req.body.email);
    const token = crypto.randomBytes(24).toString("hex");
    const centro = insertCentro.run(
      org.lastInsertRowid,
      req.body.nombre,
      req.body.responsable_nombre,
      req.body.telefono,
      req.body.email,
      req.body.region,
      req.body.comuna,
      req.body.direccion,
      req.body.referencia || "",
      req.body.horario,
      req.body.fecha_inicio || null,
      req.body.fecha_cierre || null,
      req.body.proxima_fecha_despacho || null,
      req.body.productos_recibidos || "",
      req.body.productos_no_recibidos || "",
      req.body.destino_donaciones || "",
      req.body.observaciones || "",
      token
    );
    db.prepare("INSERT INTO historial (entidad, entidad_id, accion, descripcion) VALUES ('centro', ?, 'propuesto', ?)")
      .run(centro.lastInsertRowid, "Centro propuesto desde formulario publico.");
    return centro.lastInsertRowid;
  });

  res.status(201).json({ message: "Centro enviado para revision.", id: tx() });
}

function getCentroByToken(req, res) {
  const centro = db.prepare("SELECT id, nombre, estado, ultima_actualizacion, horario, observaciones FROM centros WHERE token_actualizacion = ?")
    .get(req.params.token);
  if (!centro) return res.status(404).json({ error: "Token no valido." });

  const necesidades = db.prepare(`
    SELECT n.id, n.nombre, n.unidad, n.cantidad_objetivo, n.cantidad_recibida,
      MAX(0, n.cantidad_objetivo - n.cantidad_recibida) AS cantidad_faltante
    FROM centro_necesidades cn
    JOIN necesidades n ON n.id = cn.necesidad_id
    WHERE cn.centro_id = ? AND n.estado = 'publicada'
  `).all(centro.id);

  res.json({ ...centro, necesidades });
}

function updateCentroByToken(req, res) {
  const centro = db.prepare("SELECT * FROM centros WHERE token_actualizacion = ?").get(req.params.token);
  if (!centro) return res.status(404).json({ error: "Token no valido." });

  const updates = Array.isArray(req.body.actualizaciones) ? req.body.actualizaciones : [];
  const observaciones = req.body.observaciones || "";
  const nuevoHorario = req.body.horario || centro.horario;
  const sigueFuncionando = req.body.sigue_funcionando !== "no";

  const tx = db.transaction(() => {
    updates.forEach((item) => {
      const cantidad = Math.max(0, Number(item.cantidad || 0));
      if (!cantidad) return;
      db.prepare(`
        UPDATE necesidades
        SET cantidad_recibida = MIN(cantidad_objetivo, cantidad_recibida + ?), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(cantidad, item.necesidad_id);
      db.prepare("INSERT INTO actualizaciones (centro_id, necesidad_id, cantidad_agregada, observaciones) VALUES (?, ?, ?, ?)")
        .run(centro.id, item.necesidad_id, cantidad, observaciones);
    });

    db.prepare(`
      UPDATE centros
      SET estado = ?, horario = ?, observaciones = ?, ultima_actualizacion = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(sigueFuncionando ? centro.estado : "requiere_actualizacion", nuevoHorario, observaciones, centro.id);

    db.prepare("INSERT INTO historial (entidad, entidad_id, accion, descripcion) VALUES ('centro', ?, 'actualizacion_token', ?)")
      .run(centro.id, "Actualizacion rapida enviada por el centro.");
  });

  tx();
  res.json({ message: "Actualizacion guardada." });
}

function createReporte(req, res) {
  required(req.body, ["centro_id", "motivo", "descripcion"]);
  db.prepare(`
    INSERT INTO reportes (centro_id, nombre_reportante, email_reportante, motivo, descripcion)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    req.body.centro_id,
    req.body.nombre_reportante || "",
    req.body.email_reportante || "",
    req.body.motivo,
    req.body.descripcion
  );
  res.status(201).json({ message: "Reporte recibido." });
}

module.exports = {
  listCentros,
  getCentro,
  proposeCentro,
  getCentroByToken,
  updateCentroByToken,
  createReporte,
  required
};
