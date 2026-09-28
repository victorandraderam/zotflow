---
{%- assign csl = item.csljson -%}
{%- assign tipo_csl = csl.type | default: "" -%}
{%- assign genero = csl.genre | default: "" | downcase | strip -%}
{%- assign es_normativa = false -%}
{%- case tipo_csl -%}
{%- when "legislation", "regulation", "bill", "legal_case", "standard", "treaty" -%}{%- assign es_normativa = true -%}
{%- when "report" -%}{%- if csl.authority -%}{%- assign es_normativa = true -%}{%- endif -%}
{%- when "document" -%}{%- if genero == "publicación judicial" or genero == "aviso" -%}{%- assign es_normativa = true -%}{%- endif -%}
{%- endcase %}
clave: {{ item.citationKey | default: item.key | json }}
tipo: {{ item.itemType | json }}
titulo: {{ item.title | json }}
autores: [{% for c in item.creators %}{{ c.name | json }}{% unless forloop.last %}, {% endunless %}{% endfor %}]
anio: {{ item.year | default: "" | json }}
publicacion: {{ item.publicationTitle | default: item.publisher | default: "" | json }}
doi: {{ item.DOI | default: "" | json }}
url: {{ item.url | default: "" | json }}
colecciones: [{% for p in item.itemPaths %}{{ p | json }}{% unless forloop.last %}, {% endunless %}{% endfor %}]
tags: [{% for t in item.tags %}{{ "zotero/" | append: t.tag | replace: " ", "_" | json }}{% unless forloop.last %}, {% endunless %}{% endfor %}]
zotero: {{ item | item_link: "zotero" | json }}
{%- if es_normativa -%}
{%- assign clase = "sin clase del contrato" -%}
{%- case tipo_csl -%}
{%- when "legislation" -%}
{%- case genero -%}{%- when "ley" -%}{%- assign clase = "ley" -%}{%- when "dfl" -%}{%- assign clase = "dfl" -%}{%- when "dl" -%}{%- assign clase = "dl" -%}{%- when "código" -%}{%- assign clase = "codigo" -%}{%- when "constitución política de la república" -%}{%- assign clase = "constitucion" -%}{%- endcase -%}
{%- when "regulation" -%}
{%- case genero -%}{%- when "ds", "decreto supremo" -%}{%- assign clase = "ds" -%}{%- when "reglamento" -%}{%- assign clase = "reglamento" -%}{%- when "decreto exento", "resolución exenta" -%}{%- assign clase = "do-norma" -%}{%- endcase -%}
{%- when "standard" -%}
{%- case genero -%}{%- when "" -%}{%- when "norma de carácter general" -%}{%- assign clase = "ncg" -%}{%- when "circular" -%}{%- assign clase = "circular" -%}{%- when "oficio" -%}{%- assign clase = "oficio" -%}{%- when "capítulo ran" -%}{%- assign clase = "ran" -%}{%- when "capítulo cnf" -%}{%- assign clase = "cnf" -%}{%- when "capítulo msi" -%}{%- assign clase = "msi" -%}{%- else -%}{%- assign clase = "norma-ext" -%}{%- endcase -%}
{%- when "treaty" -%}
{%- comment -%}
  Género real de la biblioteca, no solo el de la tabla: "Reglamento
  Delegado (UE)" y "Reglamento de Ejecución (UE)" siguen siendo
  ue-reglamento, y la forma prelisboa "Directiva" (sin "(UE)", el marcador
  va en el número: "Directiva 2009/110/CE") sigue siendo ue-directiva.
  `contains` en vez de `==`, como ya hace la rama `bill` con "propuesta".
  Sin colisión entre sí: tipo_csl ya aisló esta rama de la de `regulation`,
  donde vive el "reglamento" chileno.
{%- endcomment -%}
{%- if genero contains "reglamento" -%}{%- assign clase = "ue-reglamento" -%}{%- elsif genero contains "directiva" -%}{%- assign clase = "ue-directiva" -%}{%- elsif genero == "tratado" -%}{%- assign clase = "tratado" -%}{%- endif -%}
{%- when "bill" -%}
{%- case genero -%}{%- when "proyecto de ley" -%}{%- assign clase = "pdl" -%}{%- when "moción" -%}{%- assign clase = "mocion" -%}{%- when "mensaje" -%}{%- assign clase = "mensaje" -%}{%- else -%}{%- if genero contains "propuesta" -%}{%- assign clase = "ue-propuesta" -%}{%- endif -%}{%- endcase -%}
{%- when "legal_case" -%}
{%- case genero -%}{%- when "sentencia" -%}{%- assign clase = "sentencia" -%}{%- when "resolución" -%}{%- assign clase = "resolucion" -%}{%- when "decisión de amparo" -%}{%- assign clase = "amparo" -%}{%- endcase -%}
{%- when "document" -%}
{%- case genero -%}{%- when "publicación judicial" -%}{%- assign clase = "do-judicial" -%}{%- when "aviso" -%}{%- assign clase = "do-aviso" -%}{%- endcase -%}
{%- when "report" -%}{%- assign clase = "dictamen" -%}
{%- endcase -%}
{%- assign status_l = csl.status | default: "" | downcase | strip -%}
{%- assign vigencia = "sin dato" -%}
{%- if status_l == "revocada" -%}{%- assign vigencia = "revocada" -%}{%- elsif csl.references -%}{%- assign vigencia = "modificada" -%}{%- elsif status_l != "" -%}{%- assign vigencia = status_l -%}{%- endif -%}
{%- comment -%}
  date-parts trae [año, mes, día] como números; join a secas da "2023-1-4",
  que Obsidian no reconoce como fecha en Propiedades. prepend/slice rellena
  a dos dígitos sin depender de un filtro de formato que Liquid no trae.
{%- endcomment -%}
{%- assign fp = csl.issued["date-parts"][0] -%}
{%- assign fecha_iso = "" -%}
{%- if fp and fp[0] -%}
{%- assign fecha_iso = fp[0] -%}
{%- if fp[1] -%}
{%- assign mes_iso = fp[1] | prepend: "0" | slice: -2, 2 -%}
{%- assign fecha_iso = fecha_iso | append: "-" | append: mes_iso -%}
{%- if fp[2] -%}
{%- assign dia_iso = fp[2] | prepend: "0" | slice: -2, 2 -%}
{%- assign fecha_iso = fecha_iso | append: "-" | append: dia_iso -%}
{%- endif -%}
{%- endif -%}
{%- endif %}
organo: {{ csl.authority | default: csl.publisher | default: "" | json }}
denominacion: {{ csl.genre | default: "" | json }}
numero: {{ csl.number | default: "" | json }}
fecha: {{ fecha_iso | json }}
vigencia: {{ vigencia | json }}
clase: {{ clase | json }}
enlace_oficial: {{ csl.URL | default: "" | json }}
{%- endif %}
??estado: leyendo
??valoracion: 0
??proyectos: []
---
{%- capture quote_string %}{{ newline }}> {% endcapture -%}
{%- capture quote_string_2 %}{{ newline }}> > {% endcapture -%}
{%- assign csl = item.csljson -%}
{%- assign tipo_csl = csl.type | default: "" -%}
{%- assign genero = csl.genre | default: "" | downcase | strip -%}
{%- assign es_normativa = false -%}
{%- case tipo_csl -%}
{%- when "legislation", "regulation", "bill", "legal_case", "standard", "treaty" -%}{%- assign es_normativa = true -%}
{%- when "report" -%}{%- if csl.authority -%}{%- assign es_normativa = true -%}{%- endif -%}
{%- when "document" -%}{%- if genero == "publicación judicial" or genero == "aviso" -%}{%- assign es_normativa = true -%}{%- endif -%}
{%- endcase -%}
{%- assign status_l = csl.status | default: "" | downcase | strip -%}
{%- assign vigencia = "sin dato" -%}
{%- if status_l == "revocada" -%}{%- assign vigencia = "revocada" -%}{%- elsif csl.references -%}{%- assign vigencia = "modificada" -%}{%- elsif status_l != "" -%}{%- assign vigencia = status_l -%}{%- endif -%}
{%- assign fp = csl.issued["date-parts"][0] -%}
{%- assign fecha_iso = "" -%}
{%- if fp and fp[0] -%}
{%- assign fecha_iso = fp[0] -%}
{%- if fp[1] -%}
{%- assign mes_iso = fp[1] | prepend: "0" | slice: -2, 2 -%}
{%- assign fecha_iso = fecha_iso | append: "-" | append: mes_iso -%}
{%- if fp[2] -%}
{%- assign dia_iso = fp[2] | prepend: "0" | slice: -2, 2 -%}
{%- assign fecha_iso = fecha_iso | append: "-" | append: dia_iso -%}
{%- endif -%}
{%- endif -%}
{%- endif -%}
# {{ item.title }}

{% if es_normativa -%}
## Ficha jurídica

- Órgano: {{ csl.authority | default: csl.publisher | default: "sin dato" }}
- Denominación y número: {% capture denom_txt %}{{ csl.genre | default: "" }} {{ csl.number | default: "" }}{% endcapture %}{{ denom_txt | strip | default: "sin dato" }}
- Fecha: {{ fecha_iso | default: "sin dato" }}
- Vigencia: {{ vigencia }}
- Enlace oficial: {% if csl.URL %}<{{ csl.URL }}>{% else %}sin dato{% endif %}
{%- else -%}
## Ficha

- Autores: {% capture autores_txt %}{% for c in item.creators %}{{ c.name }}{% unless forloop.last %}; {% endunless %}{% endfor %}{% endcapture %}{{ autores_txt | strip | default: "sin dato" }}
- Año: {{ item.year | default: "sin dato" }}
- Publicación: {{ item.publicationTitle | default: item.publisher | default: "sin dato" }}
{%- if item.DOI %}
- DOI: [{{ item.DOI }}](https://doi.org/{{ item.DOI }})
{%- elsif item.url %}
- Enlace: <{{ item.url }}>
{%- endif %}
{%- endif %}
- [Abrir en Zotero]({{ item | item_link: "zotero" }}){% for att in item.attachments %}{% if att.contentType == "application/pdf" %} · [Abrir el PDF]({{ att | attachment_link }}){% break %}{% endif %}{% endfor %}
{% if item.abstractNote and es_normativa == false %}
## Resumen

{{ item.abstractNote }}
{% endif %}
{%- if item.attachmentAnnotations.size > 0 %}
## Anotaciones
{%- assign secciones = "Ideas clave|Críticas y contradicciones|Datos y evidencia|Definiciones|Citas para usar|Por verificar|Otros" | split: "|" -%}
{%- assign colores = "#ffd400 #f9e196 #fed144|#ff6666|#5fb236|#2ea8e5|#a28ae5|#f19837|ninguno" | split: "|" -%}
{%- assign conocidos = "#ffd400 #f9e196 #fed144 #ff6666 #5fb236 #2ea8e5 #a28ae5 #f19837" | split: " " -%}
{%- for seccion in secciones -%}
{%- assign lista = colores[forloop.index0] | split: " " -%}
{%- capture bloque -%}
{%- for a in item.attachmentAnnotations -%}
{%- assign c = a.color | default: "" | downcase -%}
{%- assign entra = false -%}
{%- if seccion == "Otros" -%}{%- unless conocidos contains c -%}{%- assign entra = true -%}{%- endunless -%}{%- elsif lista contains c -%}{%- assign entra = true -%}{%- endif -%}
{%- if entra %}
> [!zotflow-{{ a.type }}-{{ a.color }}] [p. {{ a.pageLabel }}]({{ a | annotation_link }})
{%- if a.type == "ink" or a.type == "image" %}
> > ![[{{ settings.annotationImageFolder }}/{{ a.key }}.png]]
{%- else %}
> > {{ a.text | replace: newline, quote_string_2 }}
{%- endif %}
>
> {{ a.comment | wrap_editable: "ANNO", a.key | replace: newline, quote_string }}
{%- if a.tags.size > 0 %}
> {% for t in a.tags %}#{{ t.tag | replace: " ", "_" }} {% endfor %}
{%- endif %}
^{{ a.key }}
{% endif -%}
{%- endfor -%}
{%- endcapture -%}
{%- if bloque != "" %}

### {{ seccion }}
{{ bloque }}
{%- endif -%}
{%- endfor %}
{% endif %}
## Notas de lectura
{% if item.notes.size > 0 -%}
{%- for note in item.notes %}
{{ note.note | html2md | wrap_editable: "NOTE", note.key }}
{% endfor -%}
{%- else -%}
_Sin notas hijas. Para crear una: «ZotFlow: Create child note for current source note»._
{%- endif %}

## Ideas propias
<!-- ZF_PERSIST_BEG_ideas -->

<!-- ZF_PERSIST_END_ideas -->
