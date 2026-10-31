# Crinconlab PixInsight Scripts

Current four reviewed products: Header Editor 1.0.1, RGB Ha Blend 0.15.0, Focal Length Blend 0.11.8 and Astrometric Solution Copy 1.1. PolyMask is provided separately from the CPD review scope.

The previous 2026-10-26 collection is superseded. Install the current source folder from this branch, including icons, manuals and ProtectedPaths.jsh. The corrected complete collection is linked below.

[CPD correction details](docs/cpd-review-corrections.md) · [Reviewed four-script branch](https://github.com/crinconlab/pixinsight-scripts/tree/cpd-review)

The ZIP includes all five current scripts, five orange icons, and English manuals. Extract the complete Crinconlab folder, preserving its icons and manuals subfolders. In PixInsight, use Script > Feature Scripts > Add to register that folder. Remove registrations pointing to older copies if duplicate entries appear.

| Script | File |
| --- | --- |
| FITS / XISF Header Editor | [FITS_XISF_Header_Editor_EN.js](src/scripts/crinconlab/FITS_XISF_Header_Editor_EN.js) |
| RGB Ha Blend | [RGB_Ha_Blend.js](src/scripts/crinconlab/RGB_Ha_Blend.js) |
| Focal Length Blend | [Mezcla_Focales.js](src/scripts/crinconlab/Mezcla_Focales.js) |
| Astrometric Solution Copy | [Astrometric_Solution_Copy_EN.js](src/scripts/crinconlab/Astrometric_Solution_Copy_EN.js) |
| PolyMask | [PolyMask_EN.js](src/scripts/crinconlab/PolyMask_EN.js) |

[English manuals](src/scripts/crinconlab/manuals) · [Collection instructions](src/scripts/crinconlab/README_EN.txt) · [Version manifest](src/scripts/crinconlab/manifest.json)

PolyMask 0.1.0 is preliminary: 26 native programmatic checks passed in PixInsight 1.9.5; user testing with real images and mouse interaction remains pending. The collection is published as a preliminary manual-installation release. This does not activate the PixInsight automatic update repository.

Copyright © Carlos Rincón 2026.

---

# Publication tooling and earlier development notes

Scripts para PixInsight de crinconlab y preparación de su repositorio de actualizaciones.

**Estado: desarrollo. Los scripts son provisionales; todavía no hay una versión publicada mediante el gestor de actualizaciones.**

## Estructura

| Ruta | Contenido |
| --- | --- |
| `src/scripts/crinconlab/` | Scripts, firmas públicas y recursos que se instalarán |
| `tools/build_release.py` | Preparación local del ZIP y del índice `updates.xri` |
| `release.example.json` | Plantilla de metadatos para una publicación |
| `build/` | Resultados locales, pendientes de firma y comprobación; ignorados por Git |
| `repository/` | Paquetes e índice definitivos, cuando se publique la primera versión |
| `docs/publicacion.md` | Procedimiento de firma, empaquetado y actualización |

## Próximo paso

Trabajar sobre los scripts provisionales, revisar sus dependencias y comprobarlos en PixInsight antes de preparar la primera versión firmada. Véase [Estado de desarrollo](docs/desarrollo.md). Las claves `.xssk` y su contraseña permanecen fuera del repositorio.

La guía [Publicar una versión](docs/publicacion.md) explica el procedimiento. El empaquetador requiere Python 3.9 o posterior y solo utiliza la biblioteca estándar.

## Dirección prevista para PixInsight

```text
https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/repository/
```

Esta dirección se podrá añadir al gestor de actualizaciones cuando contenga el primer `updates.xri` y su paquete comprobado. No es necesario activar GitHub Pages para este alojamiento.

## Validación pendiente

Las comprobaciones del empaquetador no ejecutan PixInsight ni verifican criptográficamente las firmas. Antes de la primera entrega hay que comprobar la firma, una instalación nueva y una actualización desde una versión anterior dentro de PixInsight.

## Probar la mezcla de focales

La versión de desarrollo [Mezcla_Focales.js](src/scripts/crinconlab/Mezcla_Focales.js) trabaja con imágenes estiradas y sin estrellas, ya registradas, y una máscara de cobertura. Permite dibujar un polígono sobre el detalle, mover sus vértices y previsualizar su transición, seleccionar una banda de detalle, ajustar intensidad y ganancia y comparar a resolución completa sin aplicar STF.

Consulta [entradas, controles, método y límites](docs/mezcla-focales.md). Las pruebas fuera de PixInsight se ejecutan con `node --test tests/mezcla_focales.test.cjs`. La ejecución con los procesos y la interfaz nativos sigue pendiente; se incluye una [prueba sintética para PixInsight](tests/Test_Mezcla_Focales_PixInsight.js).

El [icono SVG](src/scripts/crinconlab/Mezcla_Focales.svg) debe guardarse junto al archivo JavaScript al instalarlo.



## PolyMask 0.1.0 — versión preliminar

Editor independiente de máscaras poligonales sobre una imagen RGB o monocroma. Incluye vértices editables, menú contextual, zoom y desplazamiento sincronizados, previsualización con superposición, suavizado hacia dentro o a ambos lados, inversión y aplicación opcional de la máscara. No requiere astrometría ni otra imagen.

- [Descargar PolyMask 0.1.0](https://github.com/crinconlab/pixinsight-scripts/releases/tag/polymask-v0.1.0)
- [Manual en inglés](docs/polymask.md)
- [Inicio rápido](docs/polymask-quick-start.txt)
- [Comprobaciones realizadas](docs/polymask-validation.txt)

Se han superado 26 comprobaciones nativas en PixInsight 1.9.5. Es una primera versión pendiente de la validación del usuario con imágenes reales. Se distribuye como ZIP para instalación manual; no activa ni modifica el repositorio de actualizaciones automáticas.

Copyright © Carlos Rincón 2026.

## Current download

[Download the corrected 2026-10-31 collection](https://github.com/crinconlab/pixinsight-scripts/releases/tag/collection-2026-10-31), including complete and four-script CPD packages, icons, English manuals and SHA-256 checksums. The obsolete 2026-10-26 ZIP has been withdrawn.
