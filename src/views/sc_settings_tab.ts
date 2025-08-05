import { App, PluginSettingTab, Setting, TextAreaComponent, ButtonComponent } from "obsidian";
import ElevenLabsConversationalAIPlugin from "src/plugin";
import { CustomPrompt } from "src/components/main_settings";

export class SettingsTab extends PluginSettingTab {
    private plugin: ElevenLabsConversationalAIPlugin;

    constructor(app: App, plugin: ElevenLabsConversationalAIPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Create main sections
        this.addBasicSettings(containerEl);
        this.addConversationSettings(containerEl);
        this.addUISettings(containerEl);
        this.addAdvancedSettings(containerEl);
        this.addCustomPromptsSettings(containerEl);
        this.addDebugSettings(containerEl);
    }

    private addBasicSettings(containerEl: HTMLElement) {
        const basicSection = containerEl.createDiv('settings-section');
        basicSection.createEl('h2', { text: 'Basic Settings' });

        new Setting(basicSection)
            .setName("ElevenLabs Agent ID")
            .setDesc("Your unique ElevenLabs agent identifier")
            .addText((text) =>
                text
                    .setPlaceholder("Enter your Agent ID")
                    .setValue(this.plugin.settings.agentId)
                    .onChange(async (value) => {
                        this.plugin.settings.agentId = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(basicSection)
            .setName("Language")
            .setDesc("Preferred language for interactions")
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("en", "English")
                    .addOption("es", "Spanish")
                    .addOption("fr", "French")
                    .addOption("de", "German")
                    .addOption("it", "Italian")
                    .addOption("pt", "Portuguese")
                    .addOption("pl", "Polish")
                    .addOption("nl", "Dutch")
                    .setValue(this.plugin.settings.language || "en")
                    .onChange(async (value) => {
                        this.plugin.settings.language = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(basicSection)
            .setName("Voice ID")
            .setDesc("Specific ElevenLabs voice to use (optional)")
            .addText((text) =>
                text
                    .setPlaceholder("Enter voice ID (optional)")
                    .setValue(this.plugin.settings.voiceId || "")
                    .onChange(async (value) => {
                        this.plugin.settings.voiceId = value || undefined;
                        await this.plugin.saveSettings();
                    })
            );
    }

    private addConversationSettings(containerEl: HTMLElement) {
        const conversationSection = containerEl.createDiv('settings-section');
        conversationSection.createEl('h2', { text: 'Conversation Settings' });

        new Setting(conversationSection)
            .setName("Conversation Mode")
            .setDesc("Choose the AI's conversation style and focus")
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("standard", "Standard - Balanced conversation")
                    .addOption("note-focused", "Note-Focused - Prioritizes note operations")
                    .addOption("creative", "Creative - More creative and exploratory")
                    .addOption("analysis", "Analysis - Focused on analysis and insights")
                    .setValue(this.plugin.settings.conversationMode)
                    .onChange(async (value: any) => {
                        this.plugin.settings.conversationMode = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(conversationSection)
            .setName("Voice Activation Threshold")
            .setDesc("Sensitivity for voice detection (0.1 = very sensitive, 1.0 = less sensitive)")
            .addSlider((slider) =>
                slider
                    .setLimits(0.1, 1.0, 0.1)
                    .setValue(this.plugin.settings.voiceActivationThreshold)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.voiceActivationThreshold = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(conversationSection)
            .setName("Pause After Response")
            .setDesc("Add a brief pause after AI responses for better conversation flow")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.pauseAfterResponse)
                    .onChange(async (value) => {
                        this.plugin.settings.pauseAfterResponse = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(conversationSection)
            .setName("Default Note Template")
            .setDesc("Name of the note to use as a template for new notes (optional)")
            .addText((text) =>
                text
                    .setPlaceholder("Template note name")
                    .setValue(this.plugin.settings.defaultNoteTemplate || "")
                    .onChange(async (value) => {
                        this.plugin.settings.defaultNoteTemplate = value || undefined;
                        await this.plugin.saveSettings();
                    })
            );
    }

    private addUISettings(containerEl: HTMLElement) {
        const uiSection = containerEl.createDiv('settings-section');
        uiSection.createEl('h2', { text: 'User Interface' });

        new Setting(uiSection)
            .setName("UI Density")
            .setDesc("Choose the interface density and spacing")
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("compact", "Compact - More content, less spacing")
                    .addOption("normal", "Normal - Balanced spacing")
                    .addOption("spacious", "Spacious - More spacing, easier reading")
                    .setValue(this.plugin.settings.uiDensity)
                    .onChange(async (value: any) => {
                        this.plugin.settings.uiDensity = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(uiSection)
            .setName("Enable Quick Actions")
            .setDesc("Show quick action buttons in the conversation interface")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableQuickActions)
                    .onChange(async (value) => {
                        this.plugin.settings.enableQuickActions = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(uiSection)
            .setName("Real-time Transcript")
            .setDesc("Show conversation transcript in real-time")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showTranscriptInRealTime)
                    .onChange(async (value) => {
                        this.plugin.settings.showTranscriptInRealTime = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(uiSection)
            .setName("Enable Keyboard Shortcuts")
            .setDesc("Enable keyboard shortcuts for conversation control")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableKeyboardShortcuts)
                    .onChange(async (value) => {
                        this.plugin.settings.enableKeyboardShortcuts = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(uiSection)
            .setName("Enable Notifications")
            .setDesc("Show notifications for conversation events and errors")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableNotifications)
                    .onChange(async (value) => {
                        this.plugin.settings.enableNotifications = value;
                        await this.plugin.saveSettings();
                    })
            );
    }

    private addAdvancedSettings(containerEl: HTMLElement) {
        const advancedSection = containerEl.createDiv('settings-section');
        advancedSection.createEl('h2', { text: 'Advanced Settings' });

        new Setting(advancedSection)
            .setName("Auto-export Sessions")
            .setDesc("Automatically export conversation sessions as notes")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.autoExportSessions)
                    .onChange(async (value) => {
                        this.plugin.settings.autoExportSessions = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(advancedSection)
            .setName("Auto-save Transcripts")
            .setDesc("Automatically save conversation transcripts to your vault")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.autoSaveTranscripts)
                    .onChange(async (value) => {
                        this.plugin.settings.autoSaveTranscripts = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(advancedSection)
            .setName("Transcript Save Location")
            .setDesc("Folder path where transcripts should be saved (relative to vault root)")
            .addText((text) =>
                text
                    .setPlaceholder("Conversations/")
                    .setValue(this.plugin.settings.transcriptSaveLocation || "")
                    .onChange(async (value) => {
                        this.plugin.settings.transcriptSaveLocation = value || undefined;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(advancedSection)
            .setName("Max History Size")
            .setDesc("Maximum number of conversation sessions to keep in history")
            .addSlider((slider) =>
                slider
                    .setLimits(10, 200, 10)
                    .setValue(this.plugin.settings.maxHistorySize)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.maxHistorySize = value;
                        await this.plugin.saveSettings();
                    })
            );
    }

    private addCustomPromptsSettings(containerEl: HTMLElement) {
        const promptsSection = containerEl.createDiv('settings-section');
        promptsSection.createEl('h2', { text: 'Custom Prompts' });
        
        const desc = promptsSection.createEl('p', { 
            text: 'Create custom quick action prompts for frequently used conversations.'
        });
        desc.addClass('setting-item-description');

        // Display existing prompts
        this.plugin.settings.customPrompts.forEach((prompt, index) => {
            this.createCustomPromptSetting(promptsSection, prompt, index);
        });

        // Add new prompt button
        new Setting(promptsSection)
            .setName("Add Custom Prompt")
            .setDesc("Create a new custom prompt")
            .addButton((button) =>
                button
                    .setButtonText("Add Prompt")
                    .setCta()
                    .onClick(() => {
                        this.addNewCustomPrompt();
                    })
            );
    }

    private createCustomPromptSetting(containerEl: HTMLElement, prompt: CustomPrompt, index: number) {
        const promptContainer = containerEl.createDiv('custom-prompt-container');
        promptContainer.addClass('setting-item');

        const promptHeader = promptContainer.createDiv('prompt-header');
        promptHeader.createEl('h4', { text: `${prompt.icon} ${prompt.name}` });

        new Setting(promptContainer)
            .setName("Name")
            .addText((text) =>
                text
                    .setValue(prompt.name)
                    .onChange(async (value) => {
                        this.plugin.settings.customPrompts[index].name = value;
                        await this.plugin.saveSettings();
                        this.display(); // Refresh to update the header
                    })
            );

        new Setting(promptContainer)
            .setName("Icon")
            .addText((text) =>
                text
                    .setValue(prompt.icon)
                    .onChange(async (value) => {
                        this.plugin.settings.customPrompts[index].icon = value;
                        await this.plugin.saveSettings();
                        this.display(); // Refresh to update the header
                    })
            );

        new Setting(promptContainer)
            .setName("Category")
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("note-creation", "Note Creation")
                    .addOption("analysis", "Analysis")
                    .addOption("search", "Search")
                    .addOption("custom", "Custom")
                    .setValue(prompt.category)
                    .onChange(async (value: any) => {
                        this.plugin.settings.customPrompts[index].category = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(promptContainer)
            .setName("Prompt")
            .addTextArea((textArea) =>
                textArea
                    .setValue(prompt.prompt)
                    .onChange(async (value) => {
                        this.plugin.settings.customPrompts[index].prompt = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(promptContainer)
            .addButton((button) =>
                button
                    .setButtonText("Delete")
                    .setWarning()
                    .onClick(async () => {
                        this.plugin.settings.customPrompts.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display(); // Refresh the settings
                    })
            );

        promptContainer.createEl('hr');
    }

    private async addNewCustomPrompt() {
        const newPrompt: CustomPrompt = {
            id: `custom-${Date.now()}`,
            name: "New Prompt",
            prompt: "Enter your custom prompt here...",
            category: "custom",
            icon: "🔧"
        };

        this.plugin.settings.customPrompts.push(newPrompt);
        await this.plugin.saveSettings();
        this.display(); // Refresh the settings
    }

    private addDebugSettings(containerEl: HTMLElement) {
        const debugSection = containerEl.createDiv('settings-section');
        debugSection.createEl('h2', { text: 'Debug Settings' });

        new Setting(debugSection)
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

        new Setting(debugSection)
            .setName("Clear Conversation History")
            .setDesc("Delete all saved conversation history")
            .addButton((button) =>
                button
                    .setButtonText("Clear History")
                    .setWarning()
                    .onClick(() => {
                        localStorage.removeItem('elevenlabs-conversation-history');
                        button.setButtonText("Cleared!");
                        setTimeout(() => {
                            button.setButtonText("Clear History");
                        }, 2000);
                    })
            );

        new Setting(debugSection)
            .setName("Reset Settings")
            .setDesc("Reset all plugin settings to defaults")
            .addButton((button) =>
                button
                    .setButtonText("Reset Settings")
                    .setWarning()
                    .onClick(async () => {
                        // Create a confirmation dialog
                        const confirmed = confirm(
                            "Are you sure you want to reset all settings to default values? This cannot be undone."
                        );
                        
                        if (confirmed) {
                            // Reset to default settings
                            const defaultSettings = (await import("src/components/main_settings")).defaultSettings;
                            const defaultEnvSettings = (await import("src/components/env_settings")).defaultEnvironmentSettings;
                            
                            this.plugin.settings = { ...defaultSettings };
                            this.plugin.environmentSettings = { ...defaultEnvSettings };
                            
                            await this.plugin.saveSettings();
                            this.display(); // Refresh the settings page
                            
                            button.setButtonText("Reset Complete!");
                            setTimeout(() => {
                                button.setButtonText("Reset Settings");
                            }, 2000);
                        }
                    })
            );
    }
}
