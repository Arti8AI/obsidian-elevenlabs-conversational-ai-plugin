import { Plugin, Notice, TFile } from "obsidian";
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
        
        // Initialize additional features
        this.initializeKeyboardShortcuts();
        this.setupPeriodicCleanup();
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
        // Primary conversation command
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

        // Quick commands for specific actions
        this.addCommand({
            id: "quick-create-note",
            name: "Quick Create Note with AI",
            callback: () => {
                this.quickAction("Create a new note");
            }
        });

        this.addCommand({
            id: "quick-search-notes",
            name: "Quick Search Notes with AI",
            callback: () => {
                this.quickAction("Search my notes");
            }
        });

        this.addCommand({
            id: "analyze-current-note",
            name: "Analyze Current Note with AI",
            callback: () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    SmartNotice.error("No active note to analyze");
                    return;
                }
                this.quickAction(`Analyze the note "${activeFile.name.replace('.md', '')}"`);
            }
        });

        this.addCommand({
            id: "get-vault-overview",
            name: "Get Vault Overview from AI",
            callback: () => {
                this.quickAction("Give me an overview of my vault and suggest how to organize it better");
            }
        });

        this.addCommand({
            id: "daily-note-assistant",
            name: "Daily Note Assistant",
            callback: () => {
                this.createDailyNoteWithAI();
            }
        });

        this.addCommand({
            id: "export-conversation",
            name: "Export Last Conversation",
            callback: () => {
                this.exportLastConversation();
            }
        });

        // Custom prompt commands
        this.settings.customPrompts.forEach((prompt, index) => {
            this.addCommand({
                id: `custom-prompt-${prompt.id}`,
                name: `${prompt.icon} ${prompt.name}`,
                callback: () => {
                    this.quickAction(prompt.prompt);
                }
            });
        });

        // Note template commands
        this.addCommand({
            id: "create-note-from-template",
            name: "Create Note from Template with AI",
            callback: () => {
                this.createNoteFromTemplateWithAI();
            }
        });
    }

    private async quickAction(prompt: string) {
        if (!this.settings.agentId) {
            SmartNotice.error("Please configure your Agent ID in settings");
            return;
        }

        // Open conversation overlay and immediately start with the prompt
        const overlay = new ConversationOverlay(this.app, this.settings.agentId);
        overlay.open();
        
        // Give the overlay time to initialize then trigger the quick action
        setTimeout(() => {
            // This would ideally be a method on the overlay to trigger a quick action
            // For now, we'll just open it and the user can use the quick action buttons
        }, 500);
    }

    private async createDailyNoteWithAI() {
        const today = new Date().toISOString().split('T')[0];
        const dailyNoteName = `Daily Note ${today}`;
        
        try {
            // Check if daily note already exists
            const files = this.app.vault.getMarkdownFiles();
            const existingDaily = files.find(f => 
                f.name.includes(today) || f.name.includes('Daily Note')
            );
            
            if (existingDaily) {
                // Open existing daily note and ask AI to help with it
                await this.app.workspace.openLinkText(existingDaily.path, '', true);
                this.quickAction(`Help me organize and update my daily note for ${today}. Add any missing sections or suggest improvements.`);
            } else {
                // Create new daily note with AI assistance
                this.quickAction(`Create a comprehensive daily note for ${today} with sections for goals, tasks, reflections, and important events. Include prompts to help me fill it out.`);
            }
        } catch (error) {
            SmartNotice.error("Failed to create daily note with AI assistance");
            console.error(error);
        }
    }

    private async createNoteFromTemplateWithAI() {
        if (!this.settings.defaultNoteTemplate) {
            SmartNotice.error("No default note template configured in settings");
            return;
        }

        this.quickAction(`Create a new note using the template "${this.settings.defaultNoteTemplate}". Ask me for the title and any specific details to customize it.`);
    }

    private async exportLastConversation() {
        try {
            const history = localStorage.getItem('elevenlabs-conversation-history');
            if (!history) {
                SmartNotice.error("No conversation history found");
                return;
            }

            const sessions = JSON.parse(history);
            if (sessions.length === 0) {
                SmartNotice.error("No conversations to export");
                return;
            }

            const lastSession = sessions[sessions.length - 1];
            const exportContent = this.formatSessionForExport(lastSession);
            
            const fileName = `conversation-export-${new Date().toISOString().split('T')[0]}.md`;
            const savePath = this.settings.transcriptSaveLocation 
                ? `${this.settings.transcriptSaveLocation}/${fileName}`
                : fileName;

            await this.app.vault.create(savePath, exportContent);
            SmartNotice.success(`Conversation exported to ${savePath}`);
        } catch (error) {
            SmartNotice.error("Failed to export conversation");
            console.error(error);
        }
    }

    private formatSessionForExport(session: any): string {
        let content = `# Conversation Export\n\n`;
        content += `**Session ID:** ${session.id}\n`;
        content += `**Start Time:** ${new Date(session.startTime).toISOString()}\n`;
        if (session.endTime) {
            content += `**End Time:** ${new Date(session.endTime).toISOString()}\n`;
        }
        content += `**Total Messages:** ${session.entries.length}\n\n`;
        content += `## Transcript\n\n`;
        
        session.entries.forEach((entry: any) => {
            const timestamp = new Date(entry.timestamp).toLocaleTimeString();
            const speaker = entry.type === 'user' ? 'You' : entry.type === 'agent' ? 'AI Agent' : 'System';
            content += `**[${timestamp}] ${speaker}:** ${entry.content}\n\n`;
        });
        
        return content;
    }

    private initializeKeyboardShortcuts() {
        if (!this.settings.enableKeyboardShortcuts) {
            return;
        }

        // Global hotkeys for quick access
        this.addCommand({
            id: "global-hotkey-conversation",
            name: "Quick Start Conversation (Global)",
            hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "v" }],
            callback: () => {
                if (!this.settings.agentId) {
                    SmartNotice.error("Please configure your Agent ID in settings");
                    return;
                }
                new ConversationOverlay(this.app, this.settings.agentId).open();
            }
        });

        this.addCommand({
            id: "global-hotkey-daily-note",
            name: "Quick Daily Note Assistant (Global)",
            hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "d" }],
            callback: () => {
                this.createDailyNoteWithAI();
            }
        });
    }

    private setupPeriodicCleanup() {
        // Clean up old conversation history based on maxHistorySize setting
        this.registerInterval(
            window.setInterval(() => {
                this.cleanupConversationHistory();
            }, 24 * 60 * 60 * 1000) // Run daily
        );
    }

    private cleanupConversationHistory() {
        try {
            const history = localStorage.getItem('elevenlabs-conversation-history');
            if (!history) return;

            const sessions = JSON.parse(history);
            if (sessions.length > this.settings.maxHistorySize) {
                // Keep only the most recent sessions
                const recentSessions = sessions.slice(-this.settings.maxHistorySize);
                localStorage.setItem('elevenlabs-conversation-history', JSON.stringify(recentSessions));
                
                if (this.environmentSettings.isDebugMode) {
                    console.log(`Cleaned up conversation history. Kept ${recentSessions.length} recent sessions.`);
                }
            }
        } catch (error) {
            console.error('Failed to cleanup conversation history:', error);
        }
    }

    async loadSettings() {
        const savedSettings = await this.loadData();
        this.settings = Object.assign({}, defaultSettings, savedSettings?.settings);
        this.environmentSettings = Object.assign({}, defaultEnvironmentSettings, savedSettings?.environmentSettings);
        
        // Validate and migrate settings if needed
        this.validateAndMigrateSettings();
    }

    private validateAndMigrateSettings() {
        // Ensure custom prompts array exists
        if (!this.settings.customPrompts) {
            this.settings.customPrompts = defaultSettings.customPrompts;
        }

        // Validate conversation mode
        const validModes = ['standard', 'note-focused', 'creative', 'analysis'];
        if (!validModes.includes(this.settings.conversationMode)) {
            this.settings.conversationMode = 'standard';
        }

        // Validate UI density
        const validDensities = ['compact', 'normal', 'spacious'];
        if (!validDensities.includes(this.settings.uiDensity)) {
            this.settings.uiDensity = 'normal';
        }

        // Ensure numeric values are within valid ranges
        if (this.settings.maxHistorySize < 10 || this.settings.maxHistorySize > 200) {
            this.settings.maxHistorySize = 50;
        }

        if (this.settings.voiceActivationThreshold < 0.1 || this.settings.voiceActivationThreshold > 1.0) {
            this.settings.voiceActivationThreshold = 0.5;
        }
    }

    async saveSettings() {
        await this.saveData({
            settings: this.settings,
            environmentSettings: this.environmentSettings
        });
    }

    async onunload() {
        // Clean up any resources
        console.log('ElevenLabs Conversational AI plugin unloaded');
    }
}
