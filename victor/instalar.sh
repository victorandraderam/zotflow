#!/usr/bin/env bash
# Instala esta compilación de ZotFlow y la plantilla en el vault de Víctor.
# Obsidian tiene que estar cerrado: si no, reescribe community-plugins.json y
# data.json al salir y se lleva estos cambios.
#
# INSTALAR_SIN_CERRAR_OBSIDIAN=1 salta ese resguardo, pero SOLO cuando VAULT
# no es el vault real ($HOME/Documents/notas): sirve para probar el
# instalador contra un vault temporal con Obsidian abierto en el de verdad.
# Contra el vault real la variable no tiene ningún efecto: el resguardo se
# aplica siempre, se ponga o no.
set -euo pipefail
cd "$(dirname "$0")/.."
VAULT="${VAULT:-$HOME/Documents/notas}"
VAULT_REAL="$HOME/Documents/notas"
PLUGIN="$VAULT/.obsidian/plugins/zotflow"

if pgrep -xq Obsidian; then
  if [ "${INSTALAR_SIN_CERRAR_OBSIDIAN:-}" = "1" ] && [ "$VAULT" != "$VAULT_REAL" ]; then
    echo "Obsidian sigue abierto, pero VAULT ($VAULT) no es el vault real: se instala igual." >&2
  else
    echo "Cierra Obsidian antes de instalar." >&2
    exit 1
  fi
fi
for f in main.js manifest.json styles.css; do
  [ -f "$f" ] || { echo "Falta $f: corre antes npm run build:ci" >&2; exit 1; }
done

mkdir -p "$PLUGIN" "$VAULT/Templates/zotflow" "$VAULT/Academia/Biblioteca/_imagenes"
cp main.js manifest.json styles.css "$PLUGIN/"
cp victor/plantillas/fuente.md "$VAULT/Templates/zotflow/fuente.md"

python3 - "$PLUGIN/data.json" "victor/plantillas/ruta.txt" "$VAULT/.obsidian/community-plugins.json" <<'PY'
import json, pathlib, sys
datos, ruta, activos = map(pathlib.Path, sys.argv[1:4])
d = json.loads(datos.read_text()) if datos.exists() else {"settings": {}, "customThemes": [], "viewStates": {}}
s = d.setdefault("settings", {})
s.update({
    # Primero que nada: con la opción de fábrica la primera sincronización
    # crearía una nota por cada entrada de la biblioteca.
    "sourceNoteCreation": "annotated",
    "librarySourceNoteTemplatePath": "Templates/zotflow/fuente.md",
    "librarySourceNotePathTemplate": ruta.read_text().strip(),
    "annotationImageFolder": "Academia/Biblioteca/_imagenes",
    "autoImportAnnotationImages": True,
    "autoUpdateSourceNotesAfterSync": True,
    # Mandar una entrada a la papelera de Zotero no puede llevarse las ideas propias.
    "autoPurgeTrashedSourceNotes": False,
    "autoSync": True,
    "syncInterval": 30,
    "defaultCitationFormat": "pandoc",
    "librariesConfig": {
        "6296167": {"mode": "bidirectional"},
        "4592602": {"mode": "readonly"},
    },
})
datos.write_text(json.dumps(d, indent=2, ensure_ascii=False))
lista = json.loads(activos.read_text())
if "zotflow" not in lista:
    lista.append("zotflow")
    activos.write_text(json.dumps(lista, indent=2))
print("instalado:", datos.parent)
PY
shasum -a 256 main.js | tee "$PLUGIN/main.js.sha256"
