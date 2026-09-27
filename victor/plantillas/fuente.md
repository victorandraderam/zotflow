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
{%- case genero -%}{%- when "ds" -%}{%- assign clase = "ds" -%}{%- when "reglamento" -%}{%- assign clase = "reglamento" -%}{%- when "decreto exento", "resolución exenta" -%}{%- assign clase = "do-norma" -%}{%- endcase -%}
{%- when "standard" -%}
{%- case genero -%}{%- when "" -%}{%- when "norma de carácter general" -%}{%- assign clase = "ncg" -%}{%- when "circular" -%}{%- assign clase = "circular" -%}{%- when "oficio" -%}{%- assign clase = "oficio" -%}{%- when "capítulo ran" -%}{%- assign clase = "ran" -%}{%- when "capítulo cnf" -%}{%- assign clase = "cnf" -%}{%- when "capítulo msi" -%}{%- assign clase = "msi" -%}{%- else -%}{%- assign clase = "norma-ext" -%}{%- endcase -%}
{%- when "treaty" -%}
{%- case genero -%}{%- when "reglamento (ue)" -%}{%- assign clase = "ue-reglamento" -%}{%- when "directiva (ue)" -%}{%- assign clase = "ue-directiva" -%}{%- when "tratado" -%}{%- assign clase = "tratado" -%}{%- endcase -%}
{%- when "bill" -%}
{%- case genero -%}{%- when "proyecto de ley" -%}{%- assign clase = "pdl" -%}{%- when "moción" -%}{%- assign clase = "mocion" -%}{%- when "mensaje" -%}{%- assign clase = "mensaje" -%}{%- else -%}{%- if genero contains "propuesta" -%}{%- assign clase = "ue-propuesta" -%}{%- endif -%}{%- endcase -%}
{%- when "legal_case" -%}
{%- case genero -%}{%- when "sentencia" -%}{%- assign clase = "sentencia" -%}{%- when "resolución" -%}{%- assign clase = "resolucion" -%}{%- when "decisión de amparo" -%}{%- assign clase = "amparo" -%}{%- endcase -%}
{%- when "document" -%}
{%- case genero -%}{%- when "publicación judicial" -%}{%- assign clase = "do-judicial" -%}{%- when "aviso" -%}{%- assign clase = "do-aviso" -%}{%- endcase -%}
{%- when "report" -%}{%- assign clase = "dictamen" -%}
{%- endcase -%}
{%- assign vigencia = "sin dato" -%}
{%- if csl.status == "revocada" -%}{%- assign vigencia = "revocada" -%}{%- elsif csl.references -%}{%- assign vigencia = "modificada" -%}{%- elsif csl.status -%}{%- assign vigencia = csl.status -%}{%- endif %}
organo: {{ csl.authority | default: csl.publisher | default: "" | json }}
denominacion: {{ csl.genre | default: "" | json }}
numero: {{ csl.number | default: "" | json }}
fecha: {{ csl.issued["date-parts"][0] | join: "-" | json }}
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
{%- assign vigencia = "sin dato" -%}
{%- if csl.status == "revocada" -%}{%- assign vigencia = "revocada" -%}{%- elsif csl.references -%}{%- assign vigencia = "modificada" -%}{%- elsif csl.status -%}{%- assign vigencia = csl.status -%}{%- endif %}
# {{ item.title }}

{% if es_normativa -%}
## Ficha jurídica

- Órgano: {{ csl.authority | default: csl.publisher | default: "sin dato" }}
- Denominación y número: {{ csl.genre | default: "" }} {{ csl.number | default: "" }}
- Fecha: {{ csl.issued["date-parts"][0] | join: "-" | default: "sin dato" }}
- Vigencia: {{ vigencia }}
- Enlace oficial: {% if csl.URL %}<{{ csl.URL }}>{% else %}sin dato{% endif %}
{%- else -%}
## Ficha

- Autores: {% for c in item.creators %}{{ c.name }}{% unless forloop.last %}; {% endunless %}{% endfor %}
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
