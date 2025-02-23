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
                if (!this.settings.agentId) {
                    SmartNotice.error("Please configure your Agent ID in settings");
                    return;
                }
                new ConversationOverlay(this.app, this.settings.agentId).open();
            }
        );
        ribbonIconEl.addClass("elevenlabs-ribbon-icon");
    }

    private addCommands() {
        this.addCommand({
            id: "open-voice-ai-agent",
            name: "Open ElevenLabs Conversational AI",
            callback: () => {
                if (!this.settings.agentId) {
                    SmartNotice.error("Please configure your Agent ID in settings");
                    return;
                }
                new ConversationOverlay(this.app, this.settings.agentId).open();
            },
        });
    }

    async loadSettings() {
        const savedSettings = await this.loadData();
        this.settings = Object.assign({}, defaultSettings, savedSettings?.settings);
        this.environmentSettings = Object.assign({}, defaultEnvironmentSettings, savedSettings?.environmentSettings);
    }

    async saveSettings() {
        await this.saveData({
            settings: this.settings,
            environmentSettings: this.environmentSettings
        });
    }
}
