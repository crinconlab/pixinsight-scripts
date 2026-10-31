Historical review snapshot. Current status: [validation summary](../validation-pixinsight-1.9.6.md).

# Validación nativa de Crinconlab en PixInsight 1.9.6

**Actualización 30/10/2026:** StarX ya está probado automáticamente en 1.9.6: separación, mezcla y recombinación Screen correctas. La observación de indisponibilidad que figura más abajo corresponde a las pruebas anteriores y ha quedado superada. [Informe nuevo](../starx-validation-1.9.6.md). SPCC y resolución nueva no cambian de estado.

Fecha: 29 de octubre de 2026. Entorno: PixInsight Core 1.9.6 Lockhart x64, macOS.
Rama: `cpd-review`. Commit probado: `31a7c48782d4b466cb1d784429298a9b75117daa`.
Solo cuatro scripts. PolyMask excluido. Las fuentes descargadas coinciden por hash Git con la rama. Las pruebas de procesamiento se ejecutaron sobre ese commit. El candidato de solicitud añade después la etiqueta 1.0.0 al editor de cabeceras y actualiza documentación y hashes; no cambia algoritmos.

**Resultado de revisión: aceptado por el autor para continuar.** Descarga, interfaces, cabeceras, copia de astrometría, geometría y mezcla MLT comprobadas en PixInsight 1.9.6. Por decisión de Carlos Rincón, SPCC, resolución nueva y StarXTerminator se dan por buenos para esta revisión basándose en su funcionamiento previo comunicado por el autor. Esta aceptación es una suposición de continuidad entre versiones; no equivale a haber completado esas pruebas en 1.9.6.

| Script | Comprobación nativa | Resultado |
|---|---|---|
| FITS-XISF Header Editor | Interfaz; simulación; alta de FILTER, CREATOR y TESTNUM; lectura posterior; copias; destino existente; sobrescritura con y sin respaldo | Correcto con archivos sintéticos FITS y XISF |
| Astrometric Solution Copy 1.1 | Detección real; verificación del mismo campo; transferencia a copia sin solución; bloqueo de destino sin autorización | Correcto: 480 estrellas coincidentes, desplazamiento mediano y p90 de 0 píxeles |
| Focal Length Blend 0.11.5 | Descarga, geometría real, cobertura, máscara, MLT, interfaz de comparación, botón Create Blended Image y escritura XISF | Correcto con muestras starless ya resueltas; lienzo final 1500 × 1500 |
| RGB Ha Blend 0.14.2 | Interfaz, selección de respuestas SPCC, reproyección real por coordenadas, recorte, composición roja y transferencia WCS; registro estelar de copia desplazada | Geometría correcta. Calibración SPCC aceptada por continuidad; no comprobada en 1.9.6 |

## Primera prueba: descarga/verificación nativa

Se ejecutó primero el archivo original `tests/Test_Sample_Download_PixInsight.js`, sin modificarlo, mediante un envoltorio de captura de consola. Pasó la lectura nativa de bytes, SHA-256 de abc y del archivo vacío, publicación y reemplazo verificados, rechazo de alteración de igual tamaño y conservación del destino tras el rechazo. La instancia usó el modo de automatización de PixInsight, que confirmó el cuadro informativo final.

A continuación se ejecutó la función de producción `MF_saveSampleZip` con transferencia HTTPS real por curl, sin adaptador de Node. También se volvió a calcular el hash dentro de PixInsight.

- Archivo: Crinconlab_Sample_Images.zip.
- Tamaño: **85.376.365 bytes**.
- SHA-256: **9c6f0f434deeb7427002a081256ac56602202af2c9de0d5842a09e25b1a77f26**.
- Tiempo conjunto de transferencia, verificación de producción y segundo hash nativo: 52,552 segundos.
- Comprobación independiente con SHA-256 de Python y CRC de todas las entradas ZIP: correcta.
- Ningún archivo descargado fue ejecutado. Solo se extrajeron las imágenes de prueba y su documentación.

## Interfaces y estado

Se construyeron y renderizaron las cuatro interfaces y los diálogos Configure SPCC y Sample Terms con sus recursos instalados. Se inspeccionaron las capturas. El editor de cabeceras se probó con su motor predeterminado, tal como se distribuye; los otros tres scripts usan V8. No se forzó V8 sobre el editor legado.

Se verificó el progreso de un batch de cabeceras al 100%, su vuelta a cero al iniciar otra carga, los contadores iniciales, la actividad de búsqueda, la lectura al 50% y la liberación del estado ocupado. Las capturas y llamadas a controles son programáticas; no constituyen una sesión manual completa de ratón y teclado.

## Flujo astrométrico y datos reales

Se usaron las muestras de la descarga recién verificada, sin sobrescribirlas.

Focal Length Blend: se cargaron las dos muestras starless con WCS real, se reusaron sus soluciones y se reproyectó la focal larga mediante el backend instalado de MosaicByCoordinates. El lienzo conservó 1500 × 1500 píxeles; la cobertura geométrica fue aproximadamente 5,012% del lienzo. Se creó una máscara circular poligonal, transición de 16 píxeles y mezcla MLT con capas 1–3, intensidad 35% y ganancia relativa 0,5. La estimación de contraste fue 0,791972, R² 0,96248. El botón de creación retuvo el resultado. Se comprobó coincidencia de coordenadas celestes y protección exterior a la máscara.

RGB/Dual Band: las muestras de focales distintas se usaron **solo para validar geometría y aritmética**, no como un par lineal RGB/Ha de calibración científica. La reproyección por coordenadas produjo un recorte común de 148 × 363 píxeles, origen (649,445); la correspondencia celeste tras el recorte pasó. La composición modificó solo el rojo antes de SPCC.

StarAlignment no consiguió alinear directamente ese par de distinta escala y campo; esa prueba queda registrada como fallo con esos datos, sin atribuirlo por sí solo a una incompatibilidad del script. Una segunda prueba con la misma imagen real desplazada 18 × 9 píxeles sí pasó por la función de producción: registro estelar y recorte común de 1478 × 1487 píxeles. La geometría y la astrometría del resultado permanecieron válidas.

Se guardaron y reabrieron FocalBlend_Result.xisf y RGBHa_Geometry_Result.xisf. Ambos conservaron una solución astrométrica válida tras la lectura desde disco. El segundo es un resultado de geometría, **sin calibración SPCC validada**.

## Partes aceptadas por continuidad y límites de la comprobación

El autor ha decidido no bloquear esta revisión por los siguientes puntos y aceptarlos sobre la base del funcionamiento anterior. Se conservan los resultados observados para que la trazabilidad del informe sea fiel.

1. **SPCC — aceptado por continuidad:** la ejecución nativa devuelve fallo al abrir el catálogo configurado en un archivo Gaia DR3/SP en un volumen externo no montado. El volumen no está montado. El usuario confirmó que el catálogo no está disponible aquí. El mensaje nativo indica que no puede recuperar una tabla válida de longitudes de onda. No se ha cambiado la configuración ni descargado otro catálogo. La prueba completa en 1.9.6 no se ha realizado; para comprobarla directamente se necesitarían Gaia DR3/SP y un par real RGB/Dual Band lineal y preparado.
2. **Resolución nueva — aceptada por continuidad:** se intentó RD_solve con una copia sin solución y coordenadas iniciales de la muestra resuelta, aceptando programáticamente el diálogo de ajustes y ejecutando el solver real. La llamada no terminó en una prueba acotada de más de cuatro minutos; se cerró exclusivamente esa instancia de prueba. El resultado es inconcluso, sin atribuir una causa no comprobada. Reutilización de WCS, reproyección, recorte y transferencia sí están comprobados. No se atribuye a esta ejecución una resolución nueva exitosa; su aceptación se basa en el criterio del autor y el funcionamiento previo comunicado.
3. **StarXTerminator — aceptado por continuidad:** el constructor no estuvo disponible en las instancias V8 de prueba. Se validó el flujo sin StarX con las muestras starless. Separación y recombinación con StarX no se han comprobado en 1.9.6 y se aceptan para esta revisión según el criterio del autor.
4. Las muestras distribuidas están estiradas. La prueba de ejecución de SPCC fue solo diagnóstica y falló antes de calibrar por el catálogo ausente; no valida precisión fotométrica.
5. Aparecen avisos de APIs obsoletas (ByteArray.at y processEvents en rutas legadas), sin bloquear las pruebas que pasaron. La rama no se cambió para silenciarlos.

## Trazabilidad

Los resultados agregados sin rutas locales privadas están en [validation-results-1.9.6.json](../validation-results-1.9.6.json). Los registros completos y capturas se conservan localmente con el autor. La instantánea probada figura arriba; el manifiesto y SHA256SUMS.txt identifican el candidato final. No se ha enviado ninguna solicitud CPD ni se han generado claves o firmas.


## Subsequent write-path safety update
The candidate was updated to Header Editor 1.0.1, Focal Length Blend 0.11.6 and RGB DualBand 0.15.0 with ProtectedPaths.jsh. This adds disk-write protection, not image-algorithm changes. New native guard/I/O regression checks passed on PixInsight 1.9.6. See [path-write-safety.md](../path-write-safety.md). Earlier processing results retain their original tested snapshot.
