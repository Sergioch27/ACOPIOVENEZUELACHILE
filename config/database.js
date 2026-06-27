const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const databaseDir = path.join(__dirname, "..", "database");
const databasePath = path.join(databaseDir, "database.sqlite");

if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize all tables (idempotent — safe to run on every startup)
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'admin',
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS organizaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    rut TEXT,
    telefono TEXT,
    email TEXT,
    sitio_web TEXT,
    estado_verificacion TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS centros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organizacion_id INTEGER,
    nombre TEXT NOT NULL,
    responsable_nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    email TEXT NOT NULL,
    region TEXT NOT NULL,
    comuna TEXT NOT NULL,
    direccion TEXT NOT NULL,
    referencia TEXT,
    latitud REAL,
    longitud REAL,
    horario TEXT NOT NULL,
    fecha_inicio TEXT,
    fecha_cierre TEXT,
    proxima_fecha_despacho TEXT,
    productos_recibidos TEXT,
    productos_no_recibidos TEXT,
    destino_donaciones TEXT,
    observaciones TEXT,
    estado TEXT NOT NULL CHECK (estado IN ('borrador','pendiente','verificado','requiere_actualizacion','suspendido','cerrado','rechazado')),
    token_actualizacion TEXT NOT NULL UNIQUE,
    ultima_actualizacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_verificacion TEXT,
    verificado_por INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id),
    FOREIGN KEY (verificado_por) REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    icono TEXT
  );

  CREATE TABLE IF NOT EXISTS productos_catalogo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    activo INTEGER NOT NULL DEFAULT 1,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS necesidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria_id INTEGER NOT NULL,
    descripcion TEXT,
    prioridad TEXT NOT NULL CHECK (prioridad IN ('baja','media','alta','urgente')),
    cantidad_objetivo REAL NOT NULL DEFAULT 0,
    cantidad_recibida REAL NOT NULL DEFAULT 0,
    unidad TEXT NOT NULL,
    fecha_limite TEXT,
    destino TEXT,
    solicitante TEXT,
    fuente TEXT,
    estado TEXT NOT NULL CHECK (estado IN ('borrador','pendiente','publicada','pausada','completada','cerrada')),
    verificada INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
  );

  CREATE TABLE IF NOT EXISTS centro_necesidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    centro_id INTEGER NOT NULL,
    necesidad_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (centro_id, necesidad_id),
    FOREIGN KEY (centro_id) REFERENCES centros(id) ON DELETE CASCADE,
    FOREIGN KEY (necesidad_id) REFERENCES necesidades(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS actualizaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    centro_id INTEGER NOT NULL,
    necesidad_id INTEGER,
    cantidad_agregada REAL DEFAULT 0,
    observaciones TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (centro_id) REFERENCES centros(id) ON DELETE CASCADE,
    FOREIGN KEY (necesidad_id) REFERENCES necesidades(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS verificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    centro_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    contacto_confirmado INTEGER NOT NULL DEFAULT 0,
    direccion_confirmada INTEGER NOT NULL DEFAULT 0,
    centro_activo INTEGER NOT NULL DEFAULT 0,
    horario_confirmado INTEGER NOT NULL DEFAULT 0,
    productos_confirmados INTEGER NOT NULL DEFAULT 0,
    destino_confirmado INTEGER NOT NULL DEFAULT 0,
    organizacion_confirmada INTEGER NOT NULL DEFAULT 0,
    resultado TEXT NOT NULL,
    comentario TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (centro_id) REFERENCES centros(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS reportes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    centro_id INTEGER NOT NULL,
    nombre_reportante TEXT,
    email_reportante TEXT,
    motivo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (centro_id) REFERENCES centros(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    entidad TEXT NOT NULL,
    entidad_id INTEGER,
    accion TEXT NOT NULL,
    descripcion TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );
`);

// Seed productos_catalogo with defaults if empty
const productCount = db.prepare("SELECT COUNT(*) total FROM productos_catalogo").get().total;
if (!productCount) {
  const insertProduct = db.prepare("INSERT INTO productos_catalogo (nombre, activo, orden) VALUES (?, 1, ?)");
  [
    "Agua embotellada",
    "Alimentos no perecibles",
    "Pañales infantiles",
    "Kits de higiene",
    "Insumos medicos basicos",
    "Ropa nueva",
    "Alimento para mascotas"
  ].forEach((name, index) => insertProduct.run(name, index + 1));
}

module.exports = db;
