const path = require("path");
const JsonStore = require("./jsonStore");
const createResourceStore = require("./resourceStore");

const dataDir = path.join(__dirname, "..", "..", "data");

module.exports = {
  news: createResourceStore("news.json", { slugFrom: "title", sortBy: "publishedAt" }),
  categories: createResourceStore("categories.json", { slugFrom: "name", sortBy: "order" }),
  advertisements: createResourceStore("advertisements.json", { sortBy: "priority" }),
  slides: createResourceStore("slides.json", { sortBy: "order" }),
  messages: createResourceStore("messages.json", { sortBy: "createdAt" }),
  settings: new JsonStore(path.join(dataDir, "settings.json")),
  admin: new JsonStore(path.join(dataDir, "admin.json"))
};
