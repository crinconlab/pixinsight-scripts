# Crinconlab — validación en PixInsight 1.9.6

**Validación manual del flujo:** Carlos Rincón confirma que probó manualmente la resolución astrométrica con ImageSolver y la calibración de color completa con SPCC, con resultado satisfactorio en **PixInsight 1.9.5 y 1.9.6**. Esta validación del autor complementa las pruebas automáticas de desarrollo y procesamiento nativo.

**Pruebas automáticas de desarrollo — PixInsight 1.9.5:** las comprobaciones automáticas cubrieron el manejo de soluciones astrométricas, la inicialización de ImageSolver y la configuración e integración de SPCC en el flujo. Se distinguen de los resultados nativos posteriores en 1.9.6.

**Cuatro herramientas complementarias para procesar imágenes astronómicas, creadas por Carlos Rincón.**

Las pruebas nativas en macOS confirman la edición FITS/XISF, copia de astrometría, registro y reproyección, recorte de campo común, máscaras poligonales, mezcla MLT, separación StarX y recombinación Screen, y descarga con verificación SHA-256.

- **Header Editor 1.0.1:** lectura y escritura verificadas, simulación, copias, sobrescritura con y sin respaldo y protección de rutas.
- **RGB DualBand 0.15.0:** interfaces y ajustes SPCC, geometría, registro controlado, recorte, composición y conservación de astrometría comprobados.
- **Focal Length Blend 0.11.8:** flujo con muestras reales y StarX, conservación de estrellas, mezcla, recombinación y guardado con astrometría comprobados. Descargas consecutivas, progreso y cancelación correctos.
- **Astrometric Solution Copy 1.1:** detección de 480 estrellas coincidentes y transferencia WCS verificadas.

## Requisitos y alcance

SPCC necesita Gaia DR3/SP accesible y un par RGB/Dual Band lineal y preparado. Resolver una imagen nueva requiere estrellas y los recursos de ImageSolver. **El autor confirma que completó ambas operaciones manualmente con éxito en 1.9.5 y 1.9.6.** Los resultados manuales se distinguen de los automáticos. Sí se verificaron la reutilización, reproyección, recorte y conservación de soluciones existentes.

La validación nativa corresponde a PixInsight 1.9.6/macOS y a las muestras documentadas. El [informe en inglés](validation-pixinsight-1.9.6.md) enlaza las evidencias técnicas. La aprobación CPD corresponde a PTeam.

## Método de las pruebas automáticas anteriores
Las comprobaciones de desarrollo de 1.9.5 incluyen propagación de astrometría, inicialización de ImageSolver y configuración/integración de SPCC. El flujo automatizado de calibración documentado utiliza un callback de calibración inyectado. No acredita por sí mismo una calibración SPCC completa con catálogo real ni una resolución nueva con catálogo. La atribución corresponde a pruebas automáticas de desarrollo, no a una prueba manual de Carlos Rincón.
