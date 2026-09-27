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
        const texto = nota.split("---\n").slice(2).join("---\n");
        expect(texto).toContain("## Ficha jurídica");
        expect(texto).toContain("Ministerio de Hacienda");
        expect(texto).toContain("21.521");
        expect(texto).not.toContain("## Resumen");
    });

    test("la vigencia sale de status y de references", async () => {
        const revocada = await entrada("NEXT0001", "standard", { type: "standard", genre: "Resolução BCB", status: "revocada" });
        expect(await cuerpo(revocada)).toContain("Vigencia: revocada");
        const modificada = await entrada("NEXT0002", "standard", { type: "standard", genre: "Circular", references: "modificada por la Circular 2.100" });
        expect(await cuerpo(modificada)).toContain("Vigencia: modificada");
    });

    test("clases del contrato por tipo y denominación", async () => {
        const casos: [string, string, Record<string, unknown>, string][] = [
            ["NCG00001", "standard", { type: "standard", genre: "norma de carácter general" }, "ncg"],
            ["EXT00001", "standard", { type: "standard", genre: "Resolução BCB" }, "norma-ext"],
            ["DS000001", "statute", { type: "regulation", genre: "DS" }, "ds"],
            ["PDL00001", "bill", { type: "bill", genre: "proyecto de ley" }, "pdl"],
            ["UEP00001", "bill", { type: "bill", genre: "propuesta de Reglamento (UE)" }, "ue-propuesta"],
            ["SEN00001", "case", { type: "legal_case", genre: "sentencia" }, "sentencia"],
            ["DIC00001", "report", { type: "report", authority: "Contraloría General de la República" }, "dictamen"],
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
        // debería ir con guion, que es donde la busca el servidor de la Pieza 2.
        // Hoy no llega: NotePathService.sanitizeSegment (note-path.ts:17-29) borra
        // "/" del contexto de la ruta ANTES de que la plantilla lo vea (se aplica a
        // todo el contexto salvo IGNORE_KEYS, y "citationKey" no está ahí), así que
        // el `replace: "/", "-"` de ruta.txt nunca actúa sobre esa barra: ya no
        // existe cuando la plantilla corre. El resultado real de hoy es sin guion.
        // Corregirlo de raíz (que sanitizeSegment convierta "/" y "\" en "-" en vez
        // de borrarlos) es un cambio genérico de note-path.ts, defendible ante el
        // autor, y por eso es material de notas-a-demanda, no de esta rama: no se
        // hizo aquí. Ver informe de la Tarea 3, "Desviaciones", para la decisión
        // pendiente. ruta.txt conserva el `replace` tal cual: es inocuo hoy y es
        // lo correcto el día que ese comportamiento cambie.
        const conBarra = await entrada("BARRA001", "standard", { type: "standard" }, {}, LIB, "iso/iecCloud2017");
        expect(await paths.resolveLibraryNotePath(conBarra, RUTA)).toBe("Academia/Biblioteca/@isoiecCloud2017.md");
    });
});
