import { db } from "db/db";

import type { SourceNoteCreation } from "settings/types";
import type { ItemIdentifier } from "worker/tasks/impl/batch-extract-images-task";

/**
 * Whether a top-level item carries anything worth a source note under the
 * "annotated" policy: at least one live annotation on one of its live
 * attachments, or at least one live child note. "Live" means neither in the
 * Zotero trash nor deleted locally while waiting for the next sync.
 */
export async function hasAnnotationsOrNotes(
    libraryID: number,
    itemKey: string,
): Promise<boolean> {
    const children = await db.items
        .where(["libraryID", "parentItem", "itemType", "trashed"])
        .anyOf([
            [libraryID, itemKey, "note", 0],
            [libraryID, itemKey, "attachment", 0],
        ])
        .filter((child) => child.syncStatus !== "deleted")
        .toArray();

    if (children.some((child) => child.itemType === "note")) return true;

    for (const attachment of children) {
        const annotations = await db.items
            .where(["libraryID", "parentItem", "itemType", "trashed"])
            .equals([libraryID, attachment.key, "annotation", 0])
            .filter((annotation) => annotation.syncStatus !== "deleted")
            .count();
        if (annotations > 0) return true;
    }
    return false;
}

/**
 * Narrow top-level items to those whose source note may be written under
 * `policy`. An item that already has a source note always passes: the policy
 * decides which notes are born, never which ones are kept up to date.
 */
export async function filterByCreationPolicy(
    items: ItemIdentifier[],
    policy: SourceNoteCreation,
    hasNote: (item: ItemIdentifier) => Promise<boolean>,
): Promise<ItemIdentifier[]> {
    if (policy === "all") return items;

    const allowed: ItemIdentifier[] = [];
    for (const item of items) {
        if (await hasNote(item)) {
            allowed.push(item);
            continue;
        }
        if (
            policy === "annotated" &&
            (await hasAnnotationsOrNotes(item.libraryID, item.itemKey))
        ) {
            allowed.push(item);
        }
    }
    return allowed;
}
