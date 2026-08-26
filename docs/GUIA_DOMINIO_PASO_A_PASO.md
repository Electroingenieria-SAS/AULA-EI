# Guía paso a paso — Llevar Aula EI a un dominio conservando GitHub y Vercel

## Objetivo

Mantener el flujo:

**GitHub → Vercel → dominio personalizado**

con Supabase como backend administrado.

El cambio de dominio **no obliga a reemplazar Supabase**. Tampoco obliga a abandonar GitHub: GitHub sigue siendo el repositorio y Vercel despliega automáticamente desde él.

## 1. Requisitos

- Acceso al repositorio GitHub `Electroingenieria-SAS/AULA-EI`.
- Acceso al equipo/proyecto Vercel correspondiente.
- Acceso al proveedor DNS del dominio.
- Acceso administrativo a Supabase para ajustes futuros de Auth/RLS/Edge Functions.
- Node.js 18 o superior para validar el paquete localmente.

## 2. Verificar el paquete

Desde la raíz:

```bash
npm run verify
```

Para abrirlo localmente:

```bash
npm run dev
```

## 3. Vercel

El proyecto está actualmente vinculado al repositorio GitHub `Electroingenieria-SAS/AULA-EI`.

Se detectaron dos proyectos Vercel históricos para el mismo repo:

- `aula-ei`
- `aula-ei-1z4d`

Debe escogerse **uno como proyecto canónico de producción**. Evite configurar el mismo dominio en ambos.

Para este paquete estático:

- Framework Preset: `Other` / estático.
- Root Directory: raíz.
- Build Command: vacío/no requerido.
- Output Directory: vacío/no requerido.
- `vercel.json` debe conservarse.

## 4. Agregar dominio

En Vercel:

1. Project → Settings → Domains.
2. Escriba el dominio deseado, por ejemplo `aulaei.electroingenieria.com`.
3. Vercel mostrará uno o más registros DNS.
4. Copie exactamente esos registros al proveedor DNS.
5. Espere la validación DNS y compruebe HTTPS.

No invente registros A/CNAME: use los que Vercel muestre para ese proyecto y dominio.

## 5. GitHub

No cambie el flujo Git. Recomendado:

- rama principal protegida;
- pull request para cambios sensibles;
- secret scanning;
- no subir `.env` real;
- conservar `.gitignore`;
- Vercel conectado a la rama productiva.

GitHub Pages puede mantenerse como espejo en su URL `*.github.io`. Si se usa un dominio principal en Vercel, no apunte el mismo hostname simultáneamente a Pages.

## 6. Supabase

No se cambia al mover el dominio. Revise:

- URL de redirección de Auth, si usa magic links/reset de contraseña;
- orígenes CORS de Edge Functions si se despliegan las versiones endurecidas;
- URLs absolutas del frontend que usen el hostname anterior;
- Storage sigue privado;
- RLS y grants siguen aplicando con independencia del dominio.

### Orígenes esperados

La plantilla `.env.example` contiene una lista orientativa de `ALLOWED_ORIGINS`. Debe actualizarse con el dominio final y solo con previews que realmente se necesiten.

## 7. Variables y secretos

### Puede ser público en frontend

- URL del proyecto Supabase.
- Publishable key de Supabase.

### Nunca debe estar en frontend/GitHub

- `SUPABASE_SERVICE_ROLE_KEY`.
- `sb_secret_...`.
- tokens de acceso Supabase.
- tokens Vercel.
- PAT de GitHub.
- credenciales DNS.

Los secretos deben estar en Supabase Edge Function Secrets, GitHub Actions Secrets o el almacén de secretos del proveedor correspondiente.

## 8. Prueba final

Verificar, como mínimo:

1. Inicio de sesión.
2. Curso asignado a alumno.
3. Storage y recursos multimedia.
4. Progreso del curso.
5. Examen.
6. Certificado.
7. Firma del participante y responsable.
8. Administración de usuarios.
9. Acceso directo a rutas desde el dominio.
10. Consola sin errores CSP/CORS.
11. HTTPS válido.
12. No hay secretos elevados en DevTools/Sources/Network.

## 9. Si se requiere migrar fuera de Vercel

El hosting nuevo debe servir una SPA estática y replicar:

- fallback de rutas a `index.html`;
- headers de seguridad de `vercel.json` en formato equivalente;
- HTTPS;
- caching de assets;
- dominio/DNS.

Supabase puede mantenerse exactamente como backend mientras se cambia únicamente el hosting del frontend.
