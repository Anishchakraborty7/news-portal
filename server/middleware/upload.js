const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const allowedExt = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);
const uploadDir = path.join(__dirname, "..", "..", "uploads");

const localStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!allowedExt.has(ext) || !allowedMime.has(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, and WEBP images are allowed"));
  }
  cb(null, true);
}

const upload = multer({
  storage: localStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

if (cloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

async function uploadResponse(req, res) {
  if (!req.file) return res.status(400).json({ error: "Image file is required" });
  if (cloudinaryConfigured()) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "premium-news-portal",
      resource_type: "image"
    });
    return res.json({ url: result.secure_url, provider: "cloudinary" });
  }
  return res.json({ url: `/uploads/${req.file.filename}`, provider: "local" });
}

module.exports = { upload, uploadResponse };
