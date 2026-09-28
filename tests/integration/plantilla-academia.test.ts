/**
 * Plantilla de Víctor (rama victor): la nota de literatura, la de normativa y
 * la ruta. Corre con el motor de plantillas real de ZotFlow.
 */
import { describe, test, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LibraryTemplateService } from "worker/services/library-template";
import { DbHelperService } from "worker/services/db-helper";
import { NotePathService } from "worker/services/note-path";
import { ConvertService } from "worker/services/convert";
import { LibraryService } from "worker/services/library";
import { SearchService } from "worker/services/search";
import { ZoteroAPIService } from "worker/services/zotero";
import { DEFAULT_SETTINGS } from "settings/types";
import { db, resetDb, seedItem, seedLibrary } from "../fakes/db";
import { createFakeParentHost } from "../fakes/parent-host";
import type { CslRenderWorkerService } from "worker/services/csl-render";
import type { AnyIDBZoteroItem } from "types/db-schema";

const LIB = 1;
const GROUP = 4592602;
const API_KEY = "TESTKEY";
const raiz = join(import.meta.dirname, "../../victor/plantillas");
const PLANTILLA = readFileSync(join(raiz, "fuente.md"), "utf8");
const RUTA = readFileSync(join(raiz, "ruta.txt"), "utf8").trim();

let service: LibraryTemplateService;
let paths: NotePathService;

beforeEach(async () => {
    await resetDb();
    await seedLibrary({ id: LIB, type: "user", name: "My Library" });
    await seedLibrary({ id: GROUP, type: "group", name: "dataprivacy" });
    await db.keys.put({
        key: API_KEY,
        userID: LIB,
        username: "test-user",
        displayName: "Test User",
        access: { user: { library: true, files: true, notes: true, write: true } },
        joinedGroups: [GROUP],
    });
    const host = createFakeParentHost({ vaultConfig: { strictLineBreaks: false } });
    const settings = {
        ...DEFAULT_SETTINGS,
        zoteroapikey: API_KEY,
        librariesConfig: { [LIB]: { mode: "bidirectional" as const } },
        annotationImageFolder: "Academia/Biblioteca/_imagenes",
    };
    const cslRender = {
        renderCitation: () => Promise.resolve(""),
        renderBibliography: () => Promise.resolve([]),
    } as unknown as CslRenderWorkerService;
    const dbHelper = new DbHelperService(
        settings,
        host,
        new LibraryService(settings, host),
        new SearchService(),
    );
    paths = new NotePathService(settings, dbHelper);
    service = new LibraryTemplateService(
        settings,
        host,
        dbHelper,
        paths,
        new ConvertService(),
        cslRender,
        new ZoteroAPIService(API_KEY),
    );
});

async function entrada(
    key: string,
    itemType: string,
    csljson: Record<string, unknown>,
    data: Record<string, unknown> = {},
    libraryID = LIB,
    citationKey = `clave${key.toLowerCase()}`,
): Promise<AnyIDBZoteroItem> {
    await seedItem({
        libraryID,
        key,
        itemType,
        title: `Título ${key}`,
        citationKey,
        version: 3,
        csljson: { id: key, ...csljson },
        raw: {
            key,
            version: 3,
            library: { type: "user", id: libraryID, name: "L" },
            meta: {},
            data: { key, version: 3, itemType, title: `Título ${key}`, tags: [], relations: {}, ...data },
        },
    } as never);
    return (await db.items.get([libraryID, key]))!;
}

async function anotacion(key: string, parentItem: string, color: string, texto: string) {
    await seedItem({
        libraryID: LIB,
        key,
        itemType: "annotation",
        parentItem,
        raw: {
            key,
            library: { type: "user", id: LIB, name: "L" },
            meta: {},
            data: {
                key,
                itemType: "annotation",
                parentItem,
                annotationType: "highlight",
                annotationText: texto,
                annotationComment: "",
                annotationColor: color,
                annotationPageLabel: "5",
                annotationSortIndex: "00000|000000|00000",
                annotationPosition: JSON.stringify({ pageIndex: 4 }),
                tags: [],
            },
        },
    } as never);
}

/**
 * Anotación de imagen o trazo (ink): a diferencia de highlight/underline, no
 * trae `annotationText` (Zotero no la genera para estos tipos; ver
 * db/annotation.ts, que solo copia `text` cuando el tipo es highlight o
 * underline). La plantilla debe incrustar el png sin caerse por su ausencia.
 */
async function anotacionImagen(
    key: string,
    parentItem: string,
    tipo: "image" | "ink",
    color: string,
    comentario: string,
) {
    await seedItem({
        libraryID: LIB,
        key,
        itemType: "annotation",
        parentItem,
        raw: {
            key,
            library: { type: "user", id: LIB, name: "L" },
            meta: {},
            data: {
                key,
                itemType: "annotation",
                parentItem,
                annotationType: tipo,
                annotationComment: comentario,
                annotationColor: color,
                annotationPageLabel: "5",
                annotationSortIndex: "00000|000000|00000",
                annotationPosition: JSON.stringify({ pageIndex: 4 }),
                tags: [],
            },
        },
    } as never);
}

async function adjunto(key: string, parentItem: string) {
    await seedItem({
        libraryID: LIB,
        key,
        itemType: "attachment",
        parentItem,
        raw: {
            key,
            library: { type: "user", id: LIB, name: "L" },
            meta: {},
            data: { key, itemType: "attachment", parentItem, filename: "texto.pdf", contentType: "application/pdf", tags: [] },
        },
    } as never);
}

/** Cuerpo de la nota: lo que va después del frontmatter. */
async function cuerpo(item: AnyIDBZoteroItem): Promise<string> {
    const out = await service.renderLibrarySourceNote(item, PLANTILLA, {});
    return out.split("---\n").slice(2).join("---\n");
}

/** La sección `### nombre` hasta la siguiente cabecera. */
function seccion(texto: string, nombre: string): string | null {
    const i = texto.indexOf(`### ${nombre}\n`);
    if (i < 0) return null;
    const resto = texto.slice(i + nombre.length + 5);
    const fin = resto.search(/\n#{2,3} /);
    return fin < 0 ? resto : resto.slice(0, fin);
}

describe("literatura", () => {
    let articulo: AnyIDBZoteroItem;

    beforeEach(async () => {
        articulo = await entrada("ART00001", "journalArticle", { type: "article-journal" }, {
            abstractNote: "Un resumen.",
            creators: [{ firstName: "Ana", lastName: "Pérez" }],
            date: "2024",
            publicationTitle: "Revista Chilena",
        });
        await adjunto("ADJ00001", "ART00001");
    });

    test("cada anotación va a la sección de su color", async () => {
        await anotacion("AN000001", "ADJ00001", "#ffd400", "tesis central");
        await anotacion("AN000002", "ADJ00001", "#ff6666", "esto no convence");
        await anotacion("AN000003", "ADJ00001", "#5fb236", "cifra de 2023");
        const texto = await cuerpo(articulo);
        expect(seccion(texto, "Ideas clave")).toContain("tesis central");
        expect(seccion(texto, "Críticas y contradicciones")).toContain("esto no convence");
        expect(seccion(texto, "Datos y evidencia")).toContain("cifra de 2023");
        expect(seccion(texto, "Ideas clave")).not.toContain("esto no convence");
    });

    test("cada anotación es un bloque contiguo: sin línea en blanco entre cabecera, cita y cierre", async () => {
        // No basta con toContain: una línea en blanco sin ">" corta el
        // blockquote en Obsidian (la cabecera del callout queda sola y la
        // cita cae fuera de la cita). Se afirma la estructura línea por
        // línea.
        await anotacion("AN000001", "ADJ00001", "#ffd400", "tesis central");
        const nota = await service.renderLibrarySourceNote(articulo, PLANTILLA, {});
        const lineas = nota.split("\n");
        const inicio = lineas.findIndex((l) => l.startsWith("> [!zotflow-"));
        expect(inicio).toBeGreaterThanOrEqual(0);
        // La línea siguiente a la cabecera es la cita, no una línea en blanco.
        expect(lineas[inicio + 1]).toMatch(/^> >/);
        const fin = lineas.findIndex((l, i) => i > inicio && l.startsWith("^"));
        expect(fin).toBeGreaterThan(inicio);
        // Ninguna línea entre la cabecera y `^clave` (exclusive) está vacía:
        // todo el bloque son líneas que empiezan con ">".
        for (let i = inicio; i < fin; i++) {
            expect(lineas[i]!.startsWith(">")).toBe(true);
        }
        // `^clave` va pegado, sin línea en blanco antes.
        expect(lineas[fin - 1]).not.toBe("");
    });

    test("nunca hay dos líneas en blanco seguidas en la nota, con varias anotaciones y secciones", async () => {
        await anotacion("AN000001", "ADJ00001", "#ffd400", "tesis clave 1");
        await anotacion("AN000002", "ADJ00001", "#ffd400", "tesis clave 2");
        await anotacion("AN000003", "ADJ00001", "#ff6666", "una crítica");
        const nota = await service.renderLibrarySourceNote(articulo, PLANTILLA, {});
        expect(nota).not.toContain("\n\n\n");
        // Entre dos anotaciones de la misma sección hay exactamente una línea
        // en blanco: el cierre de la primera y la cabecera de la segunda
        // quedan separados por un solo salto de línea doble.
        const texto = nota.split("---\n").slice(2).join("---\n");
        expect(texto).toContain("^AN000001\n\n> [!zotflow-highlight-#ffd400]");
    });

    test("una sección sin anotaciones no aparece", async () => {
        await anotacion("AN000001", "ADJ00001", "#ffd400", "tesis central");
        const texto = await cuerpo(articulo);
        expect(texto).not.toContain("### Definiciones");
        expect(texto).not.toContain("### Otros");
    });

    test("mayúsculas y amarillos de otros lectores son ideas clave; un color sin significado va a Otros", async () => {
        await anotacion("AN000001", "ADJ00001", "#FFD400", "en mayúsculas");
        await anotacion("AN000002", "ADJ00001", "#f9e196", "amarillo pálido");
        await anotacion("AN000003", "ADJ00001", "#e56eee", "magenta");
        const texto = await cuerpo(articulo);
        expect(seccion(texto, "Ideas clave")).toContain("en mayúsculas");
        expect(seccion(texto, "Ideas clave")).toContain("amarillo pálido");
        expect(seccion(texto, "Otros")).toContain("magenta");
    });

    test("el resumen en HTML crudo se convierte a texto legible", async () => {
        const item = await entrada("HTM00001", "journalArticle", { type: "article-journal" }, {
            abstractNote: "<p><span>Con la digitalización de los pagos.</span></p>",
        });
        const texto = await cuerpo(item);
        expect(texto).not.toContain("<p>");
        expect(texto).not.toContain("<span>");
        expect(texto).toContain("Con la digitalización de los pagos.");
    });

    test("ficha, resumen, notas de lectura con su zona y la zona de ideas propias", async () => {
        await seedItem({
            libraryID: LIB,
            key: "NOTA0001",
            itemType: "note",
            parentItem: "ART00001",
            raw: {
                key: "NOTA0001",
                library: { type: "user", id: LIB, name: "L" },
                meta: {},
                data: { key: "NOTA0001", itemType: "note", parentItem: "ART00001", note: "<p>mi lectura</p>", tags: [] },
            },
        } as never);
        const texto = await cuerpo(articulo);
        expect(texto).toContain("## Ficha\n");
        expect(texto).toContain("Revista Chilena");
        expect(texto).toContain("## Resumen");
        expect(texto).toContain("ZF_NOTE_BEG_NOTA0001");
        expect(texto).toContain("mi lectura");
        expect(texto).toContain("<!-- ZF_PERSIST_BEG_ideas -->");
        expect(texto).toContain("<!-- ZF_PERSIST_END_ideas -->");
    });

    test("una anotación de imagen incrusta su png y no se cae sin texto", async () => {
        await anotacionImagen("AN000004", "ADJ00001", "image", "#ffd400", "mirar el gráfico");
        const texto = await cuerpo(articulo);
        expect(seccion(texto, "Ideas clave")).toContain(
            "![[Academia/Biblioteca/_imagenes/AN000004.png]]",
        );
        expect(seccion(texto, "Ideas clave")).toContain("mirar el gráfico");
    });

    test("una anotación de trazo (ink) incrusta su png y no se cae sin texto", async () => {
        await anotacionImagen("AN000005", "ADJ00001", "ink", "#5fb236", "subrayado a mano");
        const texto = await cuerpo(articulo);
        expect(seccion(texto, "Datos y evidencia")).toContain(
            "![[Academia/Biblioteca/_imagenes/AN000005.png]]",
        );
        expect(seccion(texto, "Datos y evidencia")).toContain("subrayado a mano");
    });

    test("sin autores, la ficha dice 'sin dato' en vez de dejar la línea colgando", async () => {
        const sinAutores = await entrada("SOL00001", "journalArticle", { type: "article-journal" }, {
            publicationTitle: "Revista Chilena",
        });
        const texto = await cuerpo(sinAutores);
        expect(texto).toContain("- Autores: sin dato");
    });

    test("el frontmatter trae la clave y deja 'leyendo' solo al nacer", async () => {
        const nueva = await service.renderLibrarySourceNote(articulo, PLANTILLA, {});
        expect(nueva).toContain("clave: claveart00001");
        expect(nueva).toContain("estado: leyendo");
        const vieja = await service.renderLibrarySourceNote(articulo, PLANTILLA, { estado: "leida" });
        expect(vieja).toContain("estado: leida");
        expect(vieja).not.toContain("estado: leyendo");
    });
});

describe("normativa", () => {
    test("una ley lleva ficha jurídica, su clase y no lleva resumen", async () => {
        const ley = await entrada("LEY00001", "statute", {
            type: "legislation",
            genre: "Ley",
            number: "21.521",
            authority: "Ministerio de Hacienda",
            issued: { "date-parts": [[2023, 1, 4]] },
            URL: "https://www.bcn.cl/leychile/navegar?idNorma=1187323",
        }, { abstractNote: "no debe salir" });
        const nota = await service.renderLibrarySourceNote(ley, PLANTILLA, {});
        expect(nota).toContain("clase: ley");
        // Mes y día con dos dígitos y sin comillas: ZotFlow reparsea el
        // frontmatter como YAML y lo reescribe (por eso el resto de los
        // campos sale sin las comillas del filtro `json` del origen, como
        // "clave: claveart00001" en la prueba de más abajo); sin comillas y
        // con el patrón YYYY-MM-DD, YAML la tipa como fecha y Obsidian la
        // muestra así en Propiedades. Con "2023-1-4" (sin acolchar) se queda
        // como texto plano.
        expect(nota).toContain("fecha: 2023-01-04");
        const texto = nota.split("---\n").slice(2).join("---\n");
        expect(texto).toContain("## Ficha jurídica");
        expect(texto).toContain("Ministerio de Hacienda");
        expect(texto).toContain("21.521");
        expect(texto).toContain("- Fecha: 2023-01-04");
        expect(texto).not.toContain("## Resumen");
    });

    test("la vigencia sale de status y de references", async () => {
        const revocada = await entrada("NEXT0001", "standard", { type: "standard", genre: "Resolução BCB", status: "revocada" });
        expect(await cuerpo(revocada)).toContain("Vigencia: revocada");
        const modificada = await entrada("NEXT0002", "standard", { type: "standard", genre: "Circular", references: "modificada por la Circular 2.100" });
        expect(await cuerpo(modificada)).toContain("Vigencia: modificada");
    });

    test("el status se normaliza sin importar mayúsculas", async () => {
        const item = await entrada("NEXT0003", "standard", { type: "standard", genre: "Resolução BCB", status: "Revocada" });
        expect(await cuerpo(item)).toContain("Vigencia: revocada");
    });

    test("sin denominación ni número, la ficha jurídica dice 'sin dato'", async () => {
        const item = await entrada("DON00003", "statute", { type: "regulation" });
        expect(await cuerpo(item)).toContain("- Denominación y número: sin dato");
    });

    test("un capítulo RAN sin number usa chapter-number como número", async () => {
        // CONTRATO.md: el número de capítulo va en la línea de Extra
        // "Chapter Number: 2-2", que llega a la variable CSL chapter-number,
        // no a number.
        const item = await entrada("RAN00002", "standard", {
            type: "standard",
            genre: "capítulo RAN",
            authority: "Comisión para el Mercado Financiero",
            "chapter-number": "8-41",
        });
        const nota = await service.renderLibrarySourceNote(item, PLANTILLA, {});
        expect(nota).toContain("numero: 8-41");
        const texto = nota.split("---\n").slice(2).join("---\n");
        expect(texto).toContain("- Denominación y número: capítulo RAN 8-41");
    });

    test("clases del contrato por tipo y denominación", async () => {
        // Las 28 filas de SUBTIPOS (msmp.lua), una por fila, con el género
        // exacto que trae la tabla, más las variantes reales que documenta
        // CONTRATO.md para las mismas filas (reglamento delegado o de
        // ejecución de la UE, "Decreto Supremo" completo en vez de "DS",
        // directiva sin "(UE)" de antes de Lisboa, "decreto exento" junto a
        // "resolución exenta").
        const casos: [string, string, Record<string, unknown>, string][] = [
            // Rango legal
            ["LEY00003", "statute", { type: "legislation", genre: "Ley" }, "ley"],
            ["DFL00001", "statute", { type: "legislation", genre: "DFL" }, "dfl"],
            ["DL000001", "statute", { type: "legislation", genre: "DL" }, "dl"],
            ["COD00001", "statute", { type: "legislation", genre: "Código" }, "codigo"],
            ["CPR00001", "statute", { type: "legislation", genre: "Constitución Política de la República" }, "constitucion"],
            // Potestad reglamentaria del Presidente
            ["DS000002", "statute", { type: "regulation", genre: "DS" }, "ds"],
            ["DS000003", "statute", { type: "regulation", genre: "Decreto Supremo" }, "ds"], // Perú, CONTRATO.md
            ["REG00001", "statute", { type: "regulation", genre: "Reglamento" }, "reglamento"],
            // Normativa de los reguladores financieros
            ["NCG00001", "standard", { type: "standard", genre: "norma de carácter general" }, "ncg"],
            ["CIR00001", "standard", { type: "standard", genre: "Circular" }, "circular"],
            ["OFI00001", "standard", { type: "standard", genre: "Oficio" }, "oficio"],
            ["RAN00001", "standard", { type: "standard", genre: "capítulo RAN" }, "ran"],
            ["CNF00001", "standard", { type: "standard", genre: "capítulo CNF" }, "cnf"],
            ["MSI00001", "standard", { type: "standard", genre: "capítulo MSI" }, "msi"],
            // Publicaciones del Diario Oficial que no alcanzan rango de norma
            ["DON00001", "statute", { type: "regulation", genre: "resolución exenta" }, "do-norma"],
            ["DON00002", "statute", { type: "regulation", genre: "decreto exento" }, "do-norma"],
            ["DOJ00001", "document", { type: "document", genre: "publicación judicial" }, "do-judicial"],
            ["DOA00001", "document", { type: "document", genre: "aviso" }, "do-aviso"],
            // Tramitación legislativa
            ["PDL00001", "bill", { type: "bill", genre: "proyecto de ley" }, "pdl"],
            ["MOC00001", "bill", { type: "bill", genre: "moción" }, "mocion"],
            ["MEN00001", "bill", { type: "bill", genre: "mensaje" }, "mensaje"],
            // Derecho de la Unión Europea y tratados
            ["UER00001", "statute", { type: "treaty", genre: "Reglamento (UE)" }, "ue-reglamento"],
            ["UER00002", "statute", { type: "treaty", genre: "Reglamento Delegado (UE)" }, "ue-reglamento"], // CONTRATO.md
            ["UER00003", "statute", { type: "treaty", genre: "Reglamento de Ejecución (UE)" }, "ue-reglamento"], // CONTRATO.md
            ["UED00001", "statute", { type: "treaty", genre: "Directiva (UE)" }, "ue-directiva"],
            ["UED00002", "statute", { type: "treaty", genre: "Directiva" }, "ue-directiva"], // prelisboa, CONTRATO.md
            ["TRA00001", "statute", { type: "treaty", genre: "Tratado" }, "tratado"],
            // Jurisdicción y órganos administrativos
            ["SEN00001", "case", { type: "legal_case", genre: "sentencia" }, "sentencia"],
            ["RES00001", "case", { type: "legal_case", genre: "resolución" }, "resolucion"],
            ["AMP00001", "case", { type: "legal_case", genre: "decisión de amparo" }, "amparo"],
            ["DIC00001", "report", { type: "report", authority: "Contraloría General de la República" }, "dictamen"],
            // Normativa de un regulador extranjero
            ["EXT00001", "standard", { type: "standard", genre: "Resolução BCB" }, "norma-ext"],
            // Propuesta legislativa de la Comisión Europea
            ["UEP00001", "bill", { type: "bill", genre: "propuesta de Reglamento (UE)" }, "ue-propuesta"],
        ];
        for (const [key, itemType, csl, clase] of casos) {
            const item = await entrada(key, itemType, csl);
            expect(await service.renderLibrarySourceNote(item, PLANTILLA, {}), key).toContain(`clase: ${clase}`);
        }
    });

    test("una norma sin denominación sale con 'sin clase del contrato'", async () => {
        const item = await entrada("LEY00002", "statute", { type: "legislation" });
        const nota = await service.renderLibrarySourceNote(item, PLANTILLA, {});
        expect(nota).toContain("clase: sin clase del contrato");
        expect(nota).toContain("## Ficha jurídica");
    });

    test("un informe sin órgano emisor es literatura", async () => {
        const item = await entrada("INF00001", "report", { type: "report", publisher: "BIS" });
        const texto = await cuerpo(item);
        expect(texto).toContain("## Ficha\n");
        expect(texto).not.toContain("## Ficha jurídica");
    });
});

describe("ruta", () => {
    test("biblioteca propia, grupo y entrada sin clave", async () => {
        const propia = await entrada("ART00001", "journalArticle", { type: "article-journal" }, {}, LIB, "perez2024");
        expect(await paths.resolveLibraryNotePath(propia, RUTA)).toBe("Academia/Biblioteca/@perez2024.md");
        const grupo = await entrada("GRP00001", "journalArticle", { type: "article-journal" }, {}, GROUP, "solove2008");
        expect(await paths.resolveLibraryNotePath(grupo, RUTA)).toBe("Academia/Biblioteca/dataprivacy/@solove2008.md");
        const sinClave = await entrada("NOKEY001", "journalArticle", { type: "article-journal" }, {}, LIB, "");
        expect(await paths.resolveLibraryNotePath(sinClave, RUTA)).toBe("Academia/Biblioteca/@NOKEY001.md");
        // Una barra en la clave (hay una real: iso/iecInformationTechnologyCloud2017)
        // no llega nunca a la plantilla: NotePathService.sanitizeSegment
        // (note-path.ts:17-29) borra "/" del contexto de la ruta ANTES de
        // renderizar (se aplica a todo el contexto salvo IGNORE_KEYS, y
        // "citationKey" no está ahí). ruta.txt no lleva ningún `replace` para
        // esto: sería letra muerta, porque el caracter ya no existe cuando la
        // plantilla corre. Decisión de Víctor: el servidor de la Pieza 2 imita
        // esta misma limpieza (nombreDeArchivo en el servidor, commit 3e8879b)
        // en vez de tocar ZotFlow, así que las dos partes concuerdan en el
        // nombre sin guion.
        const conBarra = await entrada("BARRA001", "standard", { type: "standard" }, {}, LIB, "iso/iecCloud2017");
        expect(await paths.resolveLibraryNotePath(conBarra, RUTA)).toBe("Academia/Biblioteca/@isoiecCloud2017.md");
    });
});
