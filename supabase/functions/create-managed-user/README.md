# create-managed-user

Edge Function para crear usuarios desde la administración de Aula EI.

Despliegue en el proyecto correcto:

```bash
supabase functions deploy create-managed-user --project-ref ipoidimevokogptydbvt
```

No desactives la verificación JWT. No agregues llaves al archivo `index.ts`; Supabase proporciona las variables del proyecto en el entorno seguro de la función.

Antes de desplegar cambios, revisa los puntos de prueba en [../../../docs/SUPABASE_SUPPORT.md](../../../docs/SUPABASE_SUPPORT.md).

