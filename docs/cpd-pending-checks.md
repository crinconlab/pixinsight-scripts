# Comprobaciones pendientes antes de cerrar la solicitud CPD

Ámbito: los cuatro productos de esta rama. PolyMask está excluido. Revisión estática realizada sobre el commit de fuentes `31fed1d6b8b06624dd8456d537ee29d60ce9b2a8`; no se ha ejecutado PixInsight en esta revisión documental.

## Conexiones de componentes nativos

Focal Length Blend y RGB DualBand Solver SPCC invocan ImageSolver y bibliotecas astrométricas instaladas en PixInsight. No basta con que nuestros archivos no contengan sus URL: se deben comprobar los servicios de catálogo y resolución de coordenadas realmente utilizados, las condiciones que disparan cada conexión, sus protocolos y redirecciones, los campos transmitidos y las ubicaciones de cachés/archivos temporales en la instalación 1.9.6. Hacerlo también para cualquier acceso pertinente de SPCC y del módulo opcional StarXTerminator. No afirmar que son completamente offline sin esa comprobación.

Las descripciones actuales identifican esta dependencia y esta limitación, sin inventar una lista de destinos. La documentación final debe incorporar el inventario verificado exigido por PTeam.

## Descarga de imágenes de ejemplo

`MF_saveSampleZip` en Focal Length Blend 0.11.4 llama a `curl` y comprueba únicamente el tamaño esperado del ZIP. Una longitud coincidente no demuestra que los bytes no hayan sido alterados. Antes de declarar resuelto el requisito de integridad, implementar y comprobar un mecanismo adecuado, por ejemplo un resumen criptográfico esperado obtenido de una fuente protegida.

La URL inicial utiliza HTTPS y no se solicita desactivar la verificación de certificados. La invocación sigue redirecciones sin restringir expresamente el protocolo de destino: comprobar la cadena real y asegurar conexiones seguras también tras las redirecciones. Documentar el programa externo y las ubicaciones del ZIP/archivo parcial. Validar la detección de plataforma y la disponibilidad de `curl` en cada sistema admitido. Esta rama no modifica el descargador ni lo presenta como ya corregido.

## Archivos, preferencias y versiones

Las rutas que escribe directamente el editor de cabeceras están descritas, incluidos copias, originales, respaldos y temporales. Confirmar con el paquete final que no hay otras rutas introducidas por cambios posteriores. En una carpeta de red montada, el sistema operativo puede transportar los accesos de archivos: no describirlo como una función de colaboración entre participantes.

RGB DualBand persiste valores SPCC mediante la API Settings, con una clave de aplicación documentada. Registrar la ubicación gestionada por PixInsight en los sistemas admitidos sin inventar una ruta universal ni modificar directamente sus archivos de configuración. Completar por separado las cachés y temporales de las dependencias.

El editor de cabeceras no declara una versión propia en la cabecera revisada. Definirla antes de cerrar el paquete candidato a firma y registrar los hashes del paquete final.

Se han actualizado indicaciones de publicación e iconos en los manuales externos de esta rama. Las fuentes se han conservado intactas: parte de su ayuda integrada y notas históricas puede seguir describiendo paquetes anteriores. Unificar también esos textos con el alcance de cuatro scripts antes de cerrar la versión candidata, recalculando después su manifiesto.

## Validación en PixInsight 1.9.6

PTeam pide reenviar la solicitud desde PixInsight 1.9.6 y SubmitCPD 1.2.1, aceptando las normas vigentes. Las fuentes de esta rama conservan la implementación publicada para 1.9.5. No se ha comprobado aquí su ejecución en 1.9.6 ni la compatibilidad de las inclusiones/configuración de ImageSolver 6.5.0 con esa instalación.

Repetir las pruebas nativas y la inspección de interfaz pertinentes con la versión final: lectura/escritura del editor de cabeceras y sus modos de sustitución; copia de astrometría; resolución/reproyección real de imágenes; ejecución real de SPCC; separación opcional con StarXTerminator; descarga y verificación de muestras. Los manuales heredados describen comprobaciones previas, no resultados nuevos de esta revisión.

## Enlaces de la nueva solicitud

Indicar la rama `cpd-review` y la descripción en inglés, no el ZIP antiguo de la colección de cinco scripts. Esta rama no contiene PolyMask ni sus recursos. No presentar la carpeta prevista `repository/` como repositorio de actualizaciones operativo: en esta entrega la distribución es manual, pendiente de firma CPD.

Reutilizar las claves de la solicitud original si se conservan; no se han generado ni modificado claves durante este trabajo. La nueva solicitud y la aceptación de las normas deben realizarse por el autor desde SubmitCPD. Esta revisión no envía correos ni solicitudes.
