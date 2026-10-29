# Comprobaciones pendientes antes de cerrar la solicitud CPD

Ámbito: los cuatro productos de esta rama. PolyMask está excluido. Se parte del commit `31fed1d6b8b06624dd8456d537ee29d60ce9b2a8`, con la descarga verificada añadida en Focal Length Blend 0.11.5. No se ha ejecutado PixInsight en este entorno; las pruebas del cambio se han realizado con adaptadores de archivo en Node.

## Dependencia de ImageSolver: documentada

Focal Length Blend y RGB DualBand Solver SPCC utilizan el ImageSolver oficial incluido en PixInsight. Sus consultas a catálogos y servicios de resolución corresponden al componente instalado y a la configuración elegida por el usuario. No se implementa un servicio astrométrico independiente. Las descripciones identifican esta dependencia, además de SPCC y del módulo opcional StarXTerminator, sin presentarlos como herramientas completamente offline.

No se atribuyen al código propio destinos ni comportamientos de red que no implementa. Si PTeam solicita más detalle sobre un proveedor o una configuración de catálogo concreta, se añadirá a partir de la instalación utilizada.

## Descarga de imágenes de ejemplo: hash y HTTPS incorporados

Focal Length Blend 0.11.5 comprueba tamaño y SHA-256 fijados en el código antes de publicar el ZIP. El hash se obtuvo de los metadatos del asset de GitHub y se contrastó con el archivo real descargado: `9c6f0f434deeb7427002a081256ac56602202af2c9de0d5842a09e25b1a77f26`, 85.376.365 bytes. El cálculo es incremental y no añade programas externos. Se restringen a HTTPS tanto la solicitud como las redirecciones de `curl`.

Once pruebas fuera de PixInsight comprueban vectores conocidos, archivos binarios, lectura incremental, el ZIP publicado, rechazo de cambios del mismo tamaño, errores, cancelación, recuperación del destino y argumentos HTTPS. El archivo parcial y cualquier copia temporal de recuperación quedan documentados. Queda probar las API de archivo y la transferencia real desde PixInsight 1.9.6, incluida la disponibilidad de `curl` en los sistemas que se vayan a admitir. La prueba nativa preparada es `tests/Test_Sample_Download_PixInsight.js`.

## Archivos, preferencias y versiones

Las rutas que escribe directamente el editor de cabeceras están descritas, incluidos copias, originales, respaldos y temporales. Confirmar con el paquete final que no hay otras rutas introducidas por cambios posteriores. En una carpeta de red montada, el sistema operativo puede transportar los accesos de archivos: no describirlo como una función de colaboración entre participantes.

RGB DualBand persiste valores SPCC mediante la API Settings, con una clave de aplicación documentada. La ubicación física la gestiona PixInsight; no se modifica directamente su archivo de configuración ni se inventa una ruta universal. Las cachés nativas pertenecen a los componentes instalados.

El editor de cabeceras no declara una versión propia en la cabecera revisada. Definirla antes de cerrar el paquete candidato a firma y registrar los hashes del paquete final.

Se han actualizado la descripción y la ayuda de descarga de Focal Length Blend. Revisar las demás notas históricas de instalación antes de cerrar la versión candidata. El manifiesto debe seguir reflejando los hashes de las fuentes finales.

## Validación en PixInsight 1.9.6

PTeam pide reenviar la solicitud desde PixInsight 1.9.6 y SubmitCPD 1.2.1, aceptando las normas vigentes. Las fuentes parten de la implementación publicada para 1.9.5, con la descarga 0.11.5 comprobada fuera de PixInsight. No se ha comprobado aquí su ejecución nativa en 1.9.6 ni la compatibilidad de las inclusiones/configuración de ImageSolver 6.5.0 con esa instalación.

Repetir las pruebas nativas y la inspección de interfaz pertinentes con la versión final: lectura/escritura del editor de cabeceras y sus modos de sustitución; copia de astrometría; resolución/reproyección real de imágenes; ejecución real de SPCC; separación opcional con StarXTerminator; descarga y verificación de muestras. Los manuales heredados describen comprobaciones previas, no resultados nuevos de esta revisión.

## Enlaces de la nueva solicitud

Indicar la rama `cpd-review` y la descripción en inglés, no el ZIP antiguo de la colección de cinco scripts. Esta rama no contiene PolyMask ni sus recursos. No presentar la carpeta prevista `repository/` como repositorio de actualizaciones operativo: en esta entrega la distribución es manual, pendiente de firma CPD.

Reutilizar las claves de la solicitud original si se conservan; no se han generado ni modificado claves durante este trabajo. La nueva solicitud y la aceptación de las normas deben realizarse por el autor desde SubmitCPD. Esta revisión no envía correos ni solicitudes.
