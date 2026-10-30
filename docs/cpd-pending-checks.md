# Estado del candidato y pasos para la solicitud CPD

29 de octubre de 2026; actualizado el 30 de octubre con la prueba nativa de StarX. Cuatro scripts; PolyMask excluido.

## Preparación completada

- FITS/XISF Header Editor identificado como 1.0.1; RGB DualBand 0.14.3, Focal Length Blend 0.11.7 y Astrometric Solution Copy 1.1.
- Documentación y versiones coherentes, manifiesto con los cuatro SHA-256 y SHA256SUMS.txt del contenido final.
- Prueba nativa de descarga ejecutada primero en PixInsight 1.9.6; descarga real HTTPS verificada por tamaño y SHA-256.
- Interfaces, FITS/XISF I/O, copia WCS, reproyección, recorte y mezcla MLT comprobados. Consulte [el informe en inglés](validation-pixinsight-1.9.6.md).
- Carlos Rincón acepta continuar y da SPCC y resolución nueva por buenos según el funcionamiento previo. StarXTerminator 2.6.10/modelo 11 ya ha superado la prueba automática de separación, mezcla MLT y recombinación Screen en 1.9.6/macOS; véase starx-validation-1.9.6.md. Se conservan las limitaciones y el fallo de registro del par de focales distintas en el informe.

## Dependencias y distribución

Se usa el ImageSolver oficial instalado: sus consultas dependen de su configuración y catálogos. SPCC necesita Gaia DR3/SP disponible. StarX es opcional y debe estar instalado y activado. La descarga de muestras usa curl con HTTPS y SHA-256 fijado; no ejecuta el ZIP. No se han cambiado los algoritmos de imagen. La revisión final añade protección compartida de rutas de escritura, validada en ambos motores de PixInsight 1.9.6.

La distribución de este candidato es manual, sin firmas CPD ni repositorio de actualizaciones activo. No se han generado ni inspeccionado claves privadas. El almacenamiento de preferencias sigue gestionado por Settings/PixInsight.

## Acción que realiza el autor

1. Abrir SubmitCPD 1.2.1 desde PixInsight 1.9.6 y comprobar la versión mostrada.
2. Reutilizar la identidad y claves de la petición anterior si se conservan. No publicar la clave privada en GitHub ni en el formulario de descripción.
3. Indicar la rama cpd-review y enlazar docs/cpd-scripts-en.md como descripción de los cuatro productos, más el informe de validación si el formulario permite enlaces adicionales.
4. Revisar las normas vigentes, aceptarlas personalmente y enviar la solicitud. Este trabajo no envía solicitudes ni acepta acuerdos por el autor.

Los enlaces y el texto de acompañamiento están en [cpd-submission-guide.md](cpd-submission-guide.md). La aceptación del autor de las limitaciones no equivale a aprobación CPD por PTeam.


WRITE-PATH PROTECTION — 29 OCTOBER 2026
Keep ProtectedPaths.jsh beside the four scripts. Header Editor 1.0.1, Focal Length Blend 0.11.7 and RGB DualBand 0.14.3 refuse writes inside the running PixInsight installation and its per-user configuration directory. Symbolic links are resolved before comparison; ambiguous Windows paths and reparse points are rejected. Existing files with multiple hard links are rejected where reported by the platform. Choose normal user folders for output. The header editor retains its stricter source-link policy. See docs/path-write-safety.md in the cpd-review repository. This guard does not change image-processing algorithms, signing or security preferences.
