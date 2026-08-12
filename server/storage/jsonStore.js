const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
  }

  enqueue(task) {
    const next = this.queue.catch(() => {}).then(task);
    this.queue = next;
    return next;
  }

  async ensureFile() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, "[]\n", "utf8");
    }
  }

  async rawRead() {
    await this.ensureFile();
    const raw = await fs.readFile(this.filePath, "utf8");
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  }

  async read() {
    return this.rawRead();
  }

  async write(data) {
    return this.enqueue(async () => {
      await this.ensureFile();
      const temp = `${this.filePath}.${process.pid}.${Date.now()}-${Math.random().toString(36).slice(2, 6)}.tmp`;
      await fs.writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
      await fs.rename(temp, this.filePath);
    });
  }

  async all() {
    return this.read();
  }

  async getById(id) {
    const items = await this.read();
    return items.find((item) => item.id === id || item.slug === id) || null;
  }

  async create(input) {
    return this.enqueue(async () => {
      const items = await this.rawRead();
      const now = new Date().toISOString();
      const item = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...input
      };
      items.push(item);
      const temp = `${this.filePath}.${process.pid}.${Date.now()}-${Math.random().toString(36).slice(2, 6)}.tmp`;
      await fs.writeFile(temp, `${JSON.stringify(items, null, 2)}\n`, "utf8");
      await fs.rename(temp, this.filePath);
      return item;
    });
  }

  async update(id, input) {
    return this.enqueue(async () => {
      const items = await this.rawRead();
      const index = items.findIndex((item) => item.id === id || item.slug === id);
      if (index === -1) return null;
      items[index] = {
        ...items[index],
        ...input,
        id: items[index].id,
        updatedAt: new Date().toISOString()
      };
      const temp = `${this.filePath}.${process.pid}.${Date.now()}-${Math.random().toString(36).slice(2, 6)}.tmp`;
      await fs.writeFile(temp, `${JSON.stringify(items, null, 2)}\n`, "utf8");
      await fs.rename(temp, this.filePath);
      return items[index];
    });
  }

  async delete(id) {
    return this.enqueue(async () => {
      const items = await this.rawRead();
      const next = items.filter((item) => item.id !== id && item.slug !== id);
      if (next.length === items.length) return false;
      const temp = `${this.filePath}.${process.pid}.${Date.now()}-${Math.random().toString(36).slice(2, 6)}.tmp`;
      await fs.writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
      await fs.rename(temp, this.filePath);
      return true;
    });
  }
}

module.exports = JsonStore;
