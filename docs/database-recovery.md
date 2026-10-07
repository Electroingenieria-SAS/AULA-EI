# Recuperación de base de datos · Aula EI

## Estado actual

Las migraciones versionadas endurecen y evolucionan una base preexistente. El repositorio todavía no contiene una baseline completa capaz de reconstruir por sí sola todo el esquema de Aula EI desde una base vacía.

## Requisito antes de certificación final

Con acceso al proyecto Supabase real de Aula EI se debe:

1. exportar únicamente el esquema, funciones, triggers, políticas RLS, grants, Storage policies y extensiones necesarias;
2. guardar una baseline sanitizada sin datos ni secretos;
3. aplicar la baseline en una base vacía;
4. ejecutar, en orden, las migraciones posteriores;
5. comprobar el build y el smoke funcional contra esa base;
6. documentar restore de Auth y Storage por separado.

Nunca se debe versionar un dump con datos personales, credenciales, refresh tokens, hashes de contraseña o service role.

## Bloqueo actual

La conexión Supabase disponible en esta sesión no corresponde al proyecto ipoidimevokogptydbvt utilizado por Aula EI. Por eso la baseline no se debe inventar a partir de migraciones parciales.
