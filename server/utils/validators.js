const sanitizeHtml = require("sanitize-html");

const newsTypes = new Set(["image", "youtube", "facebook", "external", "video"]);
const adTypes = new Set(["text", "image", "image-text", "banner", "card"]);

function cleanText(value, max = 5000) {
  return sanitizeHtml(String(value || ""), {
    allowedTags: ["p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "blockquote", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"]
  }).slice(0, max);
}

function isValidUrl(value, required = false) {
  if (!value) return !required;
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function bool(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function requireField(errors, data, field, label) {
  if (!String(data[field] || "").trim()) errors.push(`${label} is required`);
}

function validateNews(data) {
  const errors = [];
  requireField(errors, data, "title", "Title");
  requireField(errors, data, "categoryId", "Category");
  if (!newsTypes.has(data.contentType)) errors.push("Valid content type is required");
  if (data.youtubeUrl && !isValidUrl(data.youtubeUrl)) errors.push("YouTube URL is invalid");
  if (data.facebookUrl && !isValidUrl(data.facebookUrl)) errors.push("Facebook URL is invalid");
  if (data.externalUrl && !isValidUrl(data.externalUrl)) errors.push("External URL is invalid");
  if (data.contentType === "youtube" && !data.youtubeUrl) errors.push("YouTube URL is required");
  if (data.contentType === "facebook" && !data.facebookUrl) errors.push("Facebook URL is required");
  if (["external", "video"].includes(data.contentType) && !data.externalUrl) errors.push("External URL is required");
  return errors;
}

function normalizeNews(data) {
  return {
    title: String(data.title || "").trim().slice(0, 180),
    categoryId: String(data.categoryId || "").trim(),
    contentType: data.contentType || "image",
    thumbnail: String(data.thumbnail || "").trim(),
    youtubeUrl: String(data.youtubeUrl || "").trim(),
    facebookUrl: String(data.facebookUrl || "").trim(),
    externalUrl: String(data.externalUrl || "").trim(),
    shortDescription: cleanText(data.shortDescription, 320),
    content: cleanText(data.content, 10000),
    source: String(data.source || "").trim().slice(0, 120),
    isBreaking: bool(data.isBreaking),
    isFeatured: bool(data.isFeatured),
    published: bool(data.published),
    publishedAt: data.publishedAt ? new Date(data.publishedAt).toISOString() : new Date().toISOString()
  };
}

function validateAdvertisement(data) {
  const errors = [];
  requireField(errors, data, "title", "Title");
  if (!adTypes.has(data.type)) errors.push("Valid advertisement type is required");
  if (data.destinationUrl && !isValidUrl(data.destinationUrl)) errors.push("Destination URL is invalid");
  if (["image", "image-text", "banner", "card"].includes(data.type) && !data.image) {
    errors.push("Image is required for this advertisement type");
  }
  return errors;
}

function normalizeAdvertisement(data) {
  return {
    title: String(data.title || "").trim().slice(0, 140),
    type: data.type || "text",
    text: cleanText(data.text, 600),
    image: String(data.image || "").trim(),
    destinationUrl: String(data.destinationUrl || "").trim(),
    position: String(data.position || "home-strip").trim(),
    priority: Number(data.priority || 100),
    startDate: data.startDate || "",
    endDate: data.endDate || "",
    active: bool(data.active)
  };
}

module.exports = {
  cleanText,
  isValidUrl,
  bool,
  validateNews,
  normalizeNews,
  validateAdvertisement,
  normalizeAdvertisement
};
