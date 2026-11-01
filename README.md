# Crinconlab PixInsight Scripts

Current four reviewed products: Header Editor 1.0.1, RGB Ha Blend 0.15.1, Focal Length Blend 0.11.9 and Astrometric Solution Copy 1.1. PolyMask is provided separately from the CPD review scope.

## Signed update repository

The first signed four-product distribution is **2026.11.01**, targeting **PixInsight 1.9.6**. It contains Header Editor 1.0.1, Astrometric Solution Copy 1.1, RGB Ha Blend 0.15.1 and Focal Length Blend 0.11.9, with their signatures, the shared ProtectedPaths library, icons and English manuals. PolyMask remains separate.

In PixInsight, select **Resources > Updates > Manage Repositories > Add** and enter:

```text
https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/repository/
```

Then use **Resources > Updates > Check for Updates** and follow the installation/restart prompts. Signature recognition requires the certified-developer database update containing `Carlos_Rincon_Astrophoto`, as announced by PTeam. The first native installation of this distribution is being validated; see [distribution checks](docs/distribution-2026-11-01.json).

For manual installations, avoid registering a second copy of the same script through Feature Scripts. Keep the full script folder and its resources together.

The previous 2026-10-26 collection is superseded. Install the current source folder from this branch, including icons, manuals and ProtectedPaths.jsh. The corrected complete collection is linked below.

[CPD correction details](docs/cpd-review-corrections.md) · [Reviewed four-script branch](https://github.com/crinconlab/pixinsight-scripts/tree/cpd-review)

The manual-installation collection ZIP linked below includes all five current scripts, five orange icons, and English manuals. Extract the complete Crinconlab folder, preserving its icons and manuals subfolders. In PixInsight, use Script > Feature Scripts > Add to register that folder. Remove registrations pointing to older copies if duplicate entries appear.

| Script | File |
| --- | --- |
| FITS / XISF Header Editor | [FITS_XISF_Header_Editor_EN.js](src/scripts/crinconlab/FITS_XISF_Header_Editor_EN.js) |
| RGB Ha Blend | [RGB_Ha_Blend.js](src/scripts/crinconlab/RGB_Ha_Blend.js) |
| Focal Length Blend | [Mezcla_Focales.js](src/scripts/crinconlab/Mezcla_Focales.js) |
| Astrometric Solution Copy | [Astrometric_Solution_Copy_EN.js](src/scripts/crinconlab/Astrometric_Solution_Copy_EN.js) |
| PolyMask | [PolyMask_EN.js](src/scripts/crinconlab/PolyMask_EN.js) |

[English manuals](src/scripts/crinconlab/manuals) · [Collection instructions](src/scripts/crinconlab/README_EN.txt) · [Version manifest](src/scripts/crinconlab/manifest.json)

PolyMask 0.1.0 is preliminary: 26 native programmatic checks passed in PixInsight 1.9.5; user testing with real images and mouse interaction remains pending. PolyMask is distributed through the preliminary manual-installation collection; it is not included in the four-product automatic update package.

Copyright © Carlos Rincón 2026.

---

# Publication tooling and earlier development notes

Scripts para PixInsight de crinconlab y preparación de su repositorio de actualizaciones.

**Estado: primera distribución firmada publicada, versión 2026.11.01 para PixInsight 1.9.6. La prueba de instalación mediante el gestor de actualizaciones está pendiente. PolyMask sigue en desarrollo y fuera de ese paquete.**

## Estructura

| Ruta | Contenido |
| --- | --- |
| `src/scripts/crinconlab/` | Scripts, firmas públicas y recursos que se instalarán |
| `tools/build_release.py` | Preparación local del ZIP y del índice `updates.xri` |
| `release.example.json` | Plantilla de metadatos para una publicación |
| `build/` | Resultados locales, pendientes de firma y comprobación; ignorados por Git |
| `repository/` | ZIP de instalación e índice `updates.xri` firmados |
| `docs/publicacion.md` | Procedimiento de firma, empaquetado y actualización |

## Próximo paso

Comprobar el reconocimiento de la identidad CPD y la instalación de la distribución 2026.11.01 en PixInsight 1.9.6. La configuración del paquete de cuatro productos está en [release.cpd.json](release.cpd.json). Las claves `.xssk` y su contraseña permanecen fuera del repositorio.

La guía [Publicar una versión](docs/publicacion.md) explica el procedimiento. El empaquetador requiere Python 3.9 o posterior y solo utiliza la biblioteca estándar.

## Dirección del repositorio para PixInsight

```text
https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/repository/
```

Esta dirección contiene el índice firmado y el paquete de la distribución 2026.11.01. No es necesario activar GitHub Pages para este alojamiento.

## Validación pendiente

Las comprobaciones del empaquetador no ejecutan PixInsight ni verifican criptográficamente las firmas. Queda comprobar el reconocimiento criptográfico de las firmas y una instalación nueva de esta distribución dentro de PixInsight. Las futuras distribuciones requerirán también una prueba de actualización desde la anterior.

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

[Download the corrected 2026-10-31 collection](https://github.com/crinconlab/pixinsight-scripts/releases/tag/collection-2026-10-31-r2), including complete and four-script CPD packages, icons, English manuals and SHA-256 checksums. The obsolete 2026-10-26 ZIP has been withdrawn.
