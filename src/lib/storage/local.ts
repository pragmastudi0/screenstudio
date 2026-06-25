import { promises as fs } from "fs";
import path from "path";
import { env } from "@/lib/env";
import type { StorageDriver, PutObjectInput } from "./types";

// Driver de almacenamiento en disco local.
// Los archivos se sirven a través de la ruta /api/files/[...key].
export class LocalStorageDriver implements StorageDriver {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);
  }

  private resolve(key: string) {
    // Evita path traversal.
    const safe = key.replace(/\.\.(\/|\\|$)/g, "");
    return path.join(this.baseDir, safe);
  }

  async put({ key, body }: PutObjectInput): Promise<{ key: string }> {
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
    return { key };
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  async url(key: string): Promise<string> {
    return `/api/files/${key}`;
  }
}
