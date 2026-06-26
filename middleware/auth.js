function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Debes iniciar sesion." });
  }
  next();
}

function currentUser(req) {
  return req.session && req.session.user ? req.session.user : null;
}

module.exports = { requireAdmin, currentUser };
