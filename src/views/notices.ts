import { Notice } from "obsidian";

export class SmartNotice {
    static success(message: string, timeout = 3000) {
        new Notice(`✓ ${message}`, timeout);
    }

    static error(message: string, timeout = 5000) {
        new Notice(`⚠ ${message}`, timeout);
    }

    static info(message: string, timeout = 4000) {
        new Notice(`ℹ ${message}`, timeout);
    }
}
