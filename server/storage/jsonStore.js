const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;

function getCloudinaryConfig() {
  return {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  };
}

function isCloudinaryConfigured() {
  const config = getCloudinaryConfig();
  return Boolean(config.cloud_name && config.api_key && config.api_secret);
}

class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
    this.hasSyncedOnStartup = false;
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

  async syncCloudinaryWrite(data) {
    if (!isCloudinaryConfigured()) return;
    try {
      cloudinary.config(getCloudinaryConfig());
      const filename = path.basename(this.filePath);
      const jsonString = JSON.stringify(data, null, 2);
      const buffer = Buffer.from(jsonString, "utf8");
      const dataUri = `data:application/json;base64,${buffer.toString("base64")}`;
      await cloudinary.uploader.upload(dataUri, {
        public_id: `nrkhabor-data/${filename}`,
        resource_type: "raw",
        overwrite: true,
        invalidate: true
      });
      console.log(`[CloudinarySync] Saved ${filename} to Cloudinary raw storage.`);
    } catch (err) {
      console.error(`[CloudinarySync] Write sync error for ${path.basename(this.filePath)}:`, err.message);
    }
  }

  async syncCloudinaryStartup() {
    if (this.hasSyncedOnStartup) return;
    this.hasSyncedOnStartup = true;
    if (!isCloudinaryConfigured()) return;

    try {
      cloudinary.config(getCloudinaryConfig());
      const filename = path.basename(this.filePath);
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const remoteUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/nrkhabor-data/${filename}?t=${Date.now()}`;
      
      const res = await fetch(remoteUrl);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) {
          const parsed = JSON.parse(text);
          await this.ensureFile();
          const temp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
          await fs.writeFile(temp, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
          await fs.rename(temp, this.filePath);
          console.log(`[CloudinarySync] Restored latest ${filename} from Cloudinary on startup.`);
        }
      }
    } catch (err) {
      console.warn(`[CloudinarySync] Startup sync warning for ${path.basename(this.filePath)}:`, err.message);
    }
  }

  async rawRead() {
    await this.syncCloudinaryStartup();
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
      await this.syncCloudinaryWrite(data);
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
      await this.syncCloudinaryWrite(items);
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
      await this.syncCloudinaryWrite(items);
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
      await this.syncCloudinaryWrite(next);
      return true;
    });
  }
}

module.exports = JsonStore;
