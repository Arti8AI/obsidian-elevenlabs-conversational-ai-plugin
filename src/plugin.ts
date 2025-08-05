import { Plugin, Notice, TFile } from "obsidian";
import { ElevenLabsSettings, defaultSettings } from "./components/main_settings";
import { EnvironmentSettings, defaultEnvironmentSettings } from "./components/env_settings";
import { SettingsTab } from "./views/sc_settings_tab";
import { ConversationOverlay } from "./views/on_open_overlay";
import { SmartNotice } from "./views/notices";
import { PerformanceManager } from "./components/performance_manager";
import { BackupManager } from "./components/backup_manager";

export default class ElevenLabsConversationalAIPlugin extends Plugin {
    settings: ElevenLabsSettings;
    environmentSettings: EnvironmentSettings;
    private performanceManager: PerformanceManager;
    private backupManager: BackupManager;
    private isInitialized = false;

    async onload() {
        console.log('Loading ElevenLabs Conversational AI Plugin...');
        
        try {
            // Initialize managers
            this.performanceManager = new PerformanceManager(this.app);
            this.backupManager = new BackupManager(this.app, this.manifest.version);

            // Load settings and perform migrations
            await this.loadSettings();
            
            // Setup core functionality
            this.setupRibbonIcon();
            this.addCommands();
            this.addSettingTab(new SettingsTab(this.app, this));
            
            // Initialize additional features
            this.initializeKeyboardShortcuts();
            this.setupPeriodicCleanup();
            this.setupAccessibilityFeatures();
            this.performStartupOptimizations();

            // Create automatic backup if needed
            this.createAutomaticBackupIfNeeded();

            // Register event listeners
            this.registerVaultEvents();

            this.isInitialized = true;
            console.log('ElevenLabs Conversational AI Plugin loaded successfully');

        } catch (error) {
            console.error('Failed to load ElevenLabs Conversational AI Plugin:', error);
            SmartNotice.error("Failed to initialize plugin. Check console for details.");
        }
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
        
        // Add accessibility attributes
        ribbonIconEl.setAttribute('aria-label', 'Open ElevenLabs Conversational AI');
        ribbonIconEl.setAttribute('role', 'button');
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

        // Performance and maintenance commands
        this.addCommand({
            id: "optimize-performance",
            name: "Optimize Plugin Performance",
            callback: async () => {
                await this.optimizePerformance();
            }
        });

        this.addCommand({
            id: "clear-cache",
            name: "Clear Plugin Cache",
            callback: () => {
                this.clearCache();
            }
        });

        // Backup and restore commands
        this.addCommand({
            id: "export-backup",
            name: "Export Plugin Backup",
            callback: async () => {
                await this.exportBackup();
            }
        });

        this.addCommand({
            id: "import-backup",
            name: "Import Plugin Backup",
            callback: async () => {
                await this.importBackup();
            }
        });

        this.addCommand({
            id: "quick-restore",
            name: "Quick Restore from Recent Backup",
            callback: async () => {
                await this.quickRestore();
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

    // Performance Management
    private async optimizePerformance() {
        try {
            SmartNotice.info("Optimizing plugin performance...");
            await this.performanceManager.optimizeForVaultSize();
            
            const metrics = this.performanceManager.getPerformanceMetrics();
            const cacheStats = this.performanceManager.getCacheStats();
            
            const message = `Performance optimization completed!
Cache: ${cacheStats.entries} entries, ${(cacheStats.size / 1024 / 1024).toFixed(2)}MB
Hit Rate: ${cacheStats.hitRate.toFixed(1)}%`;
            
            SmartNotice.success(message);
        } catch (error) {
            SmartNotice.error("Performance optimization failed");
            console.error('Performance optimization error:', error);
        }
    }

    private clearCache() {
        try {
            this.performanceManager.cacheClear();
            SmartNotice.success("Plugin cache cleared successfully");
        } catch (error) {
            SmartNotice.error("Failed to clear cache");
            console.error('Cache clear error:', error);
        }
    }

    // Backup and Restore
    private async exportBackup() {
        try {
            const fileName = await this.backupManager.exportBackup(this.settings, this.environmentSettings);
            SmartNotice.success(`Backup exported successfully: ${fileName}`);
        } catch (error) {
            SmartNotice.error("Failed to export backup");
            console.error('Backup export error:', error);
        }
    }

    private async importBackup() {
        // Simple file picker simulation - in real implementation, you'd use a file picker
        const backupFiles = this.backupManager.getBackupFiles();
        
        if (backupFiles.length === 0) {
            SmartNotice.error("No backup files found in vault");
            return;
        }

        try {
            // For demo, use the most recent backup
            const result = await this.backupManager.importBackup(backupFiles[0].path);
            
            if (result.success) {
                SmartNotice.success(result.message);
                if (result.warnings.length > 0) {
                    console.warn('Backup restore warnings:', result.warnings);
                }
            } else {
                SmartNotice.error(result.message);
            }
        } catch (error) {
            SmartNotice.error("Failed to import backup");
            console.error('Backup import error:', error);
        }
    }

    private async quickRestore() {
        try {
            const result = await this.backupManager.quickRestore();
            if (result.success) {
                SmartNotice.success("Settings restored from recent backup");
            } else {
                SmartNotice.error(result.message);
            }
        } catch (error) {
            SmartNotice.error("Quick restore failed");
            console.error('Quick restore error:', error);
        }
    }

    private async createAutomaticBackupIfNeeded() {
        try {
            const fileName = await this.backupManager.createAutomaticBackup(this.settings, this.environmentSettings);
            if (fileName && this.environmentSettings.isDebugMode) {
                console.log(`Automatic backup created: ${fileName}`);
            }
        } catch (error) {
            console.error('Automatic backup failed:', error);
        }
    }

    // Accessibility Features
    private setupAccessibilityFeatures() {
        // Add ARIA labels and keyboard navigation support
        this.app.workspace.onLayoutReady(() => {
            this.enhanceAccessibility();
        });

        // Add high contrast mode detection
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.addClass('elevenlabs-high-contrast');
        }

        // Add reduced motion detection
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.addClass('elevenlabs-reduced-motion');
        }
    }

    private enhanceAccessibility() {
        // Add screen reader announcements for important actions
        this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
            if (this.settings.enableKeyboardShortcuts) {
                this.handleAccessibilityKeyboard(evt);
            }
        });
    }

    private handleAccessibilityKeyboard(evt: KeyboardEvent) {
        // Add keyboard shortcuts for accessibility
        if (evt.ctrlKey && evt.shiftKey) {
            switch (evt.key) {
                case 'v':
                case 'V':
                    evt.preventDefault();
                    this.announceToScreenReader("Opening ElevenLabs Conversational AI");
                    if (!this.settings.agentId) {
                        this.announceToScreenReader("Agent ID not configured. Please check settings.");
                        SmartNotice.error("Please configure your Agent ID in settings");
                        return;
                    }
                    new ConversationOverlay(this.app, this.settings.agentId).open();
                    break;
                case 'd':
                case 'D':
                    evt.preventDefault();
                    this.announceToScreenReader("Opening Daily Note Assistant");
                    this.createDailyNoteWithAI();
                    break;
            }
        }
    }

    private announceToScreenReader(message: string) {
        // Create a live region for screen reader announcements
        let liveRegion = document.getElementById('elevenlabs-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'elevenlabs-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            liveRegion.style.width = '1px';
            liveRegion.style.height = '1px';
            liveRegion.style.overflow = 'hidden';
            document.body.appendChild(liveRegion);
        }
        
        liveRegion.textContent = message;
        
        // Clear after announcement
        setTimeout(() => {
            liveRegion!.textContent = '';
        }, 1000);
    }

    // Event Handlers
    private registerVaultEvents() {
        // Handle file changes for performance optimization
        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    this.performanceManager.scheduleEmbeddingUpdate(file);
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('delete', (file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    // Handle file deletion in performance manager
                    this.performanceManager.cacheDelete(`embedding_${file.path}`);
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('rename', (file, oldPath) => {
                if (file instanceof TFile && file.extension === 'md') {
                    // Handle file rename
                    this.performanceManager.cacheDelete(`embedding_${oldPath}`);
                    this.performanceManager.scheduleEmbeddingUpdate(file);
                }
            })
        );
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
                this.performanceManager.scheduleCacheCleanup();
            }, 24 * 60 * 60 * 1000) // Run daily
        );

        // Weekly backup cleanup
        this.registerInterval(
            window.setInterval(() => {
                this.backupManager.cleanupOldBackups(this.settings.maxHistorySize / 10);
            }, 7 * 24 * 60 * 60 * 1000) // Run weekly
        );
    }

    private async performStartupOptimizations() {
        try {
            // Optimize for vault size
            await this.performanceManager.optimizeForVaultSize();
            
            // Clean up old backups if needed
            const deletedCount = await this.backupManager.cleanupOldBackups();
            
            if (this.environmentSettings.isDebugMode) {
                console.log(`Startup optimizations completed. Deleted ${deletedCount} old backups.`);
            }
        } catch (error) {
            console.error('Startup optimizations failed:', error);
        }
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
        try {
            console.log('Unloading ElevenLabs Conversational AI Plugin...');
            
            // Clean up managers
            if (this.performanceManager) {
                this.performanceManager.cleanup();
            }

            // Remove accessibility enhancements
            const liveRegion = document.getElementById('elevenlabs-live-region');
            if (liveRegion) {
                liveRegion.remove();
            }

            // Remove CSS classes
            document.body.removeClass('elevenlabs-high-contrast', 'elevenlabs-reduced-motion');

            console.log('ElevenLabs Conversational AI Plugin unloaded successfully');
        } catch (error) {
            console.error('Error during plugin unload:', error);
        }
    }
}
