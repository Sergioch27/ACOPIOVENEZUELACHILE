const db = require("../config/database");

const run = (sql, params = []) => db.prepare(sql).run(...params);

[
  ["Centro Demo Santiago Centro", "Centro Santiago Centro"],
  ["Punto Demo Maipu", "Punto Solidario Maipu"],
  ["Acopio Demo Antofagasta", "Acopio Antofagasta"],
  ["Ruta Demo Valparaiso", "Ruta Solidaria Valparaiso"],
  ["Centro Demo Pendiente Concepcion", "Centro Pendiente Concepcion"]
].forEach(([oldName, newName]) => {
  run("UPDATE centros SET nombre = ? WHERE nombre = ?", [newName, oldName]);
});

[
  ["Fundacion Demo Abrazo Migrante", "Fundacion Abrazo Migrante"],
  ["Red Solidaria Demo Norte", "Red Solidaria Norte"],
  ["Comunidad Demo Sur", "Comunidad Solidaria Sur"]
].forEach(([oldName, newName]) => {
  run("UPDATE organizaciones SET nombre = ? WHERE nombre = ?", [newName, oldName]);
});

run("UPDATE usuarios SET nombre = 'Administrador Puente Solidario' WHERE nombre LIKE '%Demo%'");
run(`
  UPDATE organizaciones
  SET email = replace(replace(email, '@demo.cl', '@puentesolidario.cl'), 'contacto@abrazo-demo.cl', 'contacto@abrazomigrante.cl'),
      sitio_web = replace(sitio_web, 'https://demo.local', 'https://puentesolidario.cl')
`);
run(`
  UPDATE centros
  SET email = replace(email, '@demo.cl', '@puentesolidario.cl'),
      token_actualizacion = replace(token_actualizacion, 'token-demo-', 'token-'),
      observaciones = replace(observaciones, 'Datos ficticios para demostracion.', 'Centro verificado por el equipo de coordinacion.')
`);
run(`
  UPDATE necesidades
  SET solicitante = replace(replace(replace(replace(replace(replace(solicitante,
        'Equipo logistico demo', 'Equipo logistico'),
        'Red demo', 'Red solidaria'),
        'Fundacion demo', 'Fundacion Abrazo Migrante'),
        'Comunidad demo', 'Comunidad solidaria'),
        'Equipo salud demo', 'Equipo de salud'),
        'Voluntarios demo', 'Voluntarios'),
      fuente = replace(fuente, 'Levantamiento demo', 'Levantamiento comunitario')
`);
run(`
  UPDATE actualizaciones
  SET observaciones = replace(replace(replace(observaciones,
      'Ingreso demo de agua.', 'Ingreso de agua.'),
      'Ingreso demo de kits.', 'Ingreso de kits.'),
      'Ingreso demo de pañales.', 'Ingreso de pañales.')
`);
run(`
  UPDATE historial
  SET descripcion = replace(replace(descripcion,
      'Centro demo verificado.', 'Centro verificado.'),
      'Centro demo pendiente creado.', 'Centro pendiente creado.')
`);

console.log("Datos visibles actualizados para pruebas de produccion.");
