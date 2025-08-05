import { Plugin } from "obsidian";
import { ElevenLabsSettings, defaultSettings } from "./components/main_settings";
import { EnvironmentSettings, defaultEnvironmentSettings } from "./components/env_settings";
import { SettingsTab } from "./views/sc_settings_tab";
import { ConversationOverlay } from "./views/on_open_overlay";
import { SmartNotice } from "./views/notices";

export default class ElevenLabsConversationalAIPlugin extends Plugin {
    settings: ElevenLabsSettings;
    environmentSettings: EnvironmentSettings;

    async onload() {
        await this.loadSettings();
        this.setupRibbonIcon();
        this.addCommands();
        this.addSettingTab(new SettingsTab(this.app, this));
    }

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

    private addCommands() {
        this.addCommand({
            id: "open-voice-ai-agent",
            name: "Open ElevenLabs Conversational AI",
            callback: () => {
                this.openConversationOverlay();
            },
        });
    }

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
