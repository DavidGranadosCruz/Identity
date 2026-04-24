# Identity

Aplicación web de recreación fotográfica que preserva tu identidad.
Sube tus fotos, sube una imagen de referencia y genera variantes realistas con tu rostro.

## Requisitos

Solo necesitas **Docker Desktop** instalado y ejecutándose.

- [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop)

## Instalación y arranque

### Windows

Haz doble clic en **`setup.bat`** y espera. Todo se configura automáticamente.

### Mac / Linux

```bash
chmod +x setup.sh
./setup.sh
```

### O manualmente (3 comandos)

```bash
cp .env.example .env
docker compose up --build -d
```

Eso es todo. La primera vez tarda unos minutos en descargar las imágenes.

## Acceso

| Servicio        | URL                          |
|-----------------|------------------------------|
| **Aplicación**  | http://localhost:3000         |
| **MinIO panel** | http://localhost:9001         |

## Comandos útiles

```bash
docker compose up -d       # Arrancar (si ya está construido)
docker compose down         # Parar todo
docker compose logs -f      # Ver logs en tiempo real
docker compose up --build   # Reconstruir tras cambios en código
```

## Configuración opcional

### Gemini (análisis avanzado de referencias)

Si quieres análisis estructurado de imágenes de referencia, edita `.env` y añade tu API key:

```
GEMINI_API_KEY=tu-api-key-aquí
```

Sin ella, el sistema funciona perfectamente usando solo el motor de visión local.

### Ajustes avanzados

Todos los parámetros configurables están documentados en `.env.example`.
Los valores por defecto funcionan bien para uso local — no necesitas cambiar nada.

## Cómo funciona

1. **Regístrate** y crea tu cuenta.
2. **Crea un Identity Pack** subiendo fotos de tu rostro.
3. El sistema analiza tus fotos automáticamente (detección facial, calidad, consistencia).
4. **Sube una imagen de referencia** (la pose/escena que quieres recrear).
5. **Genera variantes** — el sistema intercambia tu rostro en la referencia y valida el resultado.
6. Descarga los resultados desde el historial.

## Stack técnico

- **Frontend:** Next.js 15 + TypeScript + Tailwind + shadcn/ui
- **Backend:** Next.js Route Handlers + Prisma ORM
- **Base de datos:** PostgreSQL
- **Almacenamiento:** MinIO (S3-compatible)
- **Motor de visión:** Detección facial determinista local
- **Motor de generación:** FaceFusion (headless)
- **Análisis de referencia:** Gemini (opcional)
- **Cola de trabajos:** Tabla `Job` en DB + servicio worker dedicado

## Tests

```bash
pnpm install
pnpm test
```

## Uso responsable

- Sube solo fotos propias o con consentimiento.
- No usar para suplantación, acoso ni usos ilegales.
- Cumple con la legislación local.
