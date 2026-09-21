# Certificado Aula EI · salida documental

Este módulo fuente se monta en la ruta hash:

```
/#/certificate/:certificateCode
```

No existe como una segunda aplicación visible. `scripts/wire-studio.mjs` detecta la ruta y monta el bundle de certificado dentro del mismo `#root` de Aula EI.

## Salidas

- **PDF**: una página Carta horizontal (792 × 612 pt), sin diálogo de impresión.
- **PNG**: 3300 × 2550 px, equivalente aproximadamente a 300 DPI sobre Carta horizontal.
- **Imprimir**: opción secundaria; la hoja CSS usa `@page { size: letter landscape; margin: 0 }` y fuerza una sola página.

La proporción 3300:2550 coincide exactamente con Carta horizontal 11:8.5, por lo que la exportación no recorta ni deforma el certificado.

## Calidad y consistencia

El certificado se construye como SVG vectorial y, al exportar, se rasteriza a 3300 × 2550 px. Logo, sello, QR y firmas se convierten a data URLs antes de exportar para evitar recursos externos, problemas CORS o imágenes faltantes.

## Seguridad y datos

El módulo conserva los RPC existentes:

- `get_certificate_by_code`
- `get_certificate_signatures`
- `save_certificate_signature`
- `clear_certificate_signature`

La sesión sigue siendo obligatoria. Los permisos de lectura y modificación de firmas continúan siendo responsabilidad del backend/RLS existente.

PDF y PNG se habilitan únicamente cuando están presentes la firma del participante y la firma del responsable, para evitar descargar certificados incompletos.
