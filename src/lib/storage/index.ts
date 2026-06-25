import { env } from "@/lib/env";
import type { StorageDriver } from "./types";
import { LocalStorageDriver } from "./local";
import { S3StorageDriver } from "./s3";

let driver: StorageDriver | null = null;

// Selecciona el driver según STORAGE_DRIVER. Singleton perezoso.
export function storage(): StorageDriver {
  if (driver) return driver;
  driver = env.STORAGE_DRIVER === "s3" ? new S3StorageDriver() : new LocalStorageDriver();
  return driver;
}

export type { StorageDriver } from "./types";
