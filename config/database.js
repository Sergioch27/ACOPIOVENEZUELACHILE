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

module.exports = db;
