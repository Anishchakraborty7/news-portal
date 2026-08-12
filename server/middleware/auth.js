function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  return res.redirect("/admin/login");
}

function requireCsrf(req, res, next) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  if (req.path === "/admin/login" || req.path === "/api/auth/login") return next();
  const token = req.get("x-csrf-token") || req.body?._csrf;
  if (req.session?.csrfToken && token === req.session.csrfToken) return next();
  return res.status(403).json({ error: "Invalid CSRF token" });
}

module.exports = { requireAdmin, requireCsrf };
