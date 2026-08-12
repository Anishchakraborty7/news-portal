(function () {
  const state = { page: 1, limit: 12, categories: [], slideIndex: 0 };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const dateLabel = (value) => {
    try {
      return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
    } catch {
      return "";
    }
  };

  function updateLiveDate() {
    const el = $("[data-live-date]");
    if (!el) return;
    const now = new Date();
    const formatted = new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(now);
    el.textContent = formatted;
  }

  function categoryName(id) {
    return state.categories.find((item) => item.id === id || item.slug === id)?.name || "News";
  }

  function youtubeId(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
      return parsed.searchParams.get("v") || parsed.pathname.match(/\/(embed|shorts)\/([^/?]+)/)?.[2] || "";
    } catch {
      return "";
    }
  }

  function imageFor(item) {
    if (item.thumbnail) return item.thumbnail;
    const id = youtubeId(item.youtubeUrl);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "/assets/placeholder-news.svg";
  }

  function renderNewsCard(item, featured) {
    const category = categoryName(item.categoryId);
    const mediaBadge = item.contentType === "youtube" ? "🎥 YouTube" : item.contentType === "facebook" ? "📲 Facebook" : item.contentType === "video" ? "🎬 Video" : "📰 Article";
    const dateStr = dateLabel(item.publishedAt);
    return `<a class="news-card ${featured ? "featured-card" : ""} animate-on-scroll" href="/news/${item.slug || item.id}">
      <div class="thumb-wrap">
        <img loading="lazy" src="${escapeHtml(imageFor(item))}" alt="${escapeHtml(item.title)}">
        <div class="card-overlay-gradient"></div>
        ${item.isBreaking ? '<span class="breaking-badge"><span></span>BREAKING</span>' : ""}
        <span class="media-type-tag">${escapeHtml(mediaBadge)}</span>
      </div>
      <div class="card-body">
        <div class="meta-row">
          <span class="chip-category">${escapeHtml(category)}</span>
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

  function renderLatest(item) {
    const category = categoryName(item.categoryId);
    return `<a class="latest-item animate-on-scroll" href="/news/${item.slug || item.id}">
      <div class="latest-thumb">
        <img loading="lazy" src="${escapeHtml(imageFor(item))}" alt="">
      </div>
      <div class="latest-content">
        <span class="latest-category">${escapeHtml(category)}</span>
        <strong class="latest-title">${escapeHtml(item.title)}</strong>
        <small class="latest-time">${dateLabel(item.publishedAt)}</small>
      </div>
    </a>`;
  }

  function renderAd(ad) {
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

  function renderSlide(slide) {
    const content = `<img loading="lazy" src="${escapeHtml(slide.image || "/assets/placeholder-news.svg")}" alt=""><div class="slide-overlay"></div><div class="slide-content"><span class="slide-tag">FEATURED COVERAGE</span><strong>${escapeHtml(slide.title)}</strong><small>${escapeHtml(slide.description || "")}</small></div>`;
    return slide.link ? `<a class="slide-card" href="${escapeHtml(slide.link)}">${content}</a>` : `<div class="slide-card">${content}</div>`;
  }

  function applySettings(settings) {
    document.title = `${settings.brandName} | Premium Digital News 24x7`;
    $$("[data-brand-name], [data-footer-brand]").forEach((el) => { el.textContent = settings.brandName; });
    const tagline = $("[data-brand-tagline]");
    if (tagline) tagline.textContent = settings.tagline;
    const logo = $("[data-brand-logo]");
    if (logo && settings.brandLogo && settings.brandLogo !== "BRAND_LOGO") logo.innerHTML = `<img src="${escapeHtml(settings.brandLogo)}" alt="${escapeHtml(settings.brandName)}">`;
    const desc = $("[data-footer-description]");
    if (desc) desc.textContent = settings.description;
    const contact = $("[data-footer-contact]");
    if (contact) contact.textContent = settings.contactEmail;
  }

  function renderCategories(categories) {
    state.categories = categories;
    const currentPath = window.location.pathname;
    const links = categories.map((category) => {
      const active = currentPath === `/category/${category.slug}` ? 'class="active-cat"' : '';
      return `<a href="/category/${category.slug}" ${active}>${escapeHtml(category.name)}</a>`;
    }).join("");
    const strip = $("[data-categories]");
    if (strip) strip.innerHTML = `<a href="/" ${currentPath === '/' ? 'class="active-cat"' : ''}>All</a>${links}`;
    const footer = $("[data-footer-categories]");
    if (footer) footer.innerHTML = links;
  }

  function initAnimations() {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    $$(".animate-on-scroll").forEach((el) => observer.observe(el));
  }

  function wireSlider() {
    const track = $("[data-featured-track]");
    if (!track) return;
    $("[data-slide-prev]")?.addEventListener("click", () => track.scrollBy({ left: -380, behavior: "smooth" }));
    $("[data-slide-next]")?.addEventListener("click", () => track.scrollBy({ left: 380, behavior: "smooth" }));
    setInterval(() => {
      if (track.matches(":hover")) return;
      track.scrollBy({ left: 360, behavior: "smooth" });
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) track.scrollTo({ left: 0, behavior: "smooth" });
    }, 6000);
  }

  async function loadHome() {
    const res = await fetch("/api/home");
    const data = await res.json();
    applySettings(data.settings);
    renderCategories(data.categories);
    
    const breaking = data.breakingNews[0] || data.latestNews[0];
    
    // Breaking Ticker
    const tickerEl = $("[data-breaking-ticker]");
    if (tickerEl) {
      tickerEl.innerHTML = data.breakingNews.length
        ? data.breakingNews.map((item) => `<a href="/news/${item.slug || item.id}"><span class="ticker-dot">•</span>${escapeHtml(item.title)}</a>`).join("")
        : `<span>Welcome to ${escapeHtml(data.settings.brandName || "NR KHABOR")}. Live breaking news updates will appear here.</span>`;
    }

    // Breaking Stage Card
    const stageEl = $("[data-breaking-stage]");
    if (stageEl) {
      stageEl.innerHTML = breaking
        ? renderNewsCard(breaking, true)
        : `<div class="empty-state-box">
            <div class="empty-icon">📰</div>
            <h3>No Breaking News Published Yet</h3>
            <p>Publish breaking stories from the admin dashboard to feature them here.</p>
          </div>`;
    }

    // Latest News List
    const latestListEl = $("[data-latest-list]");
    if (latestListEl) {
      latestListEl.innerHTML = data.latestNews.length
        ? data.latestNews.map(renderLatest).join("")
        : `<p class="empty-state-text">No recent updates published yet.</p>`;
    }

  function hasPosition(ad, target) {
    if (!ad.position) return target === "home-strip";
    const posList = String(ad.position).split(",").map((s) => s.trim().toLowerCase());
    return posList.includes("all") || posList.includes(target.toLowerCase());
  }

    // Advertisements - Home Strip Ticker
    const adStripEl = $("[data-ad-strip]");
    if (adStripEl) {
      const stripAds = data.advertisements.filter((ad) => hasPosition(ad, "home-strip"));
      if (stripAds.length) {
        const adsMarkup = stripAds.map(renderAd).join("");
        adStripEl.innerHTML = `<div class="ad-track">${adsMarkup}${adsMarkup}</div>`;
      } else {
        adStripEl.innerHTML = `<div class="empty-ad-strip"><span>Sponsored Partner Advertisements (Manage in Admin)</span></div>`;
      }
    }

    // Advertisements - Sidebar Block
    const sidebarAdsEl = $("[data-sidebar-ads]");
    if (sidebarAdsEl) {
      const sidebarAds = data.advertisements.filter((ad) => hasPosition(ad, "sidebar"));
      if (sidebarAds.length) {
        sidebarAdsEl.innerHTML = `<div class="sidebar-ad-block" style="margin-top:16px;"><span class="ad-label" style="display:block;margin-bottom:8px;">SPONSORED</span><div class="sidebar-ads-list" style="display:flex;flex-direction:column;gap:10px;">${sidebarAds.map(renderAd).join("")}</div></div>`;
      } else {
        sidebarAdsEl.innerHTML = "";
      }
    }

    // Advertisements - Bottom Strip Block
    const bottomAdsEl = $("[data-bottom-ads]");
    if (bottomAdsEl) {
      const bottomAds = data.advertisements.filter((ad) => hasPosition(ad, "article-bottom"));
      if (bottomAds.length) {
        bottomAdsEl.innerHTML = `<section class="ad-strip-wrap bottom-ad-strip"><div class="ad-header-row"><span class="ad-label">FEATURED PARTNER PROMOTIONS</span><span class="ad-line"></span></div><div class="ad-strip"><div class="ad-track">${bottomAds.map(renderAd).join("")}</div></div></section>`;
      } else {
        bottomAdsEl.innerHTML = "";
      }
    }

    // Featured Slides & News
    const featuredTrackEl = $("[data-featured-track]");
    if (featuredTrackEl) {
      const featuredNews = data.allNews.filter((item) => item.isFeatured).map(renderNewsCard).join("");
      const slidesMarkup = data.slides.map(renderSlide).join("");
      featuredTrackEl.innerHTML = (slidesMarkup || featuredNews)
        ? (slidesMarkup + featuredNews)
        : `<p class="empty-state-text">No featured stories available yet.</p>`;
    }

    // All News Grid
    const newsGridEl = $("[data-news-grid]");
    if (newsGridEl) {
      newsGridEl.innerHTML = data.allNews.length
        ? data.allNews.map(renderNewsCard).join("")
        : `<div class="empty-state-box full-grid-empty" style="grid-column: 1/-1;">
            <div class="empty-icon">✨</div>
            <h3>Your News Portal is Ready</h3>
            <p>Log in to the <strong><a href="/admin">Admin Dashboard</a></strong> to create categories and publish your first news article.</p>
          </div>`;
    }

    const loadMoreBtn = $("[data-load-more]");
    if (loadMoreBtn && (!data.allNews.length || data.allNews.length <= state.limit)) {
      loadMoreBtn.style.display = "none";
    }

    wireSlider();
    initAnimations();
  }

  async function loadMore() {
    state.page += 1;
    const res = await fetch(`/api/news?page=${state.page}&limit=${state.limit}`);
    const data = await res.json();
    const grid = $("[data-news-grid]");
    const newItemsMarkup = data.items.map(renderNewsCard).join("");
    grid.insertAdjacentHTML("beforeend", newItemsMarkup);
    initAnimations();
    if (state.page * state.limit >= data.total) {
      const btn = $("[data-load-more]");
      if (btn) btn.style.display = "none";
    }
  }

  function showToast(msg) {
    let toast = $(".site-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "site-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function wireCommon() {
    updateLiveDate();
    $(".menu-toggle")?.addEventListener("click", () => $("[data-mobile-nav]")?.classList.toggle("open"));
    $("[data-load-more]")?.addEventListener("click", loadMore);
    $("[data-share]")?.addEventListener("click", async () => {
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url: location.href }); } catch {}
      } else {
        navigator.clipboard.writeText(location.href);
        showToast("Page link copied to clipboard!");
      }
    });
    $$("[data-copy]").forEach((button) => button.addEventListener("click", () => {
      navigator.clipboard.writeText(button.dataset.copy);
      showToast("Link copied to clipboard!");
    }));
    initAnimations();
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireCommon();
    if (document.body.dataset.page === "home") loadHome().catch(console.error);
  });
})();
