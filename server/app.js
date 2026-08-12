require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const methodOverride = require("method-override");
const crypto = require("crypto");
const seed = require("./seed");
const publicRoutes = require("./routes/publicRoutes");
const adminRoutes = require("./routes/adminRoutes");
const FileSessionStore = require("./utils/sessionStore");
const { requireAdmin, requireCsrf } = require("./middleware/auth");

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://www.facebook.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.facebook.com"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(compression());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(methodOverride("_method"));
app.use(session({
  name: "brand_news_sid",
  secret: process.env.SESSION_SECRET || "dev-only-change-me-before-production",
  store: new FileSessionStore(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 8
  }
}));
app.use((req, res, next) => {
  if (req.session && !req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  next();
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false });
app.use("/api/auth/login", loginLimiter);
app.use(requireCsrf);

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use("/uploads", express.static(uploadsDir, { maxAge: isProduction ? "1d" : 0, fallthrough: true }));
app.use(express.static(path.join(__dirname, "..", "public"), { maxAge: isProduction ? "1h" : 0 }));

app.get("/admin/login", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "admin", "login.html")));
app.get(["/admin", "/admin/news", "/admin/advertisements", "/admin/slides", "/admin/categories", "/admin/settings"], requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "admin", "index.html"));
});

app.use(adminRoutes);
app.use(publicRoutes);

app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  res.status(404).sendFile(path.join(__dirname, "..", "public", "404.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.message?.includes("Only JPG") ? 400 : 500;
  if (req.path.startsWith("/api/")) return res.status(status).json({ error: err.message || "Server error" });
  res.status(status).send("Server error");
});

seed().then(() => {
  const server = app.listen(port, () => {
    console.log(`Premium news portal running at http://localhost:${port}`);
  });
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
  process.on("SIGINT", () => server.close(() => process.exit(0)));
});

module.exports = app;
