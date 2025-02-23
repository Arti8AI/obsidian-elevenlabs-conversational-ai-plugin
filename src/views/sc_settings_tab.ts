import { App, PluginSettingTab, Setting } from "obsidian";
import ElevenLabsConversationalAIPlugin from "src/plugin";


export class SettingsTab extends PluginSettingTab {
    private plugin: ElevenLabsConversationalAIPlugin;

    constructor(app: App, plugin: ElevenLabsConversationalAIPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        this.addAgentIdSetting(containerEl);
        this.addLanguageSetting(containerEl);
        this.addDebugModeSetting(containerEl);
    }

    private addAgentIdSetting(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName("ElevenLabs Agent Id")
            .setDesc("Your unique ElevenLabs agent identifier")
            .addText((text) =>
                text
                    .setPlaceholder("Enter your Agent Id")
                    .setValue(this.plugin.settings.agentId)
                    .onChange(async (value) => {
                        this.plugin.settings.agentId = value;
                        await this.plugin.saveSettings();
                    })
            );
    }

    private addLanguageSetting(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName("Language")
            .setDesc("Preferred language for interactions")
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("en", "English")
                    .addOption("es", "Spanish")
                    .setValue(this.plugin.settings.language || "en")
                    .onChange(async (value) => {
                        this.plugin.settings.language = value;
                        await this.plugin.saveSettings();
                    })
            );
    }

    private addDebugModeSetting(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName("Debug Mode")
            .setDesc("Enable detailed logging for troubleshooting")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.environmentSettings.isDebugMode)
                    .onChange(async (value) => {
                        this.plugin.environmentSettings.isDebugMode = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}
