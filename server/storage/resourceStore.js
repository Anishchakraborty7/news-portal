const path = require("path");
const JsonStore = require("./jsonStore");
const { uniqueSlug } = require("../utils/slug");

const dataDir = path.join(__dirname, "..", "..", "data");

function createResourceStore(filename, options = {}) {
  const store = new JsonStore(path.join(dataDir, filename));
  const sortBy = options.sortBy || "createdAt";

  async function getAll() {
    const items = await store.all();
    return items.sort((a, b) => {
      if (sortBy === "priority") return (a.priority ?? 999) - (b.priority ?? 999);
      if (sortBy === "order") return (a.order ?? 999) - (b.order ?? 999);
      return String(b[sortBy] || "").localeCompare(String(a[sortBy] || ""));
    });
  }

  async function create(input) {
    const items = await store.all();
    const payload = { ...input };
    if (options.slugFrom) {
      payload.slug = uniqueSlug(payload[options.slugFrom], items);
    }
    return store.create(payload);
  }

  async function update(id, input) {
    const items = await store.all();
    const current = items.find((item) => item.id === id || item.slug === id);
    if (!current) return null;
    const payload = { ...input };
    if (options.slugFrom && payload[options.slugFrom]) {
      payload.slug = uniqueSlug(payload[options.slugFrom], items, current.id);
    }
    return store.update(id, payload);
  }

  return {
    getAll,
    getById: (id) => store.getById(id),
    create,
    update,
    delete: (id) => store.delete(id),
    save: (data) => store.write(data)
  };
}

module.exports = createResourceStore;
