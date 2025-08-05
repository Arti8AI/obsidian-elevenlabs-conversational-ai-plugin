import { Notice } from "obsidian";

/**
 * Enhanced notification system for the ElevenLabs plugin.
 * 
 * Provides categorized notifications with consistent styling and
 * automatic console logging for errors and warnings. Uses emoji
 * icons for visual distinction and integrates with Obsidian's
 * notification system.
 * 
 * @example
 * ```typescript
 * SmartNotice.success("Note created successfully!");
 * SmartNotice.error("Failed to connect to ElevenLabs");
 * SmartNotice.warning("Agent ID not configured");
 * SmartNotice.info("Starting conversation...");
 * ```
 */
export class SmartNotice {
    /** Default duration for notifications in milliseconds */
    private static defaultDuration = 5000;
    
    /**
     * Shows a success notification with a green checkmark icon.
     * Used for confirming successful operations.
     * 
     * @param message - The success message to display
     * @param duration - Optional duration in milliseconds (default: 5000)
     * 
     * @example
     * ```typescript
     * SmartNotice.success("Connection established");
     * SmartNotice.success("Note saved", 3000);
     * ```
     */
    static success(message: string, duration?: number): void {
        new Notice(`✅ ${message}`, duration || this.defaultDuration);
    }
    
    /**
     * Shows an error notification with a red X icon.
     * Automatically logs the error to the console for debugging.
     * 
     * @param message - The error message to display
     * @param duration - Optional duration in milliseconds (default: 5000)
     * 
     * @example
     * ```typescript
     * SmartNotice.error("Invalid Agent ID");
     * SmartNotice.error("Network timeout", 7000);
     * ```
     */
    static error(message: string, duration?: number): void {
        new Notice(`❌ ${message}`, duration || this.defaultDuration);
        console.error(`[ElevenLabs Plugin] ${message}`);
    }
    
    /**
     * Shows an informational notification with an info icon.
     * Used for general status updates and user guidance.
     * 
     * @param message - The informational message to display
     * @param duration - Optional duration in milliseconds (default: 5000)
     * 
     * @example
     * ```typescript
     * SmartNotice.info("Connecting to ElevenLabs...");
     * SmartNotice.info("Agent is listening", 2000);
     * ```
     */
    static info(message: string, duration?: number): void {
        new Notice(`ℹ️ ${message}`, duration || this.defaultDuration);
    }
    
    /**
     * Shows a warning notification with a warning triangle icon.
     * Automatically logs the warning to the console for debugging.
     * 
     * @param message - The warning message to display
     * @param duration - Optional duration in milliseconds (default: 5000)
     * 
     * @example
     * ```typescript
     * SmartNotice.warning("Note already exists");
     * SmartNotice.warning("Microphone access required", 6000);
     * ```
     */
    static warning(message: string, duration?: number): void {
        new Notice(`⚠️ ${message}`, duration || this.defaultDuration);
        console.warn(`[ElevenLabs Plugin] ${message}`);
    }
}
