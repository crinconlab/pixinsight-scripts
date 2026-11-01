# Repositorio de actualizaciones

Distribución firmada **2026.11.01** para **PixInsight 1.9.6**.

Incluye FITS-XISF Header Editor 1.0.1, Astrometric Solution Copy 1.1, RGB Ha Blend 0.15.1 y Focal Length Blend 0.11.9. PolyMask queda fuera. Se conservan sin cambios los cuatro scripts, la biblioteca compartida y las cinco firmas generadas con CodeSign por Carlos Rincón.

Dirección para Resources > Updates > Manage Repositories:

```text
https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/repository/
```

Después, ejecutar Check for Updates y seguir las indicaciones de instalación y reinicio. El reconocimiento de firmas requiere que la instalación tenga la actualización de la base de datos de desarrolladores que incluya `Carlos_Rincon_Astrophoto`.

El índice `updates.xri` está firmado y apunta al ZIP de esta carpeta. El paquete incluye scripts, firmas, ProtectedPaths.jsh, cuatro iconos y manuales en inglés. Las comprobaciones de estructura, archivos, identificadores y checksum constan en [el informe](../docs/distribution-2026-11-01.json); la comprobación criptográfica y la primera instalación nativa están pendientes.

Para próximas versiones, conservar los ZIP anteriores y publicar el paquete nuevo y el índice firmado en el mismo commit. La configuración actual está en [release.cpd.json](../release.cpd.json). Seguir [la guía de publicación](../docs/publicacion.md).
