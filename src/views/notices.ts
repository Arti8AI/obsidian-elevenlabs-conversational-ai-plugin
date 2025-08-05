import { Notice } from "obsidian";

export class SmartNotice {
    private static defaultDuration = 5000;
    
    static success(message: string, duration?: number): void {
        new Notice(`✅ ${message}`, duration || this.defaultDuration);
    }
    
    static error(message: string, duration?: number): void {
        new Notice(`❌ ${message}`, duration || this.defaultDuration);
        console.error(`[ElevenLabs Plugin] ${message}`);
    }
    
    static info(message: string, duration?: number): void {
        new Notice(`ℹ️ ${message}`, duration || this.defaultDuration);
    }
    
    static warning(message: string, duration?: number): void {
        new Notice(`⚠️ ${message}`, duration || this.defaultDuration);
        console.warn(`[ElevenLabs Plugin] ${message}`);
    }
}
