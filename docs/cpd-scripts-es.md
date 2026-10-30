# Descripción de los cuatro scripts para la solicitud CPD

**Validación manual del flujo:** Carlos Rincón confirma que probó manualmente la resolución astrométrica con ImageSolver y la calibración de color completa con SPCC, con resultado satisfactorio en **PixInsight 1.9.5 y 1.9.6**. Esta validación del autor complementa las pruebas automáticas de desarrollo y procesamiento nativo.

**Pruebas automáticas de desarrollo — PixInsight 1.9.5:** las comprobaciones automáticas cubrieron el manejo de soluciones astrométricas, la inicialización de ImageSolver y la configuración e integración de SPCC en el flujo. Se distinguen de los resultados nativos posteriores en 1.9.6.

Autor: Carlos Rincón. Identificador solicitado: `Carlos_Rincon_Astrophoto`. Colección: Crinconlab.

**Cuatro herramientas complementarias para PixInsight**, nacidas de necesidades prácticas de astrofotografía: metadatos por lotes, composición RGB/Dual Band, mezcla de detalle entre focales y transferencia de astrometría. Las pruebas nativas de 1.9.6/macOS incluyen StarX y descargas verificadas. [Resumen de validación](validation-pixinsight-1.9.6-es.md).

PolyMask queda fuera de esta solicitud.

## 1. FITS / XISF Header Editor

**Archivo:** `FITS_XISF_Header_Editor_EN.js`. **Versión: 1.0.1.** Esta revisión añade comprobaciones de rutas protegidas sin cambiar los algoritmos de imagen.

Herramienta para consultar y modificar palabras clave FITS en archivos FITS y XISF, de forma individual o por lotes. Permite seleccionar archivos de una carpeta o buscar en subcarpetas, consultar valores y comentarios, preparar cambios de texto, número o booleano y simular la operación antes de escribir. Las propiedades XISF se muestran en modo de lectura; determinadas palabras clave editables sincronizan sus propiedades XISF correspondientes.

El modo inicial guarda copias en una carpeta elegida por el usuario y conserva los originales. También permite sobrescribirlos, con confirmación expresa, conservando o no una copia de seguridad. Reabre los archivos generados para verificar los metadatos solicitados antes de completar su publicación. En FITS modifica la cabecera primaria y copia los bytes posteriores sin reprocesar los píxeles. En XISF utiliza el módulo de formato, por lo que la serialización y los metadatos de codificación pueden cambiar; las extensiones no expuestas por PJSR no tienen garantía de conservación.

**Red y programas externos:** no implementa conexiones de red, cargas de archivos, sincronización entre participantes ni lanzamiento de programas externos. Opera sobre las rutas del sistema de archivos seleccionadas por el usuario. Si se elige una carpeta montada por el sistema operativo desde un NAS o servidor, ese acceso no equivale a una función propia de intercambio entre participantes del script.

**Ubicaciones de escritura:** carpeta de destino elegida, inicialmente sugerida como `Headers_Metadata`; carpetas de origen al sobrescribir; `Metadata_Backups/<fecha-hora-identificador>/` dentro de cada carpeta de origen si se conserva copia; archivos temporales `.metadata_*` en las carpetas de trabajo y de origen. En simulación no crea archivos ni carpetas. Las copias se conservan hasta que el usuario las gestione; la limpieza de temporales se intenta al terminar cada operación.

## 2. RGB DualBand Solver SPCC — 0.14.3

**Archivo:** `RGB_DualBand_Solver_SPCC_EN.js`.

Asistente para combinar una imagen RGB de banda ancha con señal de una imagen de doble banda, sobre datos lineales preparados previamente. Trabaja con copias y ofrece registro mediante estrellas con StarAlignment, reproyección astrométrica de imágenes ya resueltas o uso de imágenes que el usuario confirma que están alineadas. Cuando corresponde, calcula y aplica un recorte del campo común a ambas copias.

La composición añade al rojo de RGB la señal del canal rojo de la doble banda, o de su canal único si es monocroma, con intensidad ajustable. Después aplica SpectrophotometricColorCalibration con los parámetros seleccionados por el usuario. Reutiliza la solución astrométrica de RGB o abre ImageSolver si falta; mantiene la correspondencia astrométrica al recortar. Permite comparar y conservar un resultado sin repetir el cálculo ya revisado. No realiza sustracción del continuo ni garantiza color fotométrico tras incorporar banda estrecha.

**Red y dependencias:** utiliza el ImageSolver oficial incluido en PixInsight y sus bibliotecas astrométricas; no los descarga. Las consultas a catálogos o servicios de resolución de coordenadas corresponden a ese componente y a su configuración en la instalación del usuario. SPCC utiliza el proceso nativo y el catálogo espectrofotométrico configurado. No se implementa un servicio astrométrico independiente. El archivo propio no contiene un cliente de red, un instalador ni llamadas a programas externos.

**Archivos y preferencias:** puede abrir imágenes seleccionadas por el usuario, pero no guarda automáticamente los resultados. La exportación opcional del manual escribe un `.txt` en la ubicación elegida. La opción de guardar valores SPCC predeterminados utiliza la API oficial `Settings`, con la clave `CarlosRincon/RGBDualBandSPCC/v1/defaults`. Lee los archivos instalados `filters.xspd` y `white-references.xspd` sin modificarlos. El proceso de previsualización desactiva la generación de gráficos, mapas de estrellas y archivos de texto de SPCC.

## 3. Focal Length Blend — 0.11.7

**Archivo:** `Mezcla_Focales.js`.

Herramienta para incorporar de manera selectiva estructuras de alta frecuencia de una imagen de focal larga a una imagen de gran campo, sobre imágenes ya estiradas y preparadas. Conserva las dimensiones y la cuadrícula de la imagen de focal corta; la imagen de focal larga se reproyecta sobre ella. Reutiliza la astrometría existente o abre ImageSolver para resolver copias cuando faltan soluciones y hay estrellas suficientes.

Puede separar estrellas mediante un StarXTerminator instalado y activado. Si no se utiliza, las entradas deben estar ya sin estrellas y conservar su solución astrométrica. Calcula la cobertura geométrica y permite ajustarla con una máscara poligonal editable y una transición hacia dentro. La combinación principal incorpora capas seleccionadas de MultiscaleLinearTransform a la luminosidad; conserva como origen del color la base. Ofrece una alternativa por bandas gaussianas y un comparador con navegación sincronizada. Puede conservar las estrellas por separado y crear opcionalmente otra imagen con recombinación Screen. No estira las entradas ni elimina sus gradientes, y el remuestreo no garantiza conservar todo el detalle original de la focal larga.

**Red y programas externos:** además del posible acceso de ImageSolver a catálogos, ofrece una descarga opcional de imágenes de ejemplo desde GitHub Releases. Requiere aceptar las condiciones de uso y elegir el destino. Invoca `curl` (`/usr/bin/curl`, o `curl.exe` en la rama Windows del código), que debe estar disponible en el sistema. No descarga ni ejecuta actualizaciones de código; el ZIP de ejemplo no se extrae ni ejecuta automáticamente. StarXTerminator es un módulo dentro de PixInsight, no un ejecutable que el script instale o lance externamente.

**Ubicaciones de escritura:** destino ZIP seleccionado por el usuario y un archivo parcial adyacente `<destino>.download-<marca de tiempo>-<identificador>`, que intenta eliminar si falla la descarga o su verificación. Si ya existe el destino y el usuario acepta sobrescribirlo, se mueve temporalmente a `<destino>.previous-<marca de tiempo>-<identificador>` después de validar el nuevo ZIP. Se restaura si falla la sustitución, cuando es posible; si la restauración falla, se conserva esa copia y se informa de su ruta. Tras el éxito se elimina la copia anterior, o se comunica un fallo de limpieza. Las imágenes de mezcla, estrellas y recombinación quedan abiertas en PixInsight; no se guardan automáticamente en disco.

**Verificación de descarga:** comprueba el tamaño esperado de 85.376.365 bytes y el SHA-256 `9c6f0f434deeb7427002a081256ac56602202af2c9de0d5842a09e25b1a77f26`, fijado dentro del script y contrastado con el ZIP publicado. El cálculo es incremental y no utiliza otro programa externo. Una discrepancia rechaza la descarga antes de sustituir el destino. `curl` admite únicamente HTTPS tanto en la solicitud inicial como en las redirecciones. Se han superado once pruebas fuera de PixInsight, incluida la comprobación del ZIP real; la prueba nativa y la descarga real con SHA-256 también han pasado en PixInsight 1.9.6.

## 4. Astrometric Solution Copy — 1.1

**Archivo:** `Astrometric_Solution_Copy_EN.js`.

Utilidad para transferir una solución astrométrica nativa ya existente desde una imagen de referencia a otras imágenes abiertas que comparten su cuadrícula. Comprueba dimensiones y analiza posiciones de estrellas para evaluar el registro. Bloquea imágenes que detecta como desalineadas; cuando no puede verificar el registro, exige una confirmación individual del usuario para cada destino. Las soluciones existentes se conservan por defecto, salvo autorización para sustituirlas.

No resuelve el campo mediante catálogos, no registra ni remuestrea imágenes y no modifica sus píxeles. Cambia deliberadamente los metadatos astrométricos de las ventanas de destino autorizadas. La comprobación estelar es estadística: no demuestra por sí sola que toda la imagen esté perfectamente registrada ni que la solución de la referencia sea correcta.

**Red, programas y archivos:** no implementa conexiones de red ni lanzamiento de programas externos. Utiliza imágenes abiertas y funciones de PixInsight, sin guardar archivos de imagen automáticamente. Para conservar los metadatos en disco, el usuario debe guardar las imágenes. Los mensajes de estado y resultados se muestran en el diálogo y en la consola; no hay una función propia de registro de actividad a disco.

## Estado de la entrega

La rama `cpd-review` contiene solo estos cuatro productos y sus recursos, junto con pruebas de desarrollo. El repositorio de actualizaciones automáticas todavía no forma parte de esta entrega. Solo Focal Length Blend cambia respecto a la referencia inicial para incorporar la descarga verificada 0.11.7; la combinación de imágenes no cambia.

La dependencia de ImageSolver queda descrita como uso del componente oficial de PixInsight. El estado final figura en [cpd-pending-checks.md](cpd-pending-checks.md) y en el informe de validación: se distinguen las comprobaciones ejecutadas en 1.9.6 de la aceptación del autor por funcionamiento previo.



## Validación y distribución

La instalación actual es manual. Se incluyen protección de rutas, manuales y hashes. El resumen de validación recoge las pruebas automáticas y las ejecuciones manuales satisfactorias de ImageSolver y SPCC confirmadas por el autor en 1.9.5 y 1.9.6. La solicitud CPD no se presenta como un aval de los productos.
