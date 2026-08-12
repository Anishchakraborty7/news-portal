const { spawn } = require("child_process");

const port = 3137;
const base = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  PORT: String(port),
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "change-this-password",
  SESSION_SECRET: "smoke-test-secret"
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, options);
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {}
  return { res, data, text };
}

function cookieFrom(res) {
  return res.headers.get("set-cookie")?.split(";")[0] || "";
}

(async () => {
  const child = spawn(process.execPath, ["server/app.js"], { env, stdio: "pipe" });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });

  try {
    for (let index = 0; index < 60; index += 1) {
      try {
        const health = await request("/api/home");
        if (health.res.ok) break;
      } catch {}
      await wait(300);
    }

    const home = await request("/api/home");
    if (!home.res.ok || !Array.isArray(home.data.latestNews)) throw new Error("Home API failed");

    const index = await request("/");
    if (!index.res.ok) throw new Error("Homepage failed");

    const protectedApi = await request("/api/admin/dashboard");
    if (protectedApi.res.status !== 401) throw new Error("Admin API is not protected");

    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "change-this-password" })
    });
    if (!login.res.ok || !login.data.csrfToken) throw new Error("Admin login failed");
    const cookie = cookieFrom(login.res);
    const csrf = login.data.csrfToken;

    const dashboard = await request("/api/admin/dashboard", { headers: { cookie } });
    if (!dashboard.res.ok) throw new Error("Authenticated dashboard failed");

    const createdCat = await request("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf, cookie },
      body: JSON.stringify({ name: "Smoke Test Category", enabled: true, order: 999 })
    });
    if (!createdCat.res.ok) throw new Error(`Category create failed: ${createdCat.text}`);

    const createdNews = await request("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf, cookie },
      body: JSON.stringify({
        title: "Smoke Test Headline",
        categoryId: createdCat.data.id,
        contentType: "image",
        published: true,
        shortDescription: "Smoke test short description for civic news",
        content: "Full smoke test content text here."
      })
    });
    if (!createdNews.res.ok) throw new Error(`News create failed: ${createdNews.text}`);

    const updatedCat = await request(`/api/categories/${createdCat.data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf, cookie },
      body: JSON.stringify({ name: "Smoke Test Category Updated", enabled: true, order: 998 })
    });
    if (!updatedCat.res.ok) throw new Error("Category update failed");

    const detailPath = `/news/${createdNews.data.slug || createdNews.data.id}`;
    const detail = await request(detailPath);
    if (!detail.res.ok || !detail.text.includes("Smoke Test Headline")) throw new Error("News detail failed");

    const categoryTest = await request(`/category/${updatedCat.data.slug}`);
    if (!categoryTest.res.ok || !categoryTest.text.includes("Smoke Test Headline")) {
      throw new Error("Category card rendering failed");
    }

    const searchTest = await request("/search?q=civic");
    if (!searchTest.res.ok || !searchTest.text.includes("Smoke Test Headline")) {
      throw new Error("Search card rendering failed");
    }

    await request(`/api/news/${createdNews.data.id}`, {
      method: "DELETE",
      headers: { "x-csrf-token": csrf, cookie }
    });

    const deletedCat = await request(`/api/categories/${createdCat.data.id}`, {
      method: "DELETE",
      headers: { "x-csrf-token": csrf, cookie }
    });
    if (!deletedCat.res.ok) throw new Error("Category delete failed");

    const sitemap = await request("/sitemap.xml");
    if (!sitemap.res.ok || !sitemap.text.includes("<urlset")) throw new Error("Sitemap failed");

    console.log("Smoke tests passed");
  } catch (error) {
    console.error(output);
    console.error(error);
    process.exitCode = 1;
  } finally {
    child.kill("SIGTERM");
  }
})();
