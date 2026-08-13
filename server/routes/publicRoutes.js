const path = require("path");
const express = require("express");
const stores = require("../storage");
const { renderNewsDetail, pageShell, publicChrome, escapeHtml } = require("../utils/render");
const { imageFor } = require("../utils/media");

const router = express.Router();

function published(items) {
  const now = Date.now();
  return items.filter((item) => item.published && new Date(item.publishedAt).getTime() <= now);
}

function activeByDate(items) {
  const now = Date.now();
  return items.filter((item) => {
    if (!item.active) return false;
    if (item.startDate && new Date(item.startDate).getTime() > now) return false;
    if (item.endDate && new Date(item.endDate).getTime() < now) return false;
    return true;
  });
}

function renderPublicCard(item, categoryName) {
  const mediaBadge = item.contentType === "youtube" ? "🎥 YouTube" : item.contentType === "facebook" ? "📲 Facebook" : item.contentType === "video" ? "🎬 Video" : "📰 Article";
  const dateStr = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "";
  return `<a class="news-card animate-on-scroll" href="/news/${item.slug || item.id}">
    <div class="thumb-wrap">
      <img loading="lazy" src="${escapeHtml(imageFor(item))}" alt="${escapeHtml(item.title)}" onerror="this.onerror=null;this.src='/assets/placeholder-news.svg';">
      <div class="card-overlay-gradient"></div>
      ${item.isBreaking ? '<span class="breaking-badge"><span></span>BREAKING</span>' : ""}
      <span class="media-type-tag">${escapeHtml(mediaBadge)}</span>
    </div>
    <div class="card-body">
      <div class="meta-row">
        <span class="chip-category">${escapeHtml(categoryName)}</span>
        <span class="card-date-badge">${escapeHtml(dateStr)}</span>
      </div>
      <h3 class="card-title">${escapeHtml(item.title)}</h3>
      <p class="card-desc">${escapeHtml(item.shortDescription || "")}</p>
      <div class="card-footer">
        <span class="read-more">Read Full Story <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
      </div>
    </div>
  </a>`;
}

router.get("/api/home", async (req, res) => {
  const [settings, categories, news, advertisements, slides] = await Promise.all([
    stores.settings.read(),
    stores.categories.getAll(),
    stores.news.getAll(),
    stores.advertisements.getAll(),
    stores.slides.getAll()
  ]);
  const liveNews = published(news);
  res.json({
    settings,
    categories: categories.filter((category) => category.enabled),
    breakingNews: liveNews.filter((item) => item.isBreaking).slice(0, 6),
    latestNews: liveNews.slice(0, 8),
    allNews: liveNews.slice(0, 16),
    advertisements: activeByDate(advertisements).slice(0, 10),
    slides: slides.filter((slide) => slide.active).slice(0, 10)
  });
});

router.get("/api/news", async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 48);
  const [allNews, categories] = await Promise.all([
    stores.news.getAll(),
    stores.categories.getAll()
  ]);
  const all = published(allNews);
  const q = String(req.query.q || "").toLowerCase();
  const categoryQuery = String(req.query.category || "");
  const type = String(req.query.type || "");

  const categoryObj = categories.find((c) => c.id === categoryQuery || c.slug === categoryQuery);
  const targetCatId = categoryObj ? categoryObj.id : categoryQuery;

  const filtered = all.filter((item) => {
    const haystack = `${item.title} ${item.shortDescription} ${item.content}`.toLowerCase();
    return (!q || haystack.includes(q)) && (!categoryQuery || item.categoryId === targetCatId) && (!type || item.contentType === type);
  });
  res.json({ items: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit });
});

router.get("/api/news/:id", async (req, res) => {
  const item = await stores.news.getById(req.params.id);
  if (!item || !item.published) return res.status(404).json({ error: "News not found" });
  res.json(item);
});

router.get("/api/categories", async (req, res) => {
  res.json((await stores.categories.getAll()).filter((item) => item.enabled));
});

router.get("/api/settings", async (req, res) => {
  res.json(await stores.settings.read());
});

router.get("/news/:id", async (req, res) => {
  const [settings, categories, news, advertisements] = await Promise.all([
    stores.settings.read(),
    stores.categories.getAll(),
    stores.news.getAll(),
    stores.advertisements.getAll()
  ]);
  const article = news.find((item) => (item.id === req.params.id || item.slug === req.params.id) && item.published);
  if (!article) return res.status(404).sendFile(path.join(__dirname, "..", "..", "public", "404.html"));
  const live = published(news);
  const activeAds = activeByDate(advertisements);
  const related = live.filter((item) => item.id !== article.id && item.categoryId === article.categoryId).slice(0, 4);
  res.send(renderNewsDetail(settings, categories, article, related, live.slice(0, 6), activeAds, req));
});

router.get("/category/:slug", async (req, res) => {
  const [settings, categories, news] = await Promise.all([
    stores.settings.read(),
    stores.categories.getAll(),
    stores.news.getAll()
  ]);
  const category = categories.find((item) => item.slug === req.params.slug && item.enabled);
  if (!category) return res.status(404).sendFile(path.join(__dirname, "..", "..", "public", "404.html"));
  const items = published(news).filter((item) => item.categoryId === category.id || item.categoryId === category.slug);
  const cards = items.map((item) => renderPublicCard(item, category.name)).join("");
  res.send(pageShell({
    title: `${category.name} | ${settings.brandName}`,
    description: `Latest ${category.name} news and updates.`,
    body: publicChrome(settings, categories, `<main class="section-page"><h1>${escapeHtml(category.name)}</h1><div class="news-grid">${cards || "<p style=\"grid-column: 1/-1;\">No published news in this category yet.</p>"}</div></main>`)
  }));
});

router.get("/search", async (req, res) => {
  const [settings, categories, news] = await Promise.all([
    stores.settings.read(),
    stores.categories.getAll(),
    stores.news.getAll()
  ]);
  const q = String(req.query.q || "").trim();
  const type = String(req.query.type || "");
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const live = published(news).filter((item) => {
    const haystack = `${item.title} ${item.shortDescription} ${item.content}`.toLowerCase();
    return (!q || haystack.includes(q.toLowerCase())) && (!type || item.contentType === type);
  });
  const cards = live.map((item) => renderPublicCard(item, categoryMap.get(item.categoryId) || "News")).join("");
  res.send(pageShell({
    title: q ? `Search: ${q} | ${settings.brandName}` : `Latest News | ${settings.brandName}`,
    description: `Search and browse latest published news.`,
    body: publicChrome(settings, categories, `<main class="section-page"><h1>${q ? `Search results for "${escapeHtml(q)}"` : "Latest News"}</h1><form class="search-page-form" action="/search"><input name="q" value="${escapeHtml(q)}" placeholder="Search title, category, description"><button>Search</button></form><div class="news-grid">${cards || "<p style=\"grid-column: 1/-1;\">No matching news found.</p>"}</div></main>`)
  }));
});

router.get("/sitemap.xml", async (req, res) => {
  const [settings, categories, news] = await Promise.all([stores.settings.read(), stores.categories.getAll(), stores.news.getAll()]);
  const base = settings.siteUrl || `${req.protocol}://${req.get("host")}`;
  const urls = ["/", "/search"]
    .concat(categories.filter((c) => c.enabled).map((c) => `/category/${c.slug}`))
    .concat(published(news).map((n) => `/news/${n.slug || n.id}`));
  res.type("xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${base}${url}</loc></url>`).join("")}</urlset>`);
});

router.post("/api/contact", async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 100);
  const email = String(req.body.email || "").trim().slice(0, 120);
  const phone = String(req.body.phone || "").trim().slice(0, 30);
  const topic = String(req.body.topic || "General Inquiry").trim().slice(0, 80);
  const message = String(req.body.message || "").trim().slice(0, 2000);

  if (!name || (!email && !phone) || !message) {
    return res.status(422).json({ error: "Please provide your name, email or phone, and a message." });
  }

  const record = {
    name,
    email,
    phone,
    topic,
    message,
    createdAt: new Date().toISOString(),
    read: false
  };

  await stores.messages.create(record);
  res.json({ ok: true, message: "Your message has been sent successfully. We will get back to you soon!" });
});

router.get("/robots.txt", (req, res) => {
  res.type("text/plain").send("User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n");
});

module.exports = router;
