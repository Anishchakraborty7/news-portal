(function () {
  const state = { csrfToken: "", categories: [], editing: null };
  const view = document.querySelector("[data-view]");
  const title = document.querySelector("[data-page-title]");
  const toastRegion = document.querySelector("[data-toast-region]");
  const routeMap = {
    "/admin": "dashboard",
    "/admin/news": "news",
    "/admin/advertisements": "advertisements",
    "/admin/slides": "slides",
    "/admin/categories": "categories",
    "/admin/settings": "settings"
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));

  async function api(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(state.csrfToken ? { "x-csrf-token": state.csrfToken } : {}),
        ...(options.headers || {})
      }
    });
    if (res.status === 401) location.href = "/admin/login";
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.details?.join(", ") || data.error || "Request failed");
    return data;
  }

  function setLoading(label = "Loading workspace") {
    view.innerHTML = `<div class="loading-state"><span></span><strong>${escapeHtml(label)}</strong><p>Please wait while the admin data is prepared.</p></div>`;
  }

  function toast(text, type = "success") {
    if (!toastRegion) return;
    const node = document.createElement("div");
    node.className = `admin-toast ${type}`;
    node.innerHTML = `<strong>${type === "danger" ? "Failed" : "Success"}</strong><span>${escapeHtml(text)}</span>`;
    toastRegion.appendChild(node);
    window.setTimeout(() => node.remove(), 4200);
  }

  function formStatus(form, text, type = "success") {
    const target = form.querySelector("[data-form-status]");
    if (target) target.innerHTML = message(text, type === "danger");
  }

  function setActive(route) {
    document.querySelectorAll("[data-route]").forEach((link) => link.classList.toggle("active", link.dataset.route === route));
  }

  function panel(name, body) {
    return `<section class="admin-panel"><div class="panel-head"><h2>${name}</h2></div>${body}</section>`;
  }

  function message(text, danger) {
    return `<p class="form-message ${danger ? "danger" : "success"}">${escapeHtml(text)}</p>`;
  }

  function emptyRow(messageText, columns) {
    return `<tr><td class="empty-cell" colspan="${columns}">${escapeHtml(messageText)}</td></tr>`;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleString();
  }

  async function uploadImage(input) {
    if (!input.files?.[0]) return "";
    const data = new FormData();
    data.append("image", input.files[0]);
    const result = await api("/api/upload", { method: "POST", body: data });
    return result.url;
  }

  function readForm(form) {
    const data = Object.fromEntries(new FormData(form));
    form.querySelectorAll("input[type=checkbox]").forEach((input) => { data[input.name] = input.checked; });
    return data;
  }

  function categoryOptions(selected) {
    const options = state.categories.map((item) => `<option value="${item.id}" ${selected === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
    return `<option value="">Select category</option>${options}`;
  }

  async function loadCategoriesCache() {
    state.categories = await api("/api/admin/categories").catch(() => []);
  }

  async function dashboard() {
    title.textContent = "Dashboard";
    setActive("dashboard");
    setLoading("Loading dashboard");
    const data = await api("/api/admin/dashboard");
    const labels = {
      totalNews: "Total News",
      breakingNews: "Breaking News",
      publishedNews: "Published News",
      draftNews: "Draft News",
      totalAdvertisements: "Total Ads",
      activeAdvertisements: "Active Ads",
      categories: "Categories",
      featuredItems: "Featured Items"
    };
    view.innerHTML = `
      <div class="metric-grid">${Object.entries(labels).map(([key, label]) => `<article class="metric-card"><span>${label}</span><strong>${data[key]}</strong></article>`).join("")}</div>
      <section class="admin-panel welcome-panel">
        <div>
          <p class="eyebrow">Ready</p>
          <h2>Manage every live section from one clean studio.</h2>
          <p>Publish news, control advertisements, update slides, organize categories, and keep site settings fresh.</p>
        </div>
        <a class="primary-button" href="/admin/news">Create News</a>
      </section>`;
  }

  function renderSmartUploader(fieldName, currentValue = "", labelText = "Photo", aspect = "16/9") {
    const hasValue = Boolean(String(currentValue || "").trim());
    return `
      <div class="smart-uploader full-span" data-smart-uploader="${fieldName}">
        <label>${escapeHtml(labelText)}</label>
        <input type="hidden" name="${fieldName}" value="${escapeHtml(currentValue)}">
        <div class="smart-uploader-preview-wrap ${hasValue ? "" : "hidden"}" data-preview-box>
          <div class="smart-uploader-preview" data-aspect="${aspect}">
            <img src="${escapeHtml(currentValue || "/assets/placeholder-news.svg")}" alt="Preview" data-preview-img>
          </div>
          <div class="smart-uploader-actions">
            <button type="button" class="text-button" data-change-photo>Choose New Photo</button>
            <button type="button" class="smart-uploader-toggle" data-toggle-url>Paste Image URL</button>
            <button type="button" class="smart-uploader-toggle" style="color:var(--danger);margin-left:auto;" data-remove-photo>Remove</button>
          </div>
        </div>
        <div class="smart-uploader-drop ${hasValue ? "hidden" : ""}" data-drop-zone>
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          <p>Click or Drag photo here to upload</p>
          <span>Supports JPG, PNG, WEBP (Max 5MB)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" data-file-input>
        </div>
        <div class="smart-uploader-url-field hidden" data-url-container>
          <input placeholder="https://example.com/image.jpg" value="${escapeHtml(currentValue)}" data-url-input>
          <button type="button" class="text-button" data-apply-url>Apply URL</button>
        </div>
      </div>`;
  }

  function wireSmartUploaders(root) {
    root.querySelectorAll("[data-smart-uploader]").forEach((container) => {
      const hiddenInput = container.querySelector("input[type=hidden]");
      const dropZone = container.querySelector("[data-drop-zone]");
      const fileInput = container.querySelector("[data-file-input]");
      const previewBox = container.querySelector("[data-preview-box]");
      const previewImg = container.querySelector("[data-preview-img]");
      const urlContainer = container.querySelector("[data-url-container]");
      const urlInput = container.querySelector("[data-url-input]");
      const toggleUrlBtn = container.querySelector("[data-toggle-url]");
      const changeBtn = container.querySelector("[data-change-photo]");
      const removeBtn = container.querySelector("[data-remove-photo]");
      const applyUrlBtn = container.querySelector("[data-apply-url]");

      const showValue = (url) => {
        hiddenInput.value = url;
        if (url.trim()) {
          previewImg.src = url;
          previewBox.classList.remove("hidden");
          dropZone.classList.add("hidden");
        } else {
          previewBox.classList.add("hidden");
          dropZone.classList.remove("hidden");
        }
        urlContainer.classList.add("hidden");
      };

      dropZone?.addEventListener("click", () => fileInput?.click());

      ["dragover", "dragenter"].forEach((evt) => {
        dropZone?.addEventListener(evt, (e) => { e.preventDefault(); container.classList.add("dragover"); });
      });
      ["dragleave", "drop"].forEach((evt) => {
        dropZone?.addEventListener(evt, (e) => { e.preventDefault(); container.classList.remove("dragover"); });
      });
      dropZone?.addEventListener("drop", (e) => {
        if (e.dataTransfer?.files?.[0]) {
          fileInput.files = e.dataTransfer.files;
          fileInput.dispatchEvent(new Event("change"));
        }
      });

      fileInput?.addEventListener("change", async () => {
        if (!fileInput.files?.[0]) return;
        dropZone.classList.add("hidden");
        previewBox.classList.remove("hidden");
        previewImg.style.opacity = "0.5";
        try {
          const url = await uploadImage(fileInput);
          if (url) {
            showValue(url);
            toast("Photo uploaded successfully.");
          }
        } catch (error) {
          toast(error.message, "danger");
          showValue(hiddenInput.value);
        } finally {
          previewImg.style.opacity = "1";
        }
      });

      changeBtn?.addEventListener("click", () => fileInput?.click());
      removeBtn?.addEventListener("click", () => showValue(""));
      toggleUrlBtn?.addEventListener("click", () => urlContainer.classList.toggle("hidden"));
      applyUrlBtn?.addEventListener("click", () => showValue(urlInput.value));
    });
  }

  function newsForm(item = {}) {
    item = item || {};
    const now = new Date().toISOString().slice(0, 16);
    return panel(item.id ? "Edit News Story" : "Add News Story", `
      <form class="admin-form" data-news-form data-id="${item.id || ""}">
        <div class="form-grid">
          <label class="full-span">News Title<input name="title" required placeholder="Enter news title" value="${escapeHtml(item.title || "")}"></label>
          <label>Category<select name="categoryId" required>${categoryOptions(item.categoryId)}</select></label>
          <label>Content Type<select name="contentType" data-content-type>
            ${["image","youtube","facebook","external","video"].map((type) => `<option value="${type}" ${item.contentType === type ? "selected" : ""}>${type}</option>`).join("")}
          </select></label>
          
          ${renderSmartUploader("thumbnail", item.thumbnail || "", "Thumbnail Photo", "16/10")}
          
          <label data-field="youtube">YouTube URL<input name="youtubeUrl" placeholder="https://www.youtube.com/watch?v=..." value="${escapeHtml(item.youtubeUrl || "")}"></label>
          <label data-field="facebook">Facebook URL<input name="facebookUrl" placeholder="https://www.facebook.com/..." value="${escapeHtml(item.facebookUrl || "")}"></label>
          <label data-field="external video">External/Video Link<input name="externalUrl" placeholder="https://..." value="${escapeHtml(item.externalUrl || "")}"></label>
          <label>Source / Byline<input name="source" placeholder="News Desk" value="${escapeHtml(item.source || "")}"></label>
          <label>Publication Date<input name="publishedAt" type="datetime-local" value="${escapeHtml(item.publishedAt ? item.publishedAt.slice(0, 16) : now)}"></label>
          
          <label class="full-span">Short Description<textarea name="shortDescription" placeholder="Summary for article card...">${escapeHtml(item.shortDescription || "")}</textarea></label>
          <label class="full-span">Full Article Content<textarea name="content" placeholder="Full news article body...">${escapeHtml((item.content || "").replace(/<br>/g, "\n"))}</textarea></label>
          
          <div class="check-row full-span">
            <label><input name="isBreaking" type="checkbox" ${item.isBreaking ? "checked" : ""}> Breaking News</label>
            <label><input name="isFeatured" type="checkbox" ${item.isFeatured ? "checked" : ""}> Featured</label>
            <label><input name="published" type="checkbox" ${item.published !== false ? "checked" : ""}> Published</label>
          </div>
        </div>
        <div class="form-actions-row">
          <button class="primary-button" data-submit-button>${item.id ? "Update Story" : "Save Story"}</button>
          ${item.id ? '<button type="button" class="text-button" data-cancel-edit>Cancel</button>' : ""}
        </div>
        <div data-form-status></div>
      </form>`);
  }

  function wireConditional(root) {
    const select = root.querySelector("[data-content-type]");
    if (!select) return;
    const update = () => {
      root.querySelectorAll("[data-field]").forEach((field) => {
        field.classList.toggle("hidden", !field.dataset.field.split(" ").includes(select.value));
      });
    };
    select.addEventListener("change", update);
    update();
  }

  async function news() {
    title.textContent = "News";
    setActive("news");
    setLoading("Loading news");
    await loadCategoriesCache();
    const items = await api("/api/admin/news");
    view.innerHTML = newsForm(state.editing || {}) + panel("All News Stories", `<table class="resource-table"><thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>${items.length ? items.map((item) => `<tr><td><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.shortDescription || "No summary added")}</small></td><td>${escapeHtml(state.categories.find((c) => c.id === item.categoryId)?.name || "News")}</td><td><span class="status-pill ${item.published ? "live" : "draft"}">${item.published ? "Published" : "Draft"}</span> ${item.isBreaking ? '<span class="status-pill hot">Breaking</span>' : ""} ${item.isFeatured ? '<span class="status-pill">Featured</span>' : ""}</td><td>${escapeHtml(formatDate(item.publishedAt))}</td><td class="row-actions"><button data-edit-news="${item.id}">Edit</button><button class="danger" data-delete="/api/news/${item.id}">Delete</button></td></tr>`).join("") : emptyRow("No news items yet. Add the first story above.", 5)}</tbody></table>`);
    wireConditional(view);
    wireSmartUploaders(view);
    view.querySelector("[data-news-form]").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = readForm(form);
      const id = form.dataset.id;
      const submit = form.querySelector("[data-submit-button]");
      submit.disabled = true;
      submit.textContent = id ? "Updating..." : "Saving...";
      try {
        await api(id ? `/api/news/${id}` : "/api/news", { method: id ? "PUT" : "POST", body: JSON.stringify(data) });
        toast(id ? "News updated successfully." : "News created successfully.");
        state.editing = null;
        await news();
      } catch (error) {
        formStatus(form, error.message, "danger");
        toast(error.message, "danger");
      } finally {
        submit.disabled = false;
        submit.textContent = id ? "Update Story" : "Save Story";
      }
    });
    view.querySelectorAll("[data-edit-news]").forEach((button) => button.addEventListener("click", () => { state.editing = items.find((item) => item.id === button.dataset.editNews); news(); }));
  }

  async function categories() {
    title.textContent = "Categories";
    setActive("categories");
    setLoading("Loading categories");
    const items = await api("/api/admin/categories");
    view.innerHTML = panel(state.editing ? "Edit Category" : "Add Category", `
      <form class="admin-form" data-category-form data-id="${state.editing?.id || ""}">
        <div class="form-grid">
          <label>Category Name<input name="name" required placeholder="Category name" value="${escapeHtml(state.editing?.name || "")}"></label>
          <label>Display Order<input name="order" type="number" value="${escapeHtml(state.editing?.order || 100)}"></label>
          <div class="check-row full-span"><label><input name="enabled" type="checkbox" ${state.editing?.enabled !== false ? "checked" : ""}> Enabled</label></div>
        </div>
        <div class="form-actions-row">
          <button class="primary-button" data-submit-button>${state.editing ? "Update Category" : "Save Category"}</button>
          ${state.editing ? '<button type="button" class="text-button" data-cancel-edit>Cancel</button>' : ""}
        </div>
        <div data-form-status></div>
      </form>`) + panel("All Categories", `<table class="resource-table"><thead><tr><th>Name</th><th>Slug</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead><tbody>${items.length ? items.map((item) => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.slug)}</td><td>${item.order}</td><td><span class="status-pill ${item.enabled ? "live" : "draft"}">${item.enabled ? "Enabled" : "Disabled"}</span></td><td class="row-actions"><button data-edit-category="${item.id}">Edit</button><button class="danger" data-delete="/api/categories/${item.id}">Delete</button></td></tr>`).join("") : emptyRow("No categories yet. Add one above.", 5)}</tbody></table>`);
    view.querySelector("[data-category-form]").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const id = form.dataset.id;
      const submit = form.querySelector("[data-submit-button]");
      submit.disabled = true;
      submit.textContent = "Saving...";
      try {
        await api(id ? `/api/categories/${id}` : "/api/categories", { method: id ? "PUT" : "POST", body: JSON.stringify(readForm(form)) });
        toast(id ? "Category updated successfully." : "Category created successfully.");
        state.editing = null;
        await categories();
      } catch (error) {
        formStatus(form, error.message, "danger");
        toast(error.message, "danger");
      } finally {
        submit.disabled = false;
        submit.textContent = id ? "Update Category" : "Save Category";
      }
    });
    view.querySelectorAll("[data-edit-category]").forEach((button) => button.addEventListener("click", () => { state.editing = items.find((item) => item.id === button.dataset.editCategory); categories(); }));
  }

  function adForm(item = {}) {
    item = item || {};
    const posStr = String(item.position || "home-strip");
    const posIncludes = (val) => posStr.split(",").map((s) => s.trim()).includes(val);

    const helpNotes = {
      banner: "🏷️ <strong>Banner Format</strong>: High-impact horizontal banner strip with a gold accent border. Great for main portal sponsors.",
      "image-text": "📰 <strong>Photo + Text Card</strong>: Balanced card layout showing photo thumbnail alongside bold title and promo copy.",
      card: "🃏 <strong>Full Promo Card</strong>: Vertical card format ideal for products, brand offers, or detailed announcements.",
      text: "💬 <strong>Text Only Format</strong>: Clean typography ad block without requiring an image. Ideal for press notes and quick text announcements.",
      image: "🖼️ <strong>Graphic Poster</strong>: Image-focused ad layout showcasing full artwork banner image."
    };

    const currentType = item.type || "banner";

    return panel(item.id ? "Edit Advertisement" : "Add Advertisement", `
      <form class="admin-form" data-ad-form data-id="${item.id || ""}">
        <div class="form-grid">
          <label class="full-span">Ad Title<input name="title" required placeholder="Advertisement title" value="${escapeHtml(item.title || "")}"></label>
          
          <label class="full-span">Ad Format Choice
            <select name="type" data-ad-format-select>
              <option value="banner" ${currentType === "banner" ? "selected" : ""}>🏷️ Banner Strip (Gold Accent Wide Banner)</option>
              <option value="image-text" ${currentType === "image-text" ? "selected" : ""}>📰 Photo + Text Card (Balanced Photo & Copy)</option>
              <option value="card" ${currentType === "card" ? "selected" : ""}>🃏 Full Promo Card (Vertical Product Card)</option>
              <option value="text" ${currentType === "text" ? "selected" : ""}>💬 Text Only (Clean Typography - No Image Needed)</option>
              <option value="image" ${currentType === "image" ? "selected" : ""}>🖼️ Graphic Poster (Full Photo Graphic Focus)</option>
            </select>
          </label>

          <div class="ad-format-help-box full-span" data-format-help-box>
            ${helpNotes[currentType] || helpNotes.banner}
          </div>
          
          ${renderSmartUploader("image", item.image || "", "Ad Graphic / Photo", "3/1")}
          
          <label class="full-span">Ad Text / Copy<textarea name="text" placeholder="Promotional description...">${escapeHtml(item.text || "")}</textarea></label>
          <label class="full-span">Destination Link (URL)<input name="destinationUrl" placeholder="https://..." value="${escapeHtml(item.destinationUrl || "")}"></label>
          
          <div class="full-span ad-positions-block">
            <label class="pos-label">Display Placements (Select all website areas where this ad will appear):</label>
            <div class="check-row positions-check-grid">
              <label class="pos-checkbox-card"><input type="checkbox" data-pos-check value="home-strip" ${posIncludes("home-strip") ? "checked" : ""}> <span>🏠 Homepage Ticker Strip</span></label>
              <label class="pos-checkbox-card"><input type="checkbox" data-pos-check value="sidebar" ${posIncludes("sidebar") ? "checked" : ""}> <span>📑 Article Sidebar</span></label>
              <label class="pos-checkbox-card"><input type="checkbox" data-pos-check value="article-bottom" ${posIncludes("article-bottom") ? "checked" : ""}> <span>📄 Below Article Content</span></label>
              <label class="pos-checkbox-card"><input type="checkbox" data-pos-check value="all" ${posIncludes("all") ? "checked" : ""}> <span>🌐 Everywhere (All Placement Areas)</span></label>
            </div>
            <small class="field-hint">💡 Select multiple checkboxes to feature this advertisement in more than one area at the same time.</small>
            <input type="hidden" name="position" data-position-input value="${escapeHtml(item.position || "home-strip")}">
          </div>

          <label>Priority / Sort Order<input name="priority" type="number" value="${escapeHtml(item.priority || 100)}"></label>
          <label>Start Date<input name="startDate" type="date" value="${escapeHtml(item.startDate || "")}"></label>
          <label>End Date<input name="endDate" type="date" value="${escapeHtml(item.endDate || "")}"></label>
          <div class="check-row full-span"><label><input name="active" type="checkbox" ${item.active !== false ? "checked" : ""}> Active Advertisement</label></div>
        </div>
        <div class="form-actions-row">
          <button class="primary-button" data-submit-button>${item.id ? "Update Advertisement" : "Save Advertisement"}</button>
          ${item.id ? '<button type="button" class="text-button" data-cancel-edit>Cancel</button>' : ""}
        </div>
        <div data-form-status></div>
      </form>`);
  }

  function wireAdFormEvents(root) {
    const formatSelect = root.querySelector("[data-ad-format-select]");
    const helpBox = root.querySelector("[data-format-help-box]");
    const helpNotes = {
      banner: "🏷️ <strong>Banner Format</strong>: High-impact horizontal banner strip with a gold accent border. Great for main portal sponsors.",
      "image-text": "📰 <strong>Photo + Text Card</strong>: Balanced card layout showing photo thumbnail alongside bold title and promo copy.",
      card: "🃏 <strong>Full Promo Card</strong>: Vertical card format ideal for products, brand offers, or detailed announcements.",
      text: "💬 <strong>Text Only Format</strong>: Clean typography ad block without requiring an image. Ideal for press notes and quick text announcements.",
      image: "🖼️ <strong>Graphic Poster</strong>: Image-focused ad layout showcasing full artwork banner image."
    };

    formatSelect?.addEventListener("change", () => {
      const val = formatSelect.value || "banner";
      if (helpBox) helpBox.innerHTML = helpNotes[val] || helpNotes.banner;
    });

    const posChecks = root.querySelectorAll("[data-pos-check]");
    const posInput = root.querySelector("[data-position-input]");

    const syncPositions = () => {
      const selected = Array.from(posChecks).filter((c) => c.checked).map((c) => c.value);
      if (posInput) posInput.value = selected.length ? selected.join(",") : "home-strip";
    };

    posChecks.forEach((check) => check.addEventListener("change", syncPositions));
  }

  async function advertisements() {
    title.textContent = "Advertisements";
    setActive("advertisements");
    setLoading("Loading advertisements");
    const items = await api("/api/admin/advertisements");
    view.innerHTML = adForm(state.editing || {}) + panel("All Advertisements", `<table class="resource-table"><thead><tr><th>Title</th><th>Format</th><th>Position</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>${items.length ? items.map((item) => `<tr><td><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.destinationUrl || item.text || "No destination")}</small></td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.position)}</td><td>${item.priority}</td><td><span class="status-pill ${item.active ? "live" : "draft"}">${item.active ? "Active" : "Inactive"}</span></td><td class="row-actions"><button data-edit-ad="${item.id}">Edit</button><button class="danger" data-delete="/api/advertisements/${item.id}">Delete</button></td></tr>`).join("") : emptyRow("No advertisements yet. Add a banner, card, or text placement above.", 6)}</tbody></table>`);
    wireSmartUploaders(view);
    wireAdFormEvents(view);
    view.querySelector("[data-ad-form]").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const id = form.dataset.id;
      const submit = form.querySelector("[data-submit-button]");
      submit.disabled = true;
      submit.textContent = "Saving...";
      try {
        await api(id ? `/api/advertisements/${id}` : "/api/advertisements", { method: id ? "PUT" : "POST", body: JSON.stringify(readForm(form)) });
        toast(id ? "Advertisement updated successfully." : "Advertisement created successfully.");
        state.editing = null;
        await advertisements();
      } catch (error) {
        formStatus(form, error.message, "danger");
        toast(error.message, "danger");
      } finally {
        submit.disabled = false;
        submit.textContent = id ? "Update Advertisement" : "Save Advertisement";
      }
    });
    view.querySelectorAll("[data-edit-ad]").forEach((button) => button.addEventListener("click", () => { state.editing = items.find((item) => item.id === button.dataset.editAd); advertisements(); }));
  }

  async function slides() {
    title.textContent = "Slides";
    setActive("slides");
    setLoading("Loading slides");
    const items = await api("/api/admin/slides");
    view.innerHTML = panel(state.editing ? "Edit Slide" : "Add Slide", `
      <form class="admin-form" data-slide-form data-id="${state.editing?.id || ""}">
        <div class="form-grid">
          <label>Slide Title<input name="title" required placeholder="Slide headline" value="${escapeHtml(state.editing?.title || "")}"></label>
          <label>Display Order<input name="order" type="number" value="${escapeHtml(state.editing?.order || 100)}"></label>
          
          ${renderSmartUploader("image", state.editing?.image || "", "Slide Widescreen Photo", "16/9")}
          
          <label class="full-span">Description<textarea name="description" placeholder="Slide summary...">${escapeHtml(state.editing?.description || "")}</textarea></label>
          <label class="full-span">Link Destination<input name="link" placeholder="/search or https://..." value="${escapeHtml(state.editing?.link || "")}"></label>
          <div class="check-row full-span"><label><input name="active" type="checkbox" ${state.editing?.active !== false ? "checked" : ""}> Active Slide</label></div>
        </div>
        <div class="form-actions-row">
          <button class="primary-button" data-submit-button>${state.editing ? "Update Slide" : "Save Slide"}</button>
          ${state.editing ? '<button type="button" class="text-button" data-cancel-edit>Cancel</button>' : ""}
        </div>
        <div data-form-status></div>
      </form>`) + panel("All Homepage Slides", `<table class="resource-table"><thead><tr><th>Title</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead><tbody>${items.length ? items.map((item) => `<tr><td><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description || "No description")}</small></td><td>${item.order}</td><td><span class="status-pill ${item.active ? "live" : "draft"}">${item.active ? "Active" : "Inactive"}</span></td><td class="row-actions"><button data-edit-slide="${item.id}">Edit</button><button class="danger" data-delete="/api/slides/${item.id}">Delete</button></td></tr>`).join("") : emptyRow("No slides yet. Add a homepage slide above.", 4)}</tbody></table>`);
    wireSmartUploaders(view);
    view.querySelector("[data-slide-form]").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const id = form.dataset.id;
      const submit = form.querySelector("[data-submit-button]");
      submit.disabled = true;
      submit.textContent = "Saving...";
      try {
        await api(id ? `/api/slides/${id}` : "/api/slides", { method: id ? "PUT" : "POST", body: JSON.stringify(readForm(form)) });
        toast(id ? "Slide updated successfully." : "Slide created successfully.");
        state.editing = null;
        await slides();
      } catch (error) {
        formStatus(form, error.message, "danger");
        toast(error.message, "danger");
      } finally {
        submit.disabled = false;
        submit.textContent = id ? "Update Slide" : "Save Slide";
      }
    });
    view.querySelectorAll("[data-edit-slide]").forEach((button) => button.addEventListener("click", () => { state.editing = items.find((item) => item.id === button.dataset.editSlide); slides(); }));
  }

  async function settings() {
    title.textContent = "Settings";
    setActive("settings");
    setLoading("Loading settings");
    const item = await api("/api/admin/settings");
    view.innerHTML = panel("Brand & Site Settings", `
      <form class="admin-form" data-settings-form>
        <div class="form-grid">
          <label>Brand Name<input name="brandName" value="${escapeHtml(item.brandName || "")}"></label>
          <label>Tagline<input name="tagline" value="${escapeHtml(item.tagline || "")}"></label>
          
          ${renderSmartUploader("brandLogo", item.brandLogo || "", "Brand Logo", "1/1")}
          
          <label>Site URL<input name="siteUrl" value="${escapeHtml(item.siteUrl || "")}"></label>
          <label>Contact Email<input name="contactEmail" value="${escapeHtml(item.contactEmail || "")}"></label>
          <label class="full-span">Description<textarea name="description">${escapeHtml(item.description || "")}</textarea></label>
          <label>Facebook<input name="facebook" value="${escapeHtml(item.social?.facebook || "")}"></label>
          <label>YouTube<input name="youtube" value="${escapeHtml(item.social?.youtube || "")}"></label>
          <label>X / Twitter<input name="x" value="${escapeHtml(item.social?.x || "")}"></label>
          <label>Instagram<input name="instagram" value="${escapeHtml(item.social?.instagram || "")}"></label>
        </div>
        <div class="form-actions-row">
          <button class="primary-button" data-submit-button>Save Settings</button>
        </div>
        <div data-form-status></div>
      </form>`);
    wireSmartUploaders(view);
    view.querySelector("[data-settings-form]").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submit = form.querySelector("[data-submit-button]");
      submit.disabled = true;
      submit.textContent = "Saving...";
      try {
        await api("/api/settings", { method: "PUT", body: JSON.stringify(readForm(form)) });
        formStatus(form, "Settings saved successfully.", "success");
        toast("Settings saved successfully.");
      } catch (error) {
        formStatus(form, error.message, "danger");
        toast(error.message, "danger");
      } finally {
        submit.disabled = false;
        submit.textContent = "Save Settings";
      }
    });
  }

  function wireDeleteAndCancel() {
    view.onclick = async (event) => {
      const del = event.target.closest("[data-delete]");
      if (del) {
        if (!confirm("Delete this item? This action cannot be undone.")) return;
        try {
          await api(del.dataset.delete, { method: "DELETE" });
          toast("Item deleted successfully.");
          state.editing = null;
          await boot();
        } catch (error) {
          toast(error.message, "danger");
        }
      }
      if (event.target.closest("[data-cancel-edit]")) {
        state.editing = null;
        await boot();
      }
    };
  }

  async function boot() {
    const route = routeMap[location.pathname] || "dashboard";
    state.editing = state.editing;
    if (route !== "news" && route !== "advertisements" && route !== "slides" && route !== "categories") state.editing = null;
    try {
      await ({ dashboard, news, advertisements, slides, categories, settings }[route])();
      wireDeleteAndCancel();
    } catch (error) {
      view.innerHTML = `<div class="error-state"><strong>Something went wrong</strong><p>${escapeHtml(error.message)}</p><button class="primary-button" data-retry>Retry</button></div>`;
      view.querySelector("[data-retry]").addEventListener("click", boot);
      toast(error.message, "danger");
    }
  }

  document.querySelectorAll(".admin-sidebar nav a").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const href = link.getAttribute("href");
      if (href && href !== location.pathname) {
        history.pushState({}, "", href);
        state.editing = null;
        boot();
      }
    });
  });
  window.addEventListener("popstate", () => {
    state.editing = null;
    boot();
  });

  document.querySelector("[data-logout]").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" });
    location.href = "/admin/login";
  });

  api("/api/auth/status").then((status) => {
    state.csrfToken = status.csrfToken;
    if (!status.authenticated) location.href = "/admin/login";
    else boot();
  }).catch((error) => {
    view.innerHTML = `<div class="error-state"><strong>Admin session failed</strong><p>${escapeHtml(error.message)}</p></div>`;
  });
})();
