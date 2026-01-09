import archiver from "archiver";
import unzipper from "unzipper";
import { promises as fs } from "fs";
import path from "path";

export async function zipJsonFiles(outZipPath, files) {
  await fs.mkdir(path.dirname(outZipPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outZipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(outZipPath));
    archive.on("error", reject);

    archive.pipe(output);

    for (const f of files) {
      archive.file(f.path, { name: f.name });
    }

    archive.finalize();
  });
}

export async function unzipToTemp(zipPath, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: outDir })).promise();
  return outDir;
}
