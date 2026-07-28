import fs from "node:fs/promises";
import path from "node:path";
import { assetUploadsDir } from "../middleware/upload.middleware.js";

type UploadedFileRef = {
  filename: string;
};

export async function cleanupUploadedFiles(files: UploadedFileRef[]): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.unlink(path.join(assetUploadsDir, file.filename));
      } catch {
        // Ignore missing files during cleanup.
      }
    }),
  );
}
