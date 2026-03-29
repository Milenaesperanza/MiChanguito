# Carrito inteligente — Guía de setup

## Estructura del proyecto

```
carrito/
├── public/
│   └── index.html              ← App web (subir a Netlify)
├── supabase/
│   ├── schema.sql              ← Ejecutar en Supabase SQL Editor
│   └── functions/
│       └── scan-ticket/
│           └── index.ts        ← Edge Function (deploy con Supabase CLI)
└── README.md
```

---

## Paso 1 — Supabase (base de datos + servidor)

1. Creá cuenta en https://supabase.com (gratis)
2. Creá un nuevo proyecto
3. Andá a **SQL Editor** y ejecutá todo el contenido de `supabase/schema.sql`
4. Anotá desde **Settings → API**:
   - `Project URL` (ej: `https://abcde.supabase.co`)
   - `anon public` key

---

## Paso 2 — Tabscanner (OCR de tickets)

1. Creá cuenta en https://tabscanner.com (plan gratuito: 200 tickets/mes)
2. Copiá tu API Key desde el dashboard

---

## Paso 3 — Edge Function (intermediario seguro)

La clave de Tabscanner **nunca toca el browser**. Vive solo en Supabase.

### Opción A: Supabase CLI (recomendada)

```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Linkear proyecto
supabase link --project-ref TU_PROJECT_REF

# Agregar la clave de Tabscanner como secret (nunca va al código)
supabase secrets set TABSCANNER_API_KEY=tu_clave_aqui

# Deploy de la función
supabase functions deploy scan-ticket
```

### Opción B: desde el dashboard de Supabase

1. Supabase → **Edge Functions** → New Function → nombre: `scan-ticket`
2. Pegá el contenido de `supabase/functions/scan-ticket/index.ts`
3. Supabase → **Edge Functions** → **Secrets** → agregar:
   - Name: `TABSCANNER_API_KEY`
   - Value: tu clave de Tabscanner

---

## Paso 4 — Publicar la app en Netlify

1. Entrá a https://netlify.com y creá cuenta (gratis)
2. En el dashboard: **Add new site → Deploy manually**
3. Arrastrá y soltá la carpeta `public/` en la zona de drop
4. Netlify te da una URL pública en segundos

---

## Paso 5 — Conectar la app

1. Abrí la app en el browser
2. Tocá ⚙️ **Config**
3. Pegá:
   - Supabase URL
   - Supabase Anon Key (es pública, no es secreta)
4. Guardá — la app queda conectada

---

## Seguridad

| Clave | Dónde vive | ¿Es pública? |
|-------|-----------|--------------|
| `TABSCANNER_API_KEY` | Supabase Secrets (servidor) | ❌ Nunca visible |
| `SUPABASE_URL` | App / localStorage | ✅ Es pública por diseño |
| `SUPABASE_ANON_KEY` | App / localStorage | ✅ Es pública por diseño |

La `anon key` de Supabase es segura porque el acceso a las tablas
está controlado por Row Level Security (ya configurado en el schema).

---

## Uso en modo demo (sin backend)

Si abrís la app sin configurar Supabase, funciona en modo demo:
- El escaneo simula una transcripción de ejemplo
- Los tickets se guardan solo en memoria (se pierden al cerrar)
- Útil para mostrarle a tu mamá cómo funciona antes de configurar todo
