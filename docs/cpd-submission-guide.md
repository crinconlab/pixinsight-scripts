# Guía de envío — Crinconlab

**Manual workflow validation:** Carlos Rincón confirms that astrometric solving with ImageSolver and full color calibration with SPCC were manually tested and completed successfully in **both PixInsight 1.9.5 and 1.9.6**. This author-confirmed end-to-end validation complements the automated development and native processing checks.

Paquete candidato de cuatro scripts, 29 de octubre de 2026.

## Enlaces para el formulario

- Fuentes: https://github.com/crinconlab/pixinsight-scripts/tree/cpd-review
- Descripción en inglés: https://github.com/crinconlab/pixinsight-scripts/blob/cpd-review/docs/cpd-scripts-en.md
- Informe: https://github.com/crinconlab/pixinsight-scripts/blob/cpd-review/docs/validation-pixinsight-1.9.6.md
- ZIP de la rama: https://github.com/crinconlab/pixinsight-scripts/archive/refs/heads/cpd-review.zip
- Checksums del contenido: https://github.com/crinconlab/pixinsight-scripts/blob/cpd-review/SHA256SUMS.txt

Identificador solicitado en la documentación anterior: `Carlos_Rincon_Astrophoto`. Usar la identidad de la solicitud anterior si coincide; no generar nuevas claves por este documento.

## Texto en inglés para acompañar la solicitud

Crinconlab is a collection of four complementary PixInsight tools by Carlos Rincón: FITS/XISF Header Editor 1.0.1, RGB DualBand Solver SPCC 0.14.3, Focal Length Blend 0.11.7 and Astrometric Solution Copy 1.1.

The cpd-review branch provides the source code, matching icons, English manuals, technical disclosures and SHA-256 checksums. Native testing on PixInsight 1.9.6/macOS confirms metadata editing, registration and reprojection, astrometric transfer, MLT blending, native StarX separation and Screen recombination, protected output paths, and responsive sample downloads with SHA-256 verification and cancellation.

Automated development checks in PixInsight 1.9.5 covered astrometric-solution handling, ImageSolver initialization and SPCC configuration/workflow integration. The validation summary identifies the tested workflows and their requirements. The author has also confirmed successful manual ImageSolver and full SPCC runs on both PixInsight 1.9.5 and 1.9.6. The package is currently distributed manually while the CPD application is reviewed.

Source and technical descriptions: https://github.com/crinconlab/pixinsight-scripts/blob/cpd-review/docs/cpd-scripts-en.md

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


