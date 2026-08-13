const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const stores = require("../storage");
const { requireAdmin } = require("../middleware/auth");
const { upload, uploadResponse } = require("../middleware/upload");
const {
  bool,
  cleanText,
  isValidUrl,
  normalizeNews,
  validateNews,
  normalizeAdvertisement,
  validateAdvertisement
} = require("../utils/validators");

const router = express.Router();

function sendValidation(res, errors) {
  return res.status(422).json({ error: "Validation failed", details: errors });
}

async function checkPassword(password) {
  const configured = process.env.ADMIN_PASSWORD || "change-this-password";
  if (configured.startsWith("$2a$") || configured.startsWith("$2b$")) {
    return bcrypt.compare(password, configured);
  }
  return crypto.timingSafeEqual(Buffer.from(password || ""), Buffer.from(configured));
}

router.get("/api/auth/status", (req, res) => {
  res.json({ authenticated: Boolean(req.session?.admin), csrfToken: req.session?.csrfToken || null });
});

router.post("/api/auth/login", async (req, res) => {
  const username = String(req.body.username || "");
  const password = String(req.body.password || "");
  const validUser = username === (process.env.ADMIN_USERNAME || "admin");
  const validPass = await checkPassword(password).catch(() => false);
  if (!validUser || !validPass) return res.status(401).json({ error: "Invalid username or password" });
  req.session.admin = { username };
  req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  const admin = await stores.admin.read();
  req.session.save((err) => {
    if (err) return res.status(500).json({ error: "Session save failed" });
    res.json({ ok: true, csrfToken: req.session.csrfToken });
  });
});

router.post("/api/auth/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
  const [news, categories, advertisements, slides, messages] = await Promise.all([
    stores.news.getAll(),
    stores.categories.getAll(),
    stores.advertisements.getAll(),
    stores.slides.getAll(),
    stores.messages.getAll()
  ]);
  res.json({
    totalNews: news.length,
    breakingNews: news.filter((item) => item.isBreaking).length,
    publishedNews: news.filter((item) => item.published).length,
    draftNews: news.filter((item) => !item.published).length,
    totalAdvertisements: advertisements.length,
    activeAdvertisements: advertisements.filter((item) => item.active).length,
    categories: categories.length,
    featuredItems: news.filter((item) => item.isFeatured).length + slides.filter((item) => item.active).length,
    totalMessages: messages.length
  });
});

router.post("/api/upload", requireAdmin, upload.single("image"), uploadResponse);

router.get("/api/admin/messages", requireAdmin, async (req, res) => res.json(await stores.messages.getAll()));
router.delete("/api/admin/messages/:id", requireAdmin, async (req, res) => {
  const deleted = await stores.messages.delete(req.params.id);
  res.status(deleted ? 200 : 404).json({ ok: deleted });
});

router.get("/api/admin/news", requireAdmin, async (req, res) => res.json(await stores.news.getAll()));
router.post("/api/news", requireAdmin, async (req, res) => {
  const payload = normalizeNews(req.body);
  const errors = validateNews(payload);
  if (errors.length) return sendValidation(res, errors);
  res.status(201).json(await stores.news.create(payload));
});
router.put("/api/news/:id", requireAdmin, async (req, res) => {
  const payload = normalizeNews(req.body);
  const errors = validateNews(payload);
  if (errors.length) return sendValidation(res, errors);
  const item = await stores.news.update(req.params.id, payload);
  if (!item) return res.status(404).json({ error: "News not found" });
  res.json(item);
});
router.delete("/api/news/:id", requireAdmin, async (req, res) => {
  const deleted = await stores.news.delete(req.params.id);
  res.status(deleted ? 200 : 404).json({ ok: deleted });
});

router.get("/api/admin/categories", requireAdmin, async (req, res) => res.json(await stores.categories.getAll()));
router.post("/api/categories", requireAdmin, async (req, res) => {
  if (!String(req.body.name || "").trim()) return sendValidation(res, ["Name is required"]);
  res.status(201).json(await stores.categories.create({
    name: String(req.body.name).trim().slice(0, 80),
    enabled: bool(req.body.enabled),
    order: Number(req.body.order || 100)
  }));
});
router.put("/api/categories/:id", requireAdmin, async (req, res) => {
  if (!String(req.body.name || "").trim()) return sendValidation(res, ["Name is required"]);
  const item = await stores.categories.update(req.params.id, {
    name: String(req.body.name).trim().slice(0, 80),
    enabled: bool(req.body.enabled),
    order: Number(req.body.order || 100)
  });
  if (!item) return res.status(404).json({ error: "Category not found" });
  res.json(item);
});
router.delete("/api/categories/:id", requireAdmin, async (req, res) => {
  const deleted = await stores.categories.delete(req.params.id);
  res.status(deleted ? 200 : 404).json({ ok: deleted });
});

router.get("/api/admin/advertisements", requireAdmin, async (req, res) => res.json(await stores.advertisements.getAll()));
router.post("/api/advertisements", requireAdmin, async (req, res) => {
  const payload = normalizeAdvertisement(req.body);
  const errors = validateAdvertisement(payload);
  if (errors.length) return sendValidation(res, errors);
  res.status(201).json(await stores.advertisements.create(payload));
});
router.put("/api/advertisements/:id", requireAdmin, async (req, res) => {
  const payload = normalizeAdvertisement(req.body);
  const errors = validateAdvertisement(payload);
  if (errors.length) return sendValidation(res, errors);
  const item = await stores.advertisements.update(req.params.id, payload);
  if (!item) return res.status(404).json({ error: "Advertisement not found" });
  res.json(item);
});
router.delete("/api/advertisements/:id", requireAdmin, async (req, res) => {
  const deleted = await stores.advertisements.delete(req.params.id);
  res.status(deleted ? 200 : 404).json({ ok: deleted });
});

router.get("/api/admin/slides", requireAdmin, async (req, res) => res.json(await stores.slides.getAll()));
router.post("/api/slides", requireAdmin, async (req, res) => {
  if (!String(req.body.title || "").trim()) return sendValidation(res, ["Title is required"]);
  if (req.body.link && !isValidUrl(req.body.link)) return sendValidation(res, ["Link URL is invalid"]);
  if (req.body.image && !req.body.image.startsWith("/") && !isValidUrl(req.body.image)) return sendValidation(res, ["Image URL is invalid"]);
  res.status(201).json(await stores.slides.create({
    title: String(req.body.title).trim().slice(0, 140),
    description: cleanText(req.body.description, 400),
    image: String(req.body.image || "").trim(),
    link: String(req.body.link || "").trim(),
    active: bool(req.body.active),
    order: Number(req.body.order || 100)
  }));
});
router.put("/api/slides/:id", requireAdmin, async (req, res) => {
  if (!String(req.body.title || "").trim()) return sendValidation(res, ["Title is required"]);
  if (req.body.link && !isValidUrl(req.body.link)) return sendValidation(res, ["Link URL is invalid"]);
  if (req.body.image && !req.body.image.startsWith("/") && !isValidUrl(req.body.image)) return sendValidation(res, ["Image URL is invalid"]);
  const item = await stores.slides.update(req.params.id, {
    title: String(req.body.title).trim().slice(0, 140),
    description: cleanText(req.body.description, 400),
    image: String(req.body.image || "").trim(),
    link: String(req.body.link || "").trim(),
    active: bool(req.body.active),
    order: Number(req.body.order || 100)
  });
  if (!item) return res.status(404).json({ error: "Slide not found" });
  res.json(item);
});
router.delete("/api/slides/:id", requireAdmin, async (req, res) => {
  const deleted = await stores.slides.delete(req.params.id);
  res.status(deleted ? 200 : 404).json({ ok: deleted });
});

router.get("/api/admin/settings", requireAdmin, async (req, res) => res.json(await stores.settings.read()));
router.put("/api/settings", requireAdmin, async (req, res) => {
  const current = await stores.settings.read();
  const next = {
    ...current,
    brandName: String(req.body.brandName || current.brandName).trim().slice(0, 80),
    brandLogo: String(req.body.brandLogo || current.brandLogo).trim(),
    tagline: String(req.body.tagline || "").trim().slice(0, 140),
    siteUrl: String(req.body.siteUrl || current.siteUrl).trim(),
    description: cleanText(req.body.description || current.description, 500),
    contactEmail: String(req.body.contactEmail || current.contactEmail).trim().slice(0, 120),
    social: {
      facebook: String(req.body.facebook || "").trim(),
      youtube: String(req.body.youtube || "").trim(),
      x: String(req.body.x || "").trim(),
      instagram: String(req.body.instagram || "").trim()
    }
  };
  await stores.settings.write(next);
  res.json(next);
});

module.exports = router;
