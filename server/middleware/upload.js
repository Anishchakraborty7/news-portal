const path = require("path");
const fs = require("fs");
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

function getCloudinaryConfig() {
  return {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  };
}

function cloudinaryConfigured() {
  const config = getCloudinaryConfig();
  return Boolean(config.cloud_name && config.api_key && config.api_secret);
}

async function uploadResponse(req, res) {
  if (!req.file) return res.status(400).json({ error: "Image file is required" });

  if (cloudinaryConfigured()) {
    try {
      cloudinary.config(getCloudinaryConfig());
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "nrkhabor-portal",
        resource_type: "image"
      });

      // Remove local temporary file after successful Cloudinary upload
      if (fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Could not remove temp file:", err);
        });
      }

      return res.json({ url: result.secure_url, provider: "cloudinary" });
    } catch (err) {
      console.error("Cloudinary upload failed, falling back to local:", err.message);
      return res.json({ url: `/uploads/${req.file.filename}`, provider: "local" });
    }
  }

  return res.json({ url: `/uploads/${req.file.filename}`, provider: "local" });
}

module.exports = { upload, uploadResponse };

