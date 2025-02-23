import { App } from "obsidian";

export async function lookupNote(app: App, title: string): Promise<string | null> {
    const fileName = title.replace(/[/\\?%*:|"<>]/g, "-").trim() + ".md";
    const files = app.vault.getFiles();
    const file = files.find((f) => f.name === fileName);
    return file ? file.path : null;
}
