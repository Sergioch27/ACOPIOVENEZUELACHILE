const bcrypt = require("bcrypt");
const db = require("../config/database");
const { required } = require("./centroController");

function cleanUser(user) {
  if (!user) return null;
  return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
}

function login(req, res) {
  required(req.body, ["email", "password"]);
  const user = db.prepare("SELECT * FROM usuarios WHERE email = ? AND activo = 1").get(req.body.email);
  if (!user || !bcrypt.compareSync(req.body.password, user.password_hash)) {
    return res.status(401).json({ error: "Credenciales incorrectas." });
  }
  req.session.user = cleanUser(user);
  res.json({ user: req.session.user });
}

function logout(req, res) {
  req.session.destroy(() => res.json({ message: "Sesion cerrada." }));
}

function session(req, res) {
  res.json({ user: req.session.user || null });
}

function dashboard(req, res) {
  const cards = {
    centros_pendientes: db.prepare("SELECT COUNT(*) total FROM centros WHERE estado = 'pendiente'").get().total,
    necesidades_por_verificar: db.prepare("SELECT COUNT(*) total FROM necesidades WHERE estado = 'pendiente' OR verificada = 0").get().total,
    centros_activos: db.prepare("SELECT COUNT(*) total FROM centros WHERE estado IN ('verificado','requiere_actualizacion')").get().total,
    centros_sin_actualizacion: db.prepare("SELECT COUNT(*) total FROM centros WHERE date(ultima_actualizacion) < date('now','-14 day')").get().total
  };
  const centrosPendientes = db.prepare("SELECT id, nombre, comuna, responsable_nombre, estado, ultima_actualizacion FROM centros WHERE estado = 'pendiente' ORDER BY created_at DESC LIMIT 8").all();
  const necesidadesPendientes = db.prepare(`
    SELECT n.id, n.nombre, n.prioridad, n.cantidad_objetivo, n.cantidad_recibida, GROUP_CONCAT(c.nombre, ', ') AS centro
    FROM necesidades n
    LEFT JOIN centro_necesidades cn ON cn.necesidad_id = n.id
    LEFT JOIN centros c ON c.id = cn.centro_id
    WHERE n.estado = 'pendiente' OR n.verificada = 0
    GROUP BY n.id
    LIMIT 8
  `).all();
  const actividad = db.prepare("SELECT * FROM historial ORDER BY created_at DESC LIMIT 10").all();
  res.json({ cards, centrosPendientes, necesidadesPendientes, actividad });
}

function adminCentros(req, res) {
  const q = req.query.q || "";
  const rows = db.prepare(`
    SELECT c.*, o.nombre AS organizacion_nombre
    FROM centros c
    LEFT JOIN organizaciones o ON o.id = c.organizacion_id
    WHERE c.nombre LIKE ? OR c.comuna LIKE ? OR c.estado LIKE ?
    ORDER BY c.updated_at DESC
  `).all(`%${q}%`, `%${q}%`, `%${q}%`);
  res.json(rows);
}

function saveCentro(req, res) {
  required(req.body, ["nombre", "responsable_nombre", "telefono", "email", "region", "comuna", "direccion", "horario", "estado"]);
  const orgName = req.body.organizacion || req.body.organizacion_nombre || "Organizacion pendiente";
  const org = db.prepare("INSERT INTO organizaciones (nombre, telefono, email, estado_verificacion) VALUES (?, ?, ?, 'pendiente')")
    .run(orgName, req.body.telefono, req.body.email);
  const token = require("crypto").randomBytes(24).toString("hex");
  const result = db.prepare(`
    INSERT INTO centros (
      organizacion_id, nombre, responsable_nombre, telefono, email, region, comuna, direccion,
      referencia, horario, fecha_inicio, fecha_cierre, proxima_fecha_despacho, productos_recibidos,
      productos_no_recibidos, destino_donaciones, observaciones, estado, token_actualizacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    org.lastInsertRowid, req.body.nombre, req.body.responsable_nombre, req.body.telefono,
    req.body.email, req.body.region, req.body.comuna, req.body.direccion, req.body.referencia || "",
    req.body.horario, req.body.fecha_inicio || null, req.body.fecha_cierre || null,
    req.body.proxima_fecha_despacho || null, req.body.productos_recibidos || "",
    req.body.productos_no_recibidos || "", req.body.destino_donaciones || "", req.body.observaciones || "",
    req.body.estado, token
  );
  db.prepare("INSERT INTO historial (usuario_id, entidad, entidad_id, accion, descripcion) VALUES (?, 'centro', ?, 'creado', ?)")
    .run(req.session.user.id, result.lastInsertRowid, "Centro creado desde administracion.");
  res.status(201).json({ id: result.lastInsertRowid });
}

function updateCentro(req, res) {
  required(req.body, ["nombre", "responsable_nombre", "telefono", "email", "region", "comuna", "direccion", "horario", "estado"]);
  db.prepare(`
    UPDATE centros SET nombre=?, responsable_nombre=?, telefono=?, email=?, region=?, comuna=?, direccion=?,
      referencia=?, horario=?, fecha_inicio=?, fecha_cierre=?, proxima_fecha_despacho=?,
      productos_recibidos=?, productos_no_recibidos=?, destino_donaciones=?, observaciones=?, estado=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    req.body.nombre, req.body.responsable_nombre, req.body.telefono, req.body.email,
    req.body.region, req.body.comuna, req.body.direccion, req.body.referencia || "", req.body.horario,
    req.body.fecha_inicio || null, req.body.fecha_cierre || null, req.body.proxima_fecha_despacho || null,
    req.body.productos_recibidos || "", req.body.productos_no_recibidos || "", req.body.destino_donaciones || "",
    req.body.observaciones || "", req.body.estado, req.params.id
  );
  db.prepare("INSERT INTO historial (usuario_id, entidad, entidad_id, accion, descripcion) VALUES (?, 'centro', ?, 'editado', ?)")
    .run(req.session.user.id, req.params.id, "Centro editado.");
  res.json({ message: "Centro actualizado." });
}

function deleteCentro(req, res) {
  const related = db.prepare("SELECT COUNT(*) total FROM centro_necesidades WHERE centro_id = ?").get(req.params.id).total;
  if (related) return res.status(409).json({ error: "No se puede eliminar un centro con necesidades asociadas." });
  db.prepare("DELETE FROM centros WHERE id = ?").run(req.params.id);
  res.json({ message: "Centro eliminado." });
}

function setCentroEstado(req, res) {
  const allowed = { suspender: "suspendido", cerrar: "cerrado" };
  const estado = allowed[req.params.action];
  if (!estado) return res.status(400).json({ error: "Accion no valida." });
  db.prepare("UPDATE centros SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(estado, req.params.id);
  db.prepare("INSERT INTO historial (usuario_id, entidad, entidad_id, accion, descripcion) VALUES (?, 'centro', ?, ?, ?)")
    .run(req.session.user.id, req.params.id, estado, `Centro marcado como ${estado}.`);
  res.json({ message: `Centro ${estado}.` });
}

function verificarCentro(req, res) {
  const checks = ["contacto_confirmado", "direccion_confirmada", "centro_activo", "horario_confirmado", "productos_confirmados", "destino_confirmado", "organizacion_confirmada"];
  const resultado = req.body.resultado || "aprobado";
  const estado = resultado === "aprobado" ? "verificado" : resultado === "rechazado" ? "rechazado" : "requiere_actualizacion";
  const values = checks.map((key) => (req.body[key] ? 1 : 0));
  db.prepare(`
    INSERT INTO verificaciones (
      centro_id, usuario_id, contacto_confirmado, direccion_confirmada, centro_activo,
      horario_confirmado, productos_confirmados, destino_confirmado, organizacion_confirmada,
      resultado, comentario
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, req.session.user.id, ...values, resultado, req.body.comentario || "");
  db.prepare("UPDATE centros SET estado = ?, fecha_verificacion = CURRENT_TIMESTAMP, verificado_por = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(estado, req.session.user.id, req.params.id);
  db.prepare("INSERT INTO historial (usuario_id, entidad, entidad_id, accion, descripcion) VALUES (?, 'centro', ?, 'verificacion', ?)")
    .run(req.session.user.id, req.params.id, `Resultado: ${resultado}`);
  res.json({ message: "Verificacion registrada." });
}

function adminNecesidades(req, res) {
  const rows = db.prepare(`
    SELECT n.*, cat.nombre AS categoria_nombre,
      GROUP_CONCAT(c.id) AS centro_ids,
      GROUP_CONCAT(c.nombre, ', ') AS centros_nombres,
      MAX(0, n.cantidad_objetivo - n.cantidad_recibida) AS cantidad_faltante,
      MIN(100, ROUND((n.cantidad_recibida * 100.0) / NULLIF(n.cantidad_objetivo, 0), 1)) AS porcentaje
    FROM necesidades n
    JOIN categorias cat ON cat.id = n.categoria_id
    LEFT JOIN centro_necesidades cn ON cn.necesidad_id = n.id
    LEFT JOIN centros c ON c.id = cn.centro_id
    GROUP BY n.id
    ORDER BY n.updated_at DESC
  `).all();
  res.json(rows);
}

function categories(req, res) {
  res.json(db.prepare("SELECT * FROM categorias ORDER BY nombre").all());
}

function adminOrganizaciones(req, res) {
  res.json(db.prepare("SELECT * FROM organizaciones ORDER BY nombre").all());
}

function saveOrganizacion(req, res) {
  required(req.body, ["nombre"]);
  const id = req.body.id;
  if (id) {
    db.prepare(`
      UPDATE organizaciones
      SET nombre=?, telefono=?, email=?, sitio_web=?, estado_verificacion=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      req.body.nombre,
      req.body.telefono || "",
      req.body.email || "",
      req.body.sitio_web || "",
      req.body.estado_verificacion || "pendiente",
      id
    );
    return res.json({ message: "Organizacion actualizada." });
  }
  const result = db.prepare(`
    INSERT INTO organizaciones (nombre, telefono, email, sitio_web, estado_verificacion)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    req.body.nombre,
    req.body.telefono || "",
    req.body.email || "",
    req.body.sitio_web || "",
    req.body.estado_verificacion || "pendiente"
  );
  res.status(201).json({ id: result.lastInsertRowid });
}

function adminProductos(req, res) {
  res.json(db.prepare("SELECT * FROM productos_catalogo ORDER BY orden, nombre").all());
}

function saveProducto(req, res) {
  required(req.body, ["nombre"]);
  const id = req.body.id;
  if (id) {
    db.prepare(`
      UPDATE productos_catalogo
      SET nombre=?, activo=?, orden=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(req.body.nombre, req.body.activo ? 1 : 0, Number(req.body.orden || 0), id);
    return res.json({ message: "Producto actualizado." });
  }
  const result = db.prepare(`
    INSERT INTO productos_catalogo (nombre, activo, orden)
    VALUES (?, ?, ?)
  `).run(req.body.nombre, req.body.activo ? 1 : 0, Number(req.body.orden || 0));
  res.status(201).json({ id: result.lastInsertRowid });
}

function saveNeedAssociations(necesidadId, centroIds) {
  db.prepare("DELETE FROM centro_necesidades WHERE necesidad_id = ?").run(necesidadId);
  const insert = db.prepare("INSERT OR IGNORE INTO centro_necesidades (centro_id, necesidad_id) VALUES (?, ?)");
  (centroIds || []).filter(Boolean).forEach((id) => insert.run(id, necesidadId));
}

function necesidadPayload(body) {
  required(body, ["nombre", "categoria_id", "prioridad", "cantidad_objetivo", "unidad", "estado"]);
  const objetivo = Math.max(0, Number(body.cantidad_objetivo || 0));
  const recibida = Math.min(objetivo, Math.max(0, Number(body.cantidad_recibida || 0)));
  return [
    body.nombre, body.categoria_id, body.descripcion || "", body.prioridad, objetivo, recibida,
    body.unidad, body.fecha_limite || null, body.destino || "", body.solicitante || "",
    body.fuente || "", body.estado, body.verificada ? 1 : 0
  ];
}

function createNecesidad(req, res) {
  const result = db.prepare(`
    INSERT INTO necesidades (nombre, categoria_id, descripcion, prioridad, cantidad_objetivo, cantidad_recibida, unidad, fecha_limite, destino, solicitante, fuente, estado, verificada)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(...necesidadPayload(req.body));
  saveNeedAssociations(result.lastInsertRowid, req.body.centro_ids);
  res.status(201).json({ id: result.lastInsertRowid });
}

function updateNecesidad(req, res) {
  db.prepare(`
    UPDATE necesidades SET nombre=?, categoria_id=?, descripcion=?, prioridad=?, cantidad_objetivo=?, cantidad_recibida=?,
      unidad=?, fecha_limite=?, destino=?, solicitante=?, fuente=?, estado=?, verificada=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(...necesidadPayload(req.body), req.params.id);
  saveNeedAssociations(req.params.id, req.body.centro_ids);
  res.json({ message: "Necesidad actualizada." });
}

function deleteNecesidad(req, res) {
  db.prepare("DELETE FROM necesidades WHERE id = ?").run(req.params.id);
  res.json({ message: "Necesidad eliminada." });
}

function setNecesidadEstado(req, res) {
  const map = { aprobar: ["publicada", 1], pausar: ["pausada", 1], completar: ["completada", 1] };
  const change = map[req.params.action];
  if (!change) return res.status(400).json({ error: "Accion no valida." });
  db.prepare("UPDATE necesidades SET estado = ?, verificada = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(change[0], change[1], req.params.id);
  res.json({ message: "Necesidad actualizada." });
}

module.exports = {
  login, logout, session, dashboard, adminCentros, saveCentro, updateCentro, deleteCentro,
  setCentroEstado, verificarCentro, adminNecesidades, categories, createNecesidad,
  updateNecesidad, deleteNecesidad, setNecesidadEstado, adminOrganizaciones,
  saveOrganizacion, adminProductos, saveProducto
};
