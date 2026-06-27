const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const databaseDir = path.join(__dirname, "..", "database");
const databasePath = path.join(databaseDir, "database.sqlite");

if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

const db = new Database(databasePath);
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS productos_catalogo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    activo INTEGER NOT NULL DEFAULT 1,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

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
