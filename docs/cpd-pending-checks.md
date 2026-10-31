# Estado de la solicitud CPD

**Validación manual del flujo:** Carlos Rincón confirma que probó manualmente la resolución astrométrica con ImageSolver y la calibración de color completa con SPCC, con resultado satisfactorio en **PixInsight 1.9.5 y 1.9.6**. Esta validación del autor complementa las pruebas automáticas de desarrollo y procesamiento nativo.

**Pruebas automáticas de desarrollo — PixInsight 1.9.5:** las comprobaciones automáticas cubrieron el manejo de soluciones astrométricas, la inicialización de ImageSolver y la configuración e integración de SPCC en el flujo. Se distinguen de los resultados nativos posteriores en 1.9.6.

El paquete incluye cuatro scripts, iconos, manuales, protección compartida de rutas y hashes verificados. La presentación y las pruebas actuales figuran en [la descripción en inglés](cpd-scripts-en.md) y el [resumen de validación](validation-pixinsight-1.9.6.md).

Las funciones comprobadas incluyen edición de metadatos, copia y conservación de astrometría, registro/reproyección, máscaras, mezcla MLT, StarX, recombinación Screen y descarga verificada con progreso y cancelación.

Carlos Rincón confirma pruebas manuales satisfactorias de calibración SPCC completa y resolución astrométrica nueva en 1.9.5 y 1.9.6. Se registran como validación manual del autor, complementaria a las pruebas automáticas. Las dependencias y requisitos están descritos en los manuales.

La solicitud ha sido enviada por el autor. La aprobación CPD y el reconocimiento de la identidad corresponden a PTeam. Las claves privadas siguen bajo custodia del autor; no forman parte de este repositorio. No hay cambios de código en esta actualización de presentación.
