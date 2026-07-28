import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const assetUploadsDir = path.join(__dirname, "..", "..", "uploads", "assets");

if (!fs.existsSync(assetUploadsDir)) {
  fs.mkdirSync(assetUploadsDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/octet-stream",
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function isAllowedAssetImage(
  mimetype: string,
  originalname: string,
): boolean {
  const ext = path.extname(originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    return true;
  }
  return ALLOWED_MIME_TYPES.has(mimetype);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, assetUploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

export const assetImageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (isAllowedAssetImage(file.mimetype, file.originalname)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only jpg, jpeg, png, and webp images are allowed"));
  },
});
