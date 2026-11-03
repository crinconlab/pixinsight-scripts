# Repositorio de actualizaciones

Distribución **2026.11.03** para **PixInsight 1.9.6**.

Incluye FITS-XISF Header Editor 1.0.1, Astrometric Solution Copy 1.1, RGB Ha Blend 0.15.1 y **Focal Length Blend 0.11.10**. PolyMask queda fuera. Esta actualización corrige las aristas bruscas de la transición de máscara en polígonos cóncavos; mantiene el desplazamiento con Mayús + arrastrar.

Dirección para Resources > Updates > Manage Repositories:

```text
https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/repository/
```

Después, ejecutar Check for Updates y seguir las indicaciones de instalación y reinicio. El reconocimiento de firmas requiere que la instalación tenga la actualización de la base de datos de desarrolladores que incluya `Carlos_Rincon_Astrophoto`.

El índice `updates.xri` lleva la firma XML aportada por Carlos Rincón y apunta al ZIP publicado en el mismo commit. El paquete contiene las firmas públicas de los cuatro scripts y la biblioteca compartida, cuatro iconos y manuales en inglés. El código de Focal Length Blend coincide exactamente con el archivo firmado por el autor. Se han comprobado estructura, contenidos y checksums. La verificación criptográfica nativa no se pudo completar en la instalación de prueba porque su base de datos aún no reconoce la identidad CPD. Ver [informe de distribución](../docs/distribution-2026-11-03.json).

Se conservan los ZIP anteriores. Para próximas versiones, publicar el paquete nuevo y el índice firmado en el mismo commit, siguiendo [la guía de publicación](../docs/publicacion.md).
