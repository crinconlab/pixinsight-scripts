# Crinconlab — validación en PixInsight 1.9.6

**Validación previa del autor — PixInsight 1.9.5:** Carlos Rincón probó la resolución astrométrica con ImageSolver y la calibración de color con SPCC en PixInsight 1.9.5. Esta validación previa se distingue de las pruebas automáticas realizadas en 1.9.6.

**Cuatro herramientas complementarias para procesar imágenes astronómicas, creadas por Carlos Rincón.**

Las pruebas nativas en macOS confirman la edición FITS/XISF, copia de astrometría, registro y reproyección, recorte de campo común, máscaras poligonales, mezcla MLT, separación StarX y recombinación Screen, y descarga con verificación SHA-256.

- **Header Editor 1.0.1:** lectura y escritura verificadas, simulación, copias, sobrescritura con y sin respaldo y protección de rutas.
- **RGB DualBand 0.14.3:** interfaces y ajustes SPCC, geometría, registro controlado, recorte, composición y conservación de astrometría comprobados.
- **Focal Length Blend 0.11.7:** flujo con muestras reales y StarX, conservación de estrellas, mezcla, recombinación y guardado con astrometría comprobados. Descargas consecutivas, progreso y cancelación correctos.
- **Astrometric Solution Copy 1.1:** detección de 480 estrellas coincidentes y transferencia WCS verificadas.

## Requisitos y alcance

SPCC necesita Gaia DR3/SP accesible y un par RGB/Dual Band lineal y preparado. Resolver una imagen nueva requiere estrellas y los recursos de ImageSolver. **La calibración SPCC completa y una resolución nueva no se completaron en esta sesión.** Sí se verificaron la reutilización, reproyección, recorte y conservación de soluciones existentes.

La validación nativa corresponde a PixInsight 1.9.6/macOS y a las muestras documentadas. El [informe en inglés](validation-pixinsight-1.9.6.md) enlaza las evidencias técnicas. La aprobación CPD corresponde a PTeam.
