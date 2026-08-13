const { imageFor, youtubeEmbed } = require("./media");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pageShell({ title, description, image, canonical, body, schema }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image || "/assets/placeholder-news.svg");
  const safeCanonical = escapeHtml(canonical || "/");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <link rel="canonical" href="${safeCanonical}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImage}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css?v=10">
  <script type="application/ld+json">${JSON.stringify(schema || {})}</script>
</head>
<body>
${body}
<script defer src="/js/site.js?v=10"></script>
</body>
</html>`;
}

function publicChrome(settings, categories, content) {
  const categoryLinks = categories
    .filter((category) => category.enabled)
    .map((category) => `<a href="/category/${category.slug}">${escapeHtml(category.name)}</a>`)
    .join("");
  return `
<header class="site-header">
  <div class="topline">
    <div class="topline-left">
      <span class="live-pill"><span class="pulse-ring"></span>LIVE</span>
      <strong>${escapeHtml(settings.brandName)} 24x7</strong>
      <span class="topline-tagline">Trusted updates. Clear context. Fast reporting.</span>
    </div>
    <div class="topline-right">
      <span class="header-date" data-live-date></span>
    </div>
  </div>
  <div class="nav-shell">
    <button class="icon-button menu-toggle" aria-label="Open navigation">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
    </button>
    <a class="brand" href="/">
      <span class="brand-mark">${settings.brandLogo === "BRAND_LOGO" ? "BN" : `<img src="${escapeHtml(settings.brandLogo)}" alt="">`}</span>
      <span><strong>${escapeHtml(settings.brandName)}</strong><small>${escapeHtml(settings.tagline)}</small></span>
    </a>
    <nav class="main-nav" data-mobile-nav>
      <a href="/" class="nav-link">Home</a>
      <a href="/search" class="nav-link">Latest News</a>
      <a href="/#all-news" class="nav-link">Categories</a>
      <a href="/search?type=video" class="nav-link">Videos</a>
      <a href="/#footer" class="nav-link">About</a>
      <button type="button" class="nav-link-btn" data-open-contact>Contact Us</button>
    </nav>
    <form class="header-search" action="/search">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input name="q" placeholder="Search news..." aria-label="Search news">
      <button type="submit">Search</button>
    </form>
    <a class="admin-link" href="/admin">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"></path></svg>
      <span>Admin</span>
    </a>
  </div>
  <div class="category-strip-wrapper">
    <div class="category-strip"><a href="/">All</a>${categoryLinks}</div>
  </div>
</header>
${content}
<footer class="site-footer" id="footer">
  <div class="footer-brand-col">
    <h3 class="footer-logo">${escapeHtml(settings.brandName)}</h3>
    <p class="footer-desc">${escapeHtml(settings.description)}</p>
    <div class="footer-socials">
      <span class="social-chip">Live Feed</span>
      <span class="social-chip">Verified Portal</span>
    </div>
  </div>
  <div class="footer-nav-col">
    <h4>News Categories</h4>
    <div class="footer-links">${categoryLinks || "<span>Categories coming soon</span>"}</div>
  </div>
  <div class="footer-contact-col">
    <h4>Contact & Legal</h4>
    <p class="footer-email">${escapeHtml(settings.contactEmail)}</p>
    <button type="button" class="contact-open-btn" data-open-contact>💬 Open Contact Form / WhatsApp</button>
    <p class="footer-subtext">NR KHABOR News Media Network. All rights reserved.</p>
    <div class="legal-links">
      <a href="#">Privacy Policy</a> · <a href="#">Terms of Use</a>
    </div>
  </div>
</footer>

<div class="contact-modal-overlay hidden" id="contact-modal" data-contact-modal>
  <div class="contact-modal-card">
    <div class="contact-modal-header">
      <div class="contact-header-titles">
        <h3>Contact <span data-brand-name>${escapeHtml(settings.brandName)}</span></h3>
        <p>Send a message directly to our editorial team or WhatsApp admin.</p>
      </div>
      <button type="button" class="contact-modal-close" data-close-contact aria-label="Close Contact Form">✕</button>
    </div>
    <form class="contact-modal-form" data-contact-form>
      <div class="contact-form-grid">
        <label>
          <span>Your Full Name *</span>
          <input type="text" name="name" required placeholder="e.g. Rahul Sharma">
        </label>
        <label>
          <span>WhatsApp / Phone Number</span>
          <input type="tel" name="phone" placeholder="e.g. +91 98765 43210">
        </label>
        <label class="full-width">
          <span>Email Address *</span>
          <input type="email" name="email" required placeholder="name@example.com">
        </label>
        <label class="full-width">
          <span>Topic / Department</span>
          <select name="topic">
            <option value="General Inquiry">💬 General Inquiry</option>
            <option value="Breaking News Tip">📰 Breaking News Tip / Story Submission</option>
            <option value="Advertisement & Sponsorship">💼 Advertisement & Sponsorship</option>
            <option value="Feedback & Support">🛠️ Feedback & Technical Support</option>
          </select>
        </label>
        <label class="full-width">
          <span>Your Message *</span>
          <textarea name="message" rows="4" required placeholder="Write your message or news tip here..."></textarea>
        </label>
      </div>
      <div class="contact-form-actions">
        <button type="button" class="btn-whatsapp-send" data-send-whatsapp>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 0C5.396 0 .02 5.37.02 12.006c0 2.12.553 4.188 1.603 6.01L.004 24l6.166-1.616A11.93 11.93 0 0 0 12.03 24c6.633 0 12.01-5.37 12.01-12.006 0-3.208-1.25-6.223-3.518-8.49A11.9 11.9 0 0 0 12.03 0zm0 2.2c2.62 0 5.083 1.02 6.938 2.873 1.854 1.854 2.875 4.316 2.875 6.933 0 5.419-4.407 9.83-9.813 9.83-1.802 0-3.568-.493-5.112-1.424l-.367-.22-3.66.96.977-3.567-.242-.386A9.774 9.774 0 0 1 2.22 12.006C2.22 6.586 6.626 2.2 12.03 2.2z"/></svg>
          <span>Send via WhatsApp</span>
        </button>
        <button type="submit" class="btn-email-send" data-send-email>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          <span>Submit Form</span>
        </button>
      </div>
    </form>
  </div>
</div>`;
}

function renderAdItem(ad) {
  const formatType = ad.type || "banner";
  const formatClass = `ad-format-${formatType}`;
  let content = "";
  if (formatType === "text") {
    content = `<div class="ad-content"><span class="ad-badge text-badge">Sponsored</span><strong class="ad-title">${escapeHtml(ad.title)}</strong>${ad.text ? `<small class="ad-desc">${escapeHtml(ad.text)}</small>` : ""}</div>`;
  } else if (formatType === "image") {
    content = `${ad.image ? `<div class="ad-img-wrap full-ad-img"><img src="${escapeHtml(ad.image)}" alt="${escapeHtml(ad.title)}"></div>` : ""}<div class="ad-content"><strong class="ad-title">${escapeHtml(ad.title)}</strong></div><span class="ad-badge">Ad</span>`;
  } else {
    content = `${ad.image ? `<div class="ad-img-wrap"><img src="${escapeHtml(ad.image)}" alt="${escapeHtml(ad.title)}"></div>` : ""}<div class="ad-content"><strong class="ad-title">${escapeHtml(ad.title)}</strong>${ad.text ? `<small class="ad-desc">${escapeHtml(ad.text)}</small>` : ""}</div><span class="ad-badge">Ad</span>`;
  }
  if (ad.destinationUrl) return `<a class="ad-item ${formatClass}" href="${escapeHtml(ad.destinationUrl)}" target="_blank" rel="noopener noreferrer">${content}</a>`;
  return `<div class="ad-item ${formatClass}">${content}</div>`;
}

function getCanonicalUrl(settings, req, pathStr) {
  const host = req ? (req.get("x-forwarded-host") || req.get("host")) : "";
  const proto = req ? (req.get("x-forwarded-proto") || req.protocol || "https") : "https";
  let base = "";
  if (settings?.siteUrl && !settings.siteUrl.includes("localhost") && !settings.siteUrl.includes("127.0.0.1")) {
    base = settings.siteUrl.replace(/\/$/, "");
  } else if (host) {
    base = `${proto}://${host}`;
  } else {
    base = "https://nrkhabar.in";
  }
  return `${base}${pathStr.startsWith("/") ? "" : "/"}${pathStr}`;
}

function renderNewsDetail(settings, categories, article, related, latest, advertisements = [], req) {
  if (req === undefined && advertisements && advertisements.protocol) {
    req = advertisements;
    advertisements = [];
  }
  const category = categories.find((item) => item.id === article.categoryId || item.slug === article.categoryId);
  const canonical = getCanonicalUrl(settings, req, `/news/${article.slug || article.id}`);
  const whatsappMsg = `${article.title}\n\nRead full story on ${settings.brandName || "NR KHABOR"}:\n${canonical}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;

  let media = `<img class="detail-media" src="${escapeHtml(imageFor(article))}" alt="${escapeHtml(article.title)}" onerror="this.onerror=null;this.src='/assets/placeholder-news.svg';">`;
  if (article.contentType === "youtube" && youtubeEmbed(article.youtubeUrl)) {
    media = `<div class="video-frame"><iframe src="${escapeHtml(youtubeEmbed(article.youtubeUrl))}" title="${escapeHtml(article.title)}" loading="lazy" allowfullscreen></iframe></div>`;
  } else if (article.contentType === "facebook") {
    media = `<a class="social-fallback" href="${escapeHtml(article.facebookUrl)}" target="_blank" rel="noopener noreferrer">View on Facebook</a>`;
  }

  function hasPosition(ad, target) {
    if (!ad.position) return target === "home-strip";
    const posList = String(ad.position).split(",").map((s) => s.trim().toLowerCase());
    return posList.includes("all") || posList.includes(target.toLowerCase());
  }

  const sidebarAds = advertisements.filter((a) => hasPosition(a, "sidebar"));
  const bottomAds = advertisements.filter((a) => hasPosition(a, "article-bottom"));

  const cards = related.map((item) => `<a class="mini-card" href="/news/${item.slug || item.id}"><img src="${escapeHtml(imageFor(item))}" alt="" onerror="this.onerror=null;this.src='/assets/placeholder-news.svg';"><span>${escapeHtml(item.title)}</span></a>`).join("");
  const latestList = latest.map((item) => `<a class="latest-sidebar-item" href="/news/${item.slug || item.id}"><span>${escapeHtml(item.title)}</span></a>`).join("");
  const body = publicChrome(settings, categories, `
<main class="detail-layout">
  <article class="article-page">
    <a class="back-link" href="/">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
      <span>Back to news</span>
    </a>
    <span class="eyebrow">${escapeHtml(category?.name || "News")}</span>
    <h1>${escapeHtml(article.title)}</h1>
    <div class="article-meta">
      <span class="meta-item">${new Date(article.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
      ${article.source ? `<span class="meta-item">By ${escapeHtml(article.source)}</span>` : ""}
    </div>
    ${media}
    <p class="lede">${escapeHtml(article.shortDescription)}</p>
    <div class="article-content">${article.content || ""}</div>
    ${bottomAds.length ? `<div class="article-bottom-ads" style="margin: 24px 0;">${bottomAds.map(renderAdItem).join("")}</div>` : ""}
    ${article.externalUrl ? `<a class="primary-button source-btn" href="${escapeHtml(article.externalUrl)}" target="_blank" rel="noopener noreferrer">Open Original Source →</a>` : ""}
    <div class="share-row">
      <button class="share-btn" data-share>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
        <span>Share</span>
      </button>
      <a class="whatsapp-btn" href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <button class="copy-btn" data-copy="${escapeHtml(canonical)}">Copy link</button>
    </div>
  </article>
  <aside class="detail-sidebar">
    ${sidebarAds.length ? `<div class="sidebar-block"><h3>Sponsored</h3><div class="sidebar-ads" style="display:flex;flex-direction:column;gap:12px;">${sidebarAds.map(renderAdItem).join("")}</div></div>` : ""}
    <div class="sidebar-block">
      <h3>Latest News</h3>
      <div class="sidebar-list">${latestList}</div>
    </div>
    <div class="sidebar-block">
      <h3>Related Stories</h3>
      <div class="mini-cards-list">${cards}</div>
    </div>
  </aside>
</main>`);
  return pageShell({
    title: `${article.title} | ${settings.brandName}`,
    description: article.shortDescription || settings.description,
    image: imageFor(article),
    canonical,
    body,
    schema: {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      datePublished: article.publishedAt,
      image: [imageFor(article)],
      articleSection: category?.name || "News"
    }
  });
}

module.exports = { escapeHtml, pageShell, publicChrome, renderNewsDetail };
