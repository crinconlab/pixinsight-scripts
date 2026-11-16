# Estado final

Las seis firmas de código y la firma XML definitiva ya están recibidas y verificadas en PixInsight 1.9.6. No es necesario volver a firmar estos archivos. La descarga desde Check for Updates ha pasado; la instalación se ha programado para el cierre de la aplicación. Las instrucciones siguientes se conservan como historial de preparación y no indican tareas pendientes.

# Firma y publicación — candidato 2026.11.16

No está publicado. El índice activo continúa en 2026.11.12.

## Lo que debes firmar ahora

Extrae el kit completo. No cambies los archivos después de firmarlos. Usa tu identidad CPD `Carlos_Rincon_Astrophoto` desde PixInsight 1.9.6 y conserva la clave privada exclusivamente en tu Mac.

En Script > Development > CodeSign:

1. Firma como **code file** `src/scripts/crinconlab/PolyMaskProjects.jsh` → `PolyMaskProjects.xsgn`.
2. Firma como **scripts** estos tres archivos (pueden seleccionarse juntos):
   - `src/scripts/crinconlab/PolyMask_EN.js` → `PolyMask_EN.xsgn`.
   - `src/scripts/crinconlab/RGB_Ha_Blend.js` → `RGB_Ha_Blend.xsgn`.
   - `src/scripts/crinconlab/Mezcla_Focales.js` → `Mezcla_Focales.xsgn`.

Focal no ha cambiado de código, pero su firma anterior no valida en el entorno actual. No se conserva esa firma inválida. Las firmas de Header Editor y ProtectedPaths sí validan y están incluidas. Firmar los auxiliares antes de los scripts facilita verificar todo con la misma instalación y dependencias de ImageSolver.

3. Devuelve los **cuatro .xsgn** anteriores. No envíes la clave privada ni su contraseña.

## Después de recibir las firmas

4. Verificaremos las seis firmas mediante `tools/Verify_All_Signatures_PixInsight.js`, renovaremos el manifiesto y las sumas de comprobación y construiremos el ZIP definitivo. Los cambios de documentación/metadatos se cierran antes de congelar el ZIP.
Desde la raíz del kit/repo, después de ejecutar la verificación nativa con las firmas nuevas:

```sh
python3 tools/finalize_signed_sources.py
python3 tools/build_release.py --config release.cpd.json --release-date 20261116
```

La herramienta de metadatos exige el informe nativo y comprueba las fuentes congeladas. No firma archivos, no publica nada y no sustituye volver a ejecutar la verificación nativa inmediatamente antes de empaquetar.

5. Adjuntaremos ese ZIP firmado a la Release versionada `suite-2026.11.16`, comprobaremos la descarga pública HTTPS, su tamaño, SHA-1 y SHA-256. La Release debe ser pública para que PixInsight acceda sin credenciales. El índice activo sigue intacto en este paso.
6. Te entregaremos **un único `updates.xri` definitivo** para firmar como XML. No hay que firmar aún ningún índice del kit: no contiene uno nuevo. El ZIP no se vuelve a modificar después de calcular sus hashes.
7. Con el índice firmado, verificaremos la firma XML y haremos la prueba real de Check for Updates desde un repositorio de pruebas antes de reemplazar el índice de producción. Se mantendrá la URL que los usuarios ya tienen añadida.

Si cambian las fuentes o las dependencias incluidas de ImageSolver después de firmar, hay que volver a validar/re-firmar los archivos afectados, reconstruir el ZIP y firmar otra vez el índice. No se cambia la instalación general por el caso aislado de Marty.
