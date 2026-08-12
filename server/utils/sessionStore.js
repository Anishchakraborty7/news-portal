const fs = require("fs/promises");
const path = require("path");
const session = require("express-session");

class FileSessionStore extends session.Store {
  constructor(options = {}) {
    super(options);
    this.dir = options.dir || path.join(__dirname, "..", "..", "data", "sessions");
    fs.mkdir(this.dir, { recursive: true }).catch(() => {});
  }

  filePath(sid) {
    const cleanSid = String(sid || "").replace(/[^a-zA-Z0-9_-]/g, "");
    return path.join(this.dir, `${cleanSid}.json`);
  }

  async get(sid, callback) {
    try {
      const file = this.filePath(sid);
      const data = await fs.readFile(file, "utf8");
      const sess = JSON.parse(data);
      if (sess.cookie && sess.cookie.expires) {
        if (new Date(sess.cookie.expires) <= new Date()) {
          await fs.unlink(file).catch(() => {});
          return callback(null, null);
        }
      }
      callback(null, sess);
    } catch {
      callback(null, null);
    }
  }

  async set(sid, sess, callback) {
    try {
      await fs.mkdir(this.dir, { recursive: true }).catch(() => {});
      const file = this.filePath(sid);
      const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(temp, JSON.stringify(sess, null, 2), "utf8").catch(() => {});
      await fs.rename(temp, file).catch(() => {});
      if (callback) callback(null);
    } catch {
      if (callback) callback(null);
    }
  }

  async destroy(sid, callback) {
    try {
      const file = this.filePath(sid);
      await fs.unlink(file).catch(() => {});
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  async touch(sid, sess, callback) {
    this.set(sid, sess, callback);
  }
}

module.exports = FileSessionStore;
