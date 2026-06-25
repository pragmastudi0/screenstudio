// Contrato común para los drivers de almacenamiento.
// Permite cambiar entre disco local, MinIO o S3 sin tocar el resto del código.

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StorageDriver {
  /** Guarda un objeto y devuelve su clave. */
  put(input: PutObjectInput): Promise<{ key: string }>;
  /** Devuelve el contenido binario de un objeto. */
  get(key: string): Promise<Buffer>;
  /** Elimina un objeto. */
  delete(key: string): Promise<void>;
  /** URL para servir/descargar el objeto (pública o firmada). */
  url(key: string): Promise<string>;
}
