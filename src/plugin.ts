import { Plugin } from "obsidian";
import { ElevenLabsSettings, defaultSettings } from "./components/main_settings";
import { EnvironmentSettings, defaultEnvironmentSettings } from "./components/env_settings";
import { SettingsTab } from "./views/sc_settings_tab";
import { ConversationOverlay } from "./views/on_open_overlay";
import { SmartNotice } from "./views/notices";

/**
 * Main plugin class for ElevenLabs Conversational AI integration with Obsidian.
 * 
 * This plugin enables voice-based interaction with your Obsidian vault through
 * ElevenLabs' conversational AI agents. Users can create, read, and manage notes
 * using natural voice commands.
 * 
 * @example
 * ```typescript
 * // Plugin is automatically instantiated by Obsidian
 * // Users interact through ribbon icon or command palette
 * ```
 */
export default class ElevenLabsConversationalAIPlugin extends Plugin {
    /** User configuration settings for the plugin */
    settings: ElevenLabsSettings;
    /** Environment and debug settings */
    environmentSettings: EnvironmentSettings;

    /**
     * Called when the plugin is loaded by Obsidian.
     * Initializes settings, UI elements, and commands.
     */
    async onload() {
        await this.loadSettings();
        this.setupRibbonIcon();
        this.addCommands();
        this.addSettingTab(new SettingsTab(this.app, this));
    }

    /**
     * Sets up the microphone ribbon icon in the left panel.
     * The icon serves as the primary entry point for starting conversations.
     * 
     * @private
     */
    private setupRibbonIcon() {
        const ribbonIconEl = this.addRibbonIcon(
            "microphone",
            "ElevenLabs Conversational AI",
            (evt: MouseEvent) => {
                this.openConversationOverlay();
            }
        );
        ribbonIconEl.addClass("elevenlabs-ribbon-icon");
    }

    /**
     * Registers plugin commands that can be accessed via the command palette.
     * 
     * @private
     */
    private addCommands() {
        this.addCommand({
            id: "open-voice-ai-agent",
            name: "Open ElevenLabs Conversational AI",
            callback: () => {
                this.openConversationOverlay();
            },
        });
    }

    /**
     * Opens the conversation overlay after validating the Agent ID.
     * This is the main entry point for starting AI conversations.
     * 
     * @private
     * @throws Will show error notice if Agent ID validation fails
     */
    private openConversationOverlay(): void {
        const validationResult = this.validateAgentId();
        if (!validationResult.isValid) {
            SmartNotice.error(validationResult.errorMessage);
            return;
        }

        try {
            new ConversationOverlay(this.app, this.settings.agentId, this.environmentSettings).open();
        } catch (error) {
            SmartNotice.error("Failed to open conversation interface");
            console.error("Error opening conversation overlay:", error);
        }
    }

    /**
     * Validates the ElevenLabs Agent ID format and content.
     * 
     * Performs comprehensive validation including:
     * - Presence check
     * - Format validation (length, characters)
     * - Security checks (placeholder detection)
     * - System compatibility (reserved names)
     * 
     * @private
     * @returns {Object} Validation result with isValid flag and error message
     * @returns {boolean} returns.isValid - Whether the Agent ID is valid
     * @returns {string} returns.errorMessage - Descriptive error message if invalid
     */
    private validateAgentId(): { isValid: boolean; errorMessage: string } {
        // Check if Agent ID is provided
        if (!this.settings.agentId) {
            return {
                isValid: false,
                errorMessage: "Please configure your Agent ID in settings first"
            };
        }

        // Check if Agent ID is just whitespace
        if (!this.settings.agentId.trim()) {
            return {
                isValid: false,
                errorMessage: "Agent ID cannot be empty. Please check your settings."
            };
        }

        // Basic format validation - ElevenLabs Agent IDs are typically UUIDs or similar
        const agentId = this.settings.agentId.trim();
        
        // Check minimum length (most agent IDs should be at least 8 characters)
        if (agentId.length < 8) {
            return {
                isValid: false,
                errorMessage: "Agent ID appears to be too short. Please verify your ElevenLabs Agent ID."
            };
        }

        // Check for suspicious characters that might indicate incomplete copy-paste
        if (agentId.includes('...') || agentId.includes('xxx') || agentId.includes('your-agent-id')) {
            return {
                isValid: false,
                errorMessage: "Please replace the placeholder with your actual ElevenLabs Agent ID."
            };
        }

        // Check if it contains only valid characters (alphanumeric, hyphens, underscores)
        const validCharRegex = /^[a-zA-Z0-9_-]+$/;
        if (!validCharRegex.test(agentId)) {
            return {
                isValid: false,
                errorMessage: "Agent ID contains invalid characters. Please check your Agent ID."
            };
        }

        // Additional validation for common UUID format (if applicable)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuidFormat = uuidRegex.test(agentId);
        
        // If it's not UUID format and seems too long, warn user
        if (!isUuidFormat && agentId.length > 100) {
            return {
                isValid: false,
                errorMessage: "Agent ID appears to be unusually long. Please verify your ElevenLabs Agent ID."
            };
        }

        return {
            isValid: true,
            errorMessage: ""
        };
    }

    /**
     * Loads plugin settings from Obsidian's data storage.
     * 
     * Merges saved settings with default values to ensure all required
     * properties are available. Logs debug information if debug mode is enabled.
     * 
     * @async
     */
    async loadSettings() {
        const savedSettings = await this.loadData();
        this.settings = Object.assign({}, defaultSettings, savedSettings?.settings);
        this.environmentSettings = Object.assign({}, defaultEnvironmentSettings, savedSettings?.environmentSettings);
        
        // Log debug info if debug mode is enabled
        if (this.environmentSettings.isDebugMode) {
            console.log("[ElevenLabs Plugin] Settings loaded:", {
                hasAgentId: !!this.settings.agentId,
                language: this.settings.language,
                debugMode: this.environmentSettings.isDebugMode
            });
        }
    }

    /**
     * Saves current plugin settings to Obsidian's data storage.
     * 
     * Persists both user settings and environment settings.
     * Logs debug information if debug mode is enabled.
     * 
     * @async
     */
    async saveSettings() {
        await this.saveData({
            settings: this.settings,
            environmentSettings: this.environmentSettings
        });
        
        // Log debug info if debug mode is enabled
        if (this.environmentSettings.isDebugMode) {
            console.log("[ElevenLabs Plugin] Settings saved");
        }
    }
}
