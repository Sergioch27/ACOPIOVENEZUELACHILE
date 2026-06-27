require("dotenv").config();

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const db = require("../config/database");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

const adminEmail = process.env.ADMIN_EMAIL || "admin@puentesolidario.cl";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const passwordHash = bcrypt.hashSync(adminPassword, 10);

const user = db.prepare(`
  INSERT INTO usuarios (nombre, email, password_hash, rol)
  VALUES ('Administrador Puente Solidario', ?, ?, 'admin')
`).run(adminEmail, passwordHash);

const categorias = [
  ["Alimentos", "package"],
  ["Agua", "droplet"],
  ["Higiene", "sparkles"],
  ["PaÃ±ales", "heart"],
  ["Insumos mÃ©dicos", "cross"],
  ["Ropa", "shirt"],
  ["Mascotas", "paw"]
];
const catInsert = db.prepare("INSERT INTO categorias (nombre, icono) VALUES (?, ?)");
categorias.forEach((cat) => catInsert.run(...cat));

const productInsert = db.prepare("INSERT INTO productos_catalogo (nombre, activo, orden) VALUES (?, 1, ?)");
[
  "Agua embotellada",
  "Alimentos no perecibles",
  "Pañales infantiles",
  "Kits de higiene",
  "Insumos medicos basicos",
  "Ropa nueva",
  "Alimento para mascotas"
].forEach((name, index) => productInsert.run(name, index + 1));

const orgInsert = db.prepare(`
  INSERT INTO organizaciones (nombre, rut, telefono, email, sitio_web, estado_verificacion)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const orgs = [
  orgInsert.run("Fundacion Abrazo Migrante", "76.000.001-1", "+56 9 1111 1111", "contacto@abrazomigrante.cl", "https://puentesolidario.cl", "verificada").lastInsertRowid,
  orgInsert.run("Red Solidaria Norte", "76.000.002-2", "+56 9 2222 2222", "norte@puentesolidario.cl", "", "verificada").lastInsertRowid,
  orgInsert.run("Comunidad Solidaria Sur", "76.000.003-3", "+56 9 3333 3333", "sur@puentesolidario.cl", "", "pendiente").lastInsertRowid
];

const centroInsert = db.prepare(`
  INSERT INTO centros (
    organizacion_id, nombre, responsable_nombre, telefono, email, region, comuna, direccion,
    referencia, horario, fecha_inicio, fecha_cierre, proxima_fecha_despacho,
    productos_recibidos, productos_no_recibidos, destino_donaciones, observaciones,
    estado, token_actualizacion, ultima_actualizacion, fecha_verificacion, verificado_por
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?), ?)
`);

const centers = [
  centroInsert.run(orgs[0], "Centro Santiago Centro", "Ana Morales", "+56 9 4100 0001", "santiago@puentesolidario.cl", "Region Metropolitana", "Santiago", "Av. Libertador Bernardo O'Higgins 1234", "Entrada por calle lateral", "Lun a vie, 10:00 a 18:00", "2026-06-01", "2026-08-30", "2026-07-05", "Alimentos no perecibles, agua, higiene, paÃ±ales", "Medicamentos vencidos, ropa en mal estado", "Caracas y Valencia", "Centro verificado por el equipo de coordinacion.", "verificado", "token-santiago", "-1 day", "-10 day", user.lastInsertRowid).lastInsertRowid,
  centroInsert.run(orgs[0], "Punto Solidario Maipu", "Carlos Rivas", "+56 9 4100 0002", "maipu@puentesolidario.cl", "Region Metropolitana", "Maipu", "Av. Pajaritos 4500", "Frente a plaza comunal", "Mar a sab, 09:00 a 15:00", "2026-06-05", "2026-08-15", "2026-07-12", "Agua, alimentos, kits de higiene", "Vidrio, perecibles", "Maracay", "Centro verificado por el equipo de coordinacion.", "verificado", "token-maipu", "-3 day", "-9 day", user.lastInsertRowid).lastInsertRowid,
  centroInsert.run(orgs[1], "Acopio Antofagasta", "Maria Salazar", "+56 9 4100 0003", "antofagasta@puentesolidario.cl", "Antofagasta", "Antofagasta", "Prat 890", "Bodega 2", "Lun a vie, 11:00 a 17:00", "2026-06-10", "2026-09-01", "2026-07-18", "Agua, insumos medicos, alimentos", "Ropa usada sin clasificar", "Zulia", "Centro verificado por el equipo de coordinacion.", "verificado", "token-antofagasta", "-15 day", "-8 day", user.lastInsertRowid).lastInsertRowid,
  centroInsert.run(orgs[1], "Ruta Solidaria Valparaiso", "Jose Pinto", "+56 9 4100 0004", "valpo@puentesolidario.cl", "Valparaiso", "Valparaiso", "Cochrane 220", "Local comunitario", "Sab y dom, 10:00 a 14:00", "2026-06-12", "2026-08-20", "2026-07-20", "PaÃ±ales, ropa nueva, higiene", "Dinero en efectivo", "Barquisimeto", "Centro verificado por el equipo de coordinacion.", "verificado", "token-valparaiso", "-2 day", "-7 day", user.lastInsertRowid).lastInsertRowid,
  centroInsert.run(orgs[2], "Centro Pendiente Concepcion", "Luisa Herrera", "+56 9 4100 0005", "concepcion@puentesolidario.cl", "Biobio", "Concepcion", "O'Higgins 600", "Segundo piso", "Lun y jue, 16:00 a 20:00", "2026-06-20", "2026-08-10", "2026-07-25", "Alimentos, mascotas, higiene", "Medicamentos controlados", "Puerto Ordaz", "Pendiente de verificacion.", "pendiente", "token-concepcion", "-4 day", "-4 day", null).lastInsertRowid
];

const needInsert = db.prepare(`
  INSERT INTO necesidades (
    nombre, categoria_id, descripcion, prioridad, cantidad_objetivo, cantidad_recibida,
    unidad, fecha_limite, destino, solicitante, fuente, estado, verificada
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const needs = [
  needInsert.run("Agua embotellada", 2, "Botellas selladas de 1 a 6 litros.", "urgente", 1200, 430, "litros", "2026-07-15", "Caracas", "Equipo logistico", "Levantamiento comunitario", "publicada", 1).lastInsertRowid,
  needInsert.run("Alimentos no perecibles", 1, "Arroz, pasta, legumbres y enlatados.", "alta", 900, 510, "kg", "2026-07-20", "Valencia", "Red solidaria", "Levantamiento comunitario", "publicada", 1).lastInsertRowid,
  needInsert.run("Kits de higiene familiar", 3, "Jabon, pasta dental, toallas sanitarias y shampoo.", "urgente", 450, 120, "kits", "2026-07-10", "Maracay", "Fundacion Abrazo Migrante", "Levantamiento comunitario", "publicada", 1).lastInsertRowid,
  needInsert.run("PaÃ±ales infantiles", 4, "Tallas M, G y XG en paquetes sellados.", "alta", 600, 260, "paquetes", "2026-07-18", "Barquisimeto", "Comunidad solidaria", "Levantamiento comunitario", "publicada", 1).lastInsertRowid,
  needInsert.run("Insumos medicos basicos", 5, "Guantes, gasas, alcohol y mascarillas.", "media", 300, 80, "kits", "2026-08-01", "Zulia", "Equipo de salud", "Levantamiento comunitario", "pendiente", 0).lastInsertRowid,
  needInsert.run("Alimento para mascotas", 7, "Sacos cerrados para perros y gatos.", "baja", 250, 40, "kg", "2026-08-05", "Puerto Ordaz", "Voluntarios", "Levantamiento comunitario", "publicada", 1).lastInsertRowid
];

const link = db.prepare("INSERT INTO centro_necesidades (centro_id, necesidad_id) VALUES (?, ?)");
[
  [centers[0], needs[0]], [centers[0], needs[1]], [centers[0], needs[2]],
  [centers[1], needs[0]], [centers[1], needs[2]],
  [centers[2], needs[0]], [centers[2], needs[4]],
  [centers[3], needs[3]], [centers[3], needs[2]],
  [centers[4], needs[5]], [centers[4], needs[1]]
].forEach((row) => link.run(...row));

const update = db.prepare("INSERT INTO actualizaciones (centro_id, necesidad_id, cantidad_agregada, observaciones) VALUES (?, ?, ?, ?)");
update.run(centers[0], needs[0], 120, "Ingreso de agua.");
update.run(centers[1], needs[2], 35, "Ingreso de kits.");
update.run(centers[3], needs[3], 40, "Ingreso de paÃ±ales.");

const history = db.prepare("INSERT INTO historial (usuario_id, entidad, entidad_id, accion, descripcion) VALUES (?, ?, ?, ?, ?)");
history.run(user.lastInsertRowid, "centro", centers[0], "verificacion", "Centro verificado.");
history.run(user.lastInsertRowid, "necesidad", needs[0], "aprobacion", "Necesidad urgente publicada.");
history.run(user.lastInsertRowid, "centro", centers[4], "propuesto", "Centro pendiente creado.");

console.log("Base de datos creada con datos iniciales.");
console.log(`Admin: ${adminEmail} / ${adminPassword}`);

