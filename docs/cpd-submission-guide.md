# Guía de envío — Crinconlab

Paquete candidato de cuatro scripts, 29 de octubre de 2026.

## Enlaces para el formulario

- Fuentes: https://github.com/crinconlab/pixinsight-scripts/tree/cpd-review
- Descripción en inglés: https://github.com/crinconlab/pixinsight-scripts/blob/cpd-review/docs/cpd-scripts-en.md
- Informe: https://github.com/crinconlab/pixinsight-scripts/blob/cpd-review/docs/validation-pixinsight-1.9.6.md
- ZIP de la rama: https://github.com/crinconlab/pixinsight-scripts/archive/refs/heads/cpd-review.zip
- Checksums del contenido: https://github.com/crinconlab/pixinsight-scripts/blob/cpd-review/SHA256SUMS.txt

Identificador solicitado en la documentación anterior: `Carlos_Rincon_Astrophoto`. Usar la identidad de la solicitud anterior si coincide; no generar nuevas claves por este documento.

## Texto en inglés para acompañar la solicitud

Crinconlab is a collection of four PixInsight scripts by Carlos Rincón: FITS/XISF Header Editor 1.0.0, RGB DualBand Solver SPCC 0.14.2, Focal Length Blend 0.11.5 and Astrometric Solution Copy 1.1. PolyMask is excluded from this request.

The cpd-review branch contains the final source files, icons, English manuals, product descriptions, manifest and SHA-256 checksums. Native checks were performed in PixInsight Core 1.9.6 on macOS for interfaces, header editing, astrometric copying, reprojection/cropping, MLT blending and a real HTTPS sample download with pinned SHA-256 verification. The validation report distinguishes these results from SPCC, fresh solving and StarXTerminator compatibility accepted by the author based on prior operation.

The package is currently distributed manually, without CPD signatures or an active automatic-update repository. The descriptions disclose file access, preferences, optional sample downloads and dependencies on the installed official ImageSolver, SPCC/Gaia DR3SP and optional StarXTerminator.

## Campos comprobados en SubmitCPD 1.2.1 instalado

Ruta del menú declarada por el script: **Script > Development > SubmitCPD**. Se ha comprobado la versión 1.2.1 en los archivos instalados, sin abrir ni enviar una solicitud.

- **Developer identifier:** reutilizar el de la petición anterior (`Carlos_Rincon_Astrophoto` si es el que usaste).
- **Signing keys file:** seleccionar personalmente el archivo anterior si se conserva. El formulario puede recuperar de él el identificador y la clave pública. No adjuntar ese archivo al repositorio.
- **Name:** Carlos Rincón — Crinconlab.
- **URL:** https://github.com/crinconlab/pixinsight-scripts/blob/cpd-review/docs/cpd-scripts-en.md
- **Information:** el texto en inglés anterior; puede añadirse el enlace del informe y la rama.
- **Contact email / Public email:** revisar y completar personalmente según las indicaciones del formulario.

## Envío

Abrir SubmitCPD desde PixInsight 1.9.6 y verificar que indica 1.2.1, conforme a la indicación de PTeam registrada en esta revisión. Completar los campos que presente el formulario, comprobar los enlaces, revisar y aceptar personalmente las normas vigentes y enviar. No se afirma aquí que el formulario tenga campos adicionales concretos ni se ha enviado nada automáticamente.
