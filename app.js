require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const publicRoutes = require("./routes/publicRoutes");
const apiRoutes = require("./routes/apiRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(
  session({
    name: "puente.sid",
    secret: process.env.SESSION_SECRET || "cambiar_esta_clave",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 80,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/admin/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 }));
app.use(["/api/centros/proponer", "/api/reportes", "/api/actualizar-centro"], formLimiter);

app.use(express.static(path.join(__dirname, "public")));
app.use("/", publicRoutes);
app.use("/api", apiRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Puente Solidario disponible en http://localhost:${PORT}`);
});
