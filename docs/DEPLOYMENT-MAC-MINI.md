# Despliegue en un Mac Mini propio (sin Supabase)

Esta guía deja la app corriendo de forma permanente en tu Mac Mini, con PostgreSQL
local y almacenamiento en disco. Nada depende de servicios de pago.

## 0. Requisitos

```bash
# Homebrew (si no lo tienes): https://brew.sh
brew install node@20 postgresql@16
brew install --cask docker   # opcional, si prefieres Postgres/MinIO en Docker
```

## 1. Base de datos PostgreSQL

### Opción A — PostgreSQL nativo (recomendado para Mac Mini)

```bash
brew services start postgresql@16
createdb demogen
# Crea un usuario dedicado (opcional):
psql demogen -c "CREATE USER demo WITH PASSWORD 'demo'; GRANT ALL ON DATABASE demogen TO demo;"
```

`DATABASE_URL="postgresql://demo:demo@localhost:5432/demogen?schema=public"`

### Opción B — Docker

```bash
docker compose up -d postgres      # solo el servicio postgres
```

## 2. Código y variables

```bash
git clone <tu-repo> demo-generator-ai
cd demo-generator-ai
npm install
cp .env.example .env
```

Edita `.env`:

```ini
DATABASE_URL="postgresql://demo:demo@localhost:5432/demogen?schema=public"
JWT_SECRET="<pega aquí: openssl rand -base64 48>"
GEMINI_API_KEY="<tu clave de https://aistudio.google.com/apikey>"   # opcional
STORAGE_DRIVER="local"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 3. Migrar y sembrar

```bash
npm run db:push
npm run db:seed
```

## 4. Build de producción

```bash
npm run build
npm run start          # arranca en http://localhost:3000
```

## 5. Mantenerlo vivo

### Opción A — PM2

```bash
npm install -g pm2
pm2 start "npm run start" --name demogen
pm2 save
pm2 startup            # sigue las instrucciones para arranque automático
```

### Opción B — launchd (nativo de macOS)

Crea `~/Library/LaunchAgents/com.demogen.app.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>            <string>com.demogen.app</string>
  <key>WorkingDirectory</key> <string>/Users/TU_USUARIO/demo-generator-ai</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/npm</string>
    <string>run</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>        <true/>
  <key>KeepAlive</key>        <true/>
  <key>StandardOutPath</key>  <string>/tmp/demogen.log</string>
  <key>StandardErrorPath</key><string>/tmp/demogen.err</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.demogen.app.plist
```

## 6. Acceso remoto (opcional)

Para exponer la app fuera de tu red sin abrir puertos:

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
```

Te dará una URL pública `https://...trycloudflare.com`. Para un dominio fijo, crea un
túnel con nombre y apunta tu dominio. **Recuerda** poner esa URL en `NEXT_PUBLIC_APP_URL`
y usar `secure` cookies (ya activado automáticamente en producción).

## 7. Backups

```bash
# Base de datos
pg_dump demogen > backup-$(date +%F).sql

# Archivos subidos
tar czf storage-$(date +%F).tar.gz storage/uploads
```

Automatiza con un `cron`/`launchd` diario.

## 8. Migrar a MinIO/S3 más adelante

1. Levanta MinIO: `docker compose up -d minio createbuckets`.
2. En `.env`: `STORAGE_DRIVER="s3"` y completa las `S3_*` (ya apuntan a MinIO local).
3. Reinicia. Las nuevas subidas irán a MinIO; migra las antiguas copiando `storage/uploads`
   al bucket con `mc cp --recursive`.

## Checklist

- [ ] PostgreSQL accesible y `db:push` ejecutado
- [ ] `JWT_SECRET` aleatorio y fuerte
- [ ] `npm run build` sin errores
- [ ] Proceso gestionado por PM2/launchd con reinicio automático
- [ ] Backups programados
