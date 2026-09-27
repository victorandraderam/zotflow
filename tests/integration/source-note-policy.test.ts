/**
 * Source-note creation policy: which items may get a brand-new source note.
 * Runs against the real Dexie schema so the compound index the check relies
 * on is exercised too.
 */
import { describe, test, expect, beforeEach } from "vitest";
import { resetDb, seedItem, seedLibrary } from "../fakes/db";
import {
    filterByCreationPolicy,
    hasAnnotationsOrNotes,
} from "worker/services/source-note-policy";

const LIB = 1;
const OTHER = 2;

beforeEach(async () => {
    await resetDb();
    await seedLibrary({ id: LIB, type: "user", name: "My Library" });
    await seedLibrary({ id: OTHER, type: "group", name: "Group" });
});

const child = (
    itemType: "attachment" | "annotation" | "note",
    key: string,
    parentItem: string,
    extra: Record<string, unknown> = {},
    libraryID = LIB,
) => seedItem({ libraryID, key, itemType, parentItem, ...extra });

const id = (itemKey: string) => ({ libraryID: LIB, itemKey });
const noNote = () => Promise.resolve(false);

describe("hasAnnotationsOrNotes", () => {
    test("an annotation on an attachment counts", async () => {
        await seedItem({ libraryID: LIB, key: "ARTICLE1" });
        await child("attachment", "ATTACH01", "ARTICLE1");
        await child("annotation", "ANNOTAT1", "ATTACH01");
        expect(await hasAnnotationsOrNotes(LIB, "ARTICLE1")).toBe(true);
    });

    test("a child note counts", async () => {
        await seedItem({ libraryID: LIB, key: "ARTICLE1" });
        await child("note", "NOTE0001", "ARTICLE1");
        expect(await hasAnnotationsOrNotes(LIB, "ARTICLE1")).toBe(true);
    });

    test("an attachment without annotations does not", async () => {
        await seedItem({ libraryID: LIB, key: "ARTICLE1" });
        await child("attachment", "ATTACH01", "ARTICLE1");
        expect(await hasAnnotationsOrNotes(LIB, "ARTICLE1")).toBe(false);
    });

    test("trashed children do not count", async () => {
        await seedItem({ libraryID: LIB, key: "ARTICLE1" });
        await child("note", "NOTE0001", "ARTICLE1", { trashed: 1 });
        await child("attachment", "ATTACH01", "ARTICLE1");
        await child("annotation", "ANNOTAT1", "ATTACH01", { trashed: 1 });
        await child("attachment", "TRASHATT", "ARTICLE1", { trashed: 1 });
        await child("annotation", "ANNOTAT2", "TRASHATT");
        expect(await hasAnnotationsOrNotes(LIB, "ARTICLE1")).toBe(false);
    });

    test("children deleted locally, pending sync, do not count", async () => {
        await seedItem({ libraryID: LIB, key: "ARTICLE1" });
        await child("note", "NOTE0001", "ARTICLE1", { syncStatus: "deleted" });
        await child("attachment", "ATTACH01", "ARTICLE1");
        await child("annotation", "ANNOTAT1", "ATTACH01", {
            syncStatus: "deleted",
        });
        expect(await hasAnnotationsOrNotes(LIB, "ARTICLE1")).toBe(false);
    });

    test("another library's children with the same keys do not count", async () => {
        await seedItem({ libraryID: LIB, key: "ARTICLE1" });
        await child("note", "NOTE0001", "ARTICLE1", {}, OTHER);
        expect(await hasAnnotationsOrNotes(LIB, "ARTICLE1")).toBe(false);
    });
});

describe("filterByCreationPolicy", () => {
    beforeEach(async () => {
        await seedItem({ libraryID: LIB, key: "ANNOTATD" });
        await child("attachment", "ATTACH01", "ANNOTATD");
        await child("annotation", "ANNOTAT1", "ATTACH01");
        await seedItem({ libraryID: LIB, key: "NOTED001" });
        await child("note", "NOTE0001", "NOTED001");
        await seedItem({ libraryID: LIB, key: "BARE0001" });
    });

    const all = [id("ANNOTATD"), id("NOTED001"), id("BARE0001")];

    test("'all' keeps every item", async () => {
        expect(await filterByCreationPolicy(all, "all", noNote)).toEqual(all);
    });

    test("'annotated' keeps annotated or noted items and drops bare ones", async () => {
        expect(await filterByCreationPolicy(all, "annotated", noNote)).toEqual([
            id("ANNOTATD"),
            id("NOTED001"),
        ]);
    });

    test("'manual' creates nothing new", async () => {
        expect(await filterByCreationPolicy(all, "manual", noNote)).toEqual([]);
    });

    test("an item that already has a note is kept under every policy", async () => {
        // The policy decides which notes are born, never which are refreshed:
        // a note whose annotations were deleted must still update.
        const hasNote = (item: { itemKey: string }) =>
            Promise.resolve(item.itemKey === "BARE0001");
        for (const policy of ["annotated", "manual"] as const) {
            expect(
                await filterByCreationPolicy([id("BARE0001")], policy, hasNote),
            ).toEqual([id("BARE0001")]);
        }
    });
});
