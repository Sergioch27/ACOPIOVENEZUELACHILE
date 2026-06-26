# Puente Solidario Chile-Venezuela

MVP web para centralizar centros de acopio en Chile y publicar necesidades de ayuda para Venezuela. Esta version usa HTML, CSS, JavaScript vanilla, Node.js, Express, SQLite y better-sqlite3.

## Tecnologias

- Node.js y Express
- SQLite con better-sqlite3
- express-session para sesion administrativa
- bcrypt para contrasenas
- helmet y express-rate-limit para seguridad basica
- HTML5, CSS3 y JavaScript vanilla

## Requisitos

- Node.js 20 LTS o superior.
- En Windows con Node muy reciente, `better-sqlite3` necesita una version con binarios precompilados compatibles o herramientas de compilacion C++ instaladas.

## Instalacion

```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

Abrir:

- Publico: `http://localhost:3000`
- Admin: `http://localhost:3000/admin/login.html`

## Variables de entorno

```env
ADMIN_EMAIL=admin@puentesolidario.cl
ADMIN_PASSWORD=admin123
SESSION_SECRET=cambiar_esta_clave
PORT=3000
```

## Credenciales de prueba

El seed crea el usuario administrador con las variables de entorno. Si no existe `.env`, usa:

- Email: `admin@puentesolidario.cl`
- Contrasena: `admin123`

## Comandos

```bash
npm run seed   # crea database/database.sqlite con datos demo
npm run dev    # inicia con nodemon
npm start      # inicia con node
```

## Estructura

```text
app.js
config/database.js
database/schema.sql
database/seed.js
routes/
controllers/
middleware/
public/
public/admin/
public/css/
public/js/
uploads/
```

## Rutas principales

Publicas:

- `GET /api/stats`
- `GET /api/centros`
- `GET /api/centros/:id`
- `GET /api/necesidades`
- `POST /api/centros/proponer`
- `POST /api/reportes`
- `GET /api/actualizar-centro/:token`
- `POST /api/actualizar-centro/:token`

Administrativas:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/dashboard`
- CRUD de centros en `/api/admin/centros`
- Verificacion en `/api/admin/centros/:id/verificar`
- CRUD de necesidades en `/api/admin/necesidades`

## Base de datos

El esquema esta en `database/schema.sql`. Incluye usuarios, organizaciones, centros, categorias, necesidades, relaciones centro-necesidad, actualizaciones, verificaciones, reportes e historial.

El seed usa datos ficticios marcados como demostracion, con 5 centros, 6 necesidades, categorias basicas, actualizaciones e historial.

## Modificar colores

Editar `public/css/variables.css`. Los estilos de componentes reutilizables estan en `components.css` y los ajustes responsive en `responsive.css`.

## Agregar una pagina

1. Crear el HTML dentro de `public/`.
2. Reutilizar los CSS globales.
3. Crear un archivo JS en `public/js/` si necesita datos.
4. Consumir la API con `apiRequest()` desde `public/js/api.js`.

## Agregar una ruta API

1. Agregar la funcion en un controlador de `controllers/`.
2. Registrar la ruta en `routes/apiRoutes.js` o `routes/adminRoutes.js`.
3. Usar consultas preparadas de `better-sqlite3`.
4. Validar campos obligatorios y devolver JSON claro.

## Proximos pasos

- Agregar mapa real por coordenadas.
- Mejorar reportes y usuarios administrativos.
- Exportar datos operativos.
- Agregar pruebas automatizadas de API.
- Reemplazar datos demo por carga administrable.
