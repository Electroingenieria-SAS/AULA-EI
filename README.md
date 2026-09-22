# Aula EI

Aula EI es una única aplicación React/Vite respaldada por Supabase.

## Arquitectura

- `src/`: arranque único, autenticación, cliente Supabase, rutas y utilidades de seguridad.
- `player/src/`: experiencia del colaborador y reproductor de capacitaciones.
- `studio/src/`: administración, cursos, usuarios, asignaciones y motor de formación/cumplimiento.
- `certificate/src/`: visualización, firma y exportación de certificados.
- `supabase/`: migraciones y Edge Functions versionadas.

## Principios de build

El build parte únicamente de código fuente. No se parchea JavaScript minificado, no se reutilizan bundles compilados como fuente y no existe un bootstrap que cambie entre versiones antiguas/nuevas.

- Vercel puede compilar con base `/`, pero el despliegue operativo de este proyecto se gestiona por GitHub Actions.
- GitHub Pages compila el mismo código fuente con `VITE_BASE_PATH=/AULA-EI/`.
- La navegación interna usa hash routing para mantener compatibilidad con GitHub Pages sin reescrituras.

## Comando

```bash
npm run build
```
