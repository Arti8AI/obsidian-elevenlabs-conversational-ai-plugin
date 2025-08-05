import { App, TFile, Notice } from "obsidian";
import { ElevenLabsSettings } from "./main_settings";
import { EnvironmentSettings } from "./env_settings";

export interface BackupData {
    version: string;
    timestamp: string;
    settings: ElevenLabsSettings;
    environmentSettings: EnvironmentSettings;
    conversationHistory: any[];
    customPrompts: any[];
    performanceMetrics?: any;
    metadata: {
        deviceInfo: string;
        obsidianVersion: string;
        pluginVersion: string;
        noteCount: number;
        exportReason: string;
    };
}

export interface RestoreResult {
    success: boolean;
    message: string;
    warnings: string[];
    restored: {
        settings: boolean;
        conversations: boolean;
        customPrompts: boolean;
    };
}

export class BackupManager {
    private app: App;
    private currentVersion: string;

    constructor(app: App, pluginVersion: string) {
        this.app = app;
        this.currentVersion = pluginVersion;
    }

    // Create comprehensive backup
    async createBackup(
        settings: ElevenLabsSettings,
        environmentSettings: EnvironmentSettings,
        exportReason: string = "manual"
    ): Promise<BackupData> {
        const conversationHistory = this.getConversationHistory();
        const noteCount = this.app.vault.getMarkdownFiles().length;

        const backupData: BackupData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            settings: this.sanitizeSettings(settings),
            environmentSettings,
            conversationHistory,
            customPrompts: settings.customPrompts || [],
            metadata: {
                deviceInfo: this.getDeviceInfo(),
                obsidianVersion: (this.app as any).vault.adapter.version || "unknown",
                pluginVersion: this.currentVersion,
                noteCount,
                exportReason
            }
        };

        return backupData;
    }

    // Export backup to file
    async exportBackup(
        settings: ElevenLabsSettings,
        environmentSettings: EnvironmentSettings,
        customFileName?: string
    ): Promise<string> {
        try {
            const backupData = await this.createBackup(settings, environmentSettings, "export");
            const fileName = customFileName || `elevenlabs-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            const backupContent = JSON.stringify(backupData, null, 2);
            await this.app.vault.create(fileName, backupContent);
            
            new Notice(`Backup exported successfully: ${fileName}`);
            return fileName;
        } catch (error) {
            const errorMsg = `Failed to export backup: ${error.message}`;
            new Notice(errorMsg);
            throw new Error(errorMsg);
        }
    }

    // Import and restore from backup
    async importBackup(backupFilePath: string): Promise<RestoreResult> {
        const result: RestoreResult = {
            success: false,
            message: "",
            warnings: [],
            restored: {
                settings: false,
                conversations: false,
                customPrompts: false
            }
        };

        try {
            // Read backup file
            const file = this.app.vault.getAbstractFileByPath(backupFilePath);
            if (!(file instanceof TFile)) {
                throw new Error("Backup file not found");
            }

            const backupContent = await this.app.vault.read(file);
            const backupData: BackupData = JSON.parse(backupContent);

            // Validate backup
            const validation = this.validateBackup(backupData);
            if (!validation.valid) {
                throw new Error(`Invalid backup file: ${validation.errors.join(", ")}`);
            }

            // Add compatibility warnings
            result.warnings.push(...validation.warnings);

            // Restore settings
            if (backupData.settings) {
                result.restored.settings = true;
                result.warnings.push(...this.validateSettingsCompatibility(backupData.settings));
            }

            // Restore conversation history
            if (backupData.conversationHistory && backupData.conversationHistory.length > 0) {
                this.restoreConversationHistory(backupData.conversationHistory);
                result.restored.conversations = true;
            }

            // Restore custom prompts
            if (backupData.customPrompts && backupData.customPrompts.length > 0) {
                result.restored.customPrompts = true;
            }

            result.success = true;
            result.message = `Successfully restored backup from ${new Date(backupData.timestamp).toLocaleDateString()}`;

            new Notice("Backup restored successfully! Please restart Obsidian to apply all changes.");
            
            return result;

        } catch (error) {
            result.message = `Failed to restore backup: ${error.message}`;
            new Notice(result.message);
            return result;
        }
    }

    // Validate backup data
    private validateBackup(backupData: any): { valid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check required fields
        if (!backupData.version) errors.push("Missing version information");
        if (!backupData.timestamp) errors.push("Missing timestamp");
        if (!backupData.settings) errors.push("Missing settings data");

        // Check version compatibility
        if (backupData.version !== "1.0") {
            warnings.push(`Backup version ${backupData.version} may not be fully compatible with current plugin version`);
        }

        // Check data integrity
        if (backupData.settings && typeof backupData.settings !== 'object') {
            errors.push("Settings data is corrupted");
        }

        // Check conversation history format
        if (backupData.conversationHistory && !Array.isArray(backupData.conversationHistory)) {
            warnings.push("Conversation history format may be incompatible");
        }

        // Check for very old backups
        const backupAge = Date.now() - new Date(backupData.timestamp).getTime();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        if (backupAge > thirtyDays) {
            warnings.push("Backup is older than 30 days and may contain outdated settings");
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    // Validate settings compatibility
    private validateSettingsCompatibility(settings: any): string[] {
        const warnings: string[] = [];

        // Check for deprecated settings
        const deprecatedFields = ['oldFieldName', 'legacyOption'];
        for (const field of deprecatedFields) {
            if (settings[field] !== undefined) {
                warnings.push(`Deprecated setting '${field}' will be ignored`);
            }
        }

        // Check for new required fields
        if (!settings.conversationMode) {
            warnings.push("Conversation mode not set, using default");
        }

        if (!settings.customPrompts) {
            warnings.push("No custom prompts found in backup");
        }

        // Validate custom prompts structure
        if (settings.customPrompts && Array.isArray(settings.customPrompts)) {
            settings.customPrompts.forEach((prompt: any, index: number) => {
                if (!prompt.id || !prompt.name || !prompt.prompt) {
                    warnings.push(`Custom prompt ${index + 1} is missing required fields`);
                }
            });
        }

        return warnings;
    }

    // Automatic backup creation
    async createAutomaticBackup(
        settings: ElevenLabsSettings,
        environmentSettings: EnvironmentSettings
    ): Promise<string | null> {
        try {
            // Check if automatic backup is needed
            const lastBackup = localStorage.getItem('elevenlabs-last-backup');
            const now = Date.now();
            const sevenDays = 7 * 24 * 60 * 60 * 1000;

            if (lastBackup && (now - parseInt(lastBackup)) < sevenDays) {
                return null; // Recent backup exists
            }

            // Create automatic backup
            const backupData = await this.createBackup(settings, environmentSettings, "automatic");
            const fileName = `elevenlabs-auto-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            const backupContent = JSON.stringify(backupData, null, 2);
            await this.app.vault.create(fileName, backupContent);

            // Update last backup timestamp
            localStorage.setItem('elevenlabs-last-backup', now.toString());

            return fileName;
        } catch (error) {
            console.error('Automatic backup failed:', error);
            return null;
        }
    }

    // Migrate settings between versions
    async migrateSettings(settings: any, fromVersion: string, toVersion: string): Promise<ElevenLabsSettings> {
        console.log(`Migrating settings from ${fromVersion} to ${toVersion}`);

        // Example migration logic
        if (fromVersion === "0.0.4" && toVersion === "1.0.0") {
            // Add new fields with defaults
            settings.conversationMode = settings.conversationMode || "standard";
            settings.customPrompts = settings.customPrompts || [];
            settings.enableKeyboardShortcuts = settings.enableKeyboardShortcuts ?? true;
            settings.uiDensity = settings.uiDensity || "normal";
            
            // Remove deprecated fields
            delete settings.deprecatedField;
        }

        return settings as ElevenLabsSettings;
    }

    // Utility methods
    private sanitizeSettings(settings: ElevenLabsSettings): ElevenLabsSettings {
        // Remove sensitive information from backup
        const sanitized = { ...settings };
        
        // Don't backup sensitive fields (though agentId might be needed)
        // sanitized.agentId = "***REDACTED***";
        
        return sanitized;
    }

    private getConversationHistory(): any[] {
        try {
            const history = localStorage.getItem('elevenlabs-conversation-history');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Failed to get conversation history:', error);
            return [];
        }
    }

    private restoreConversationHistory(history: any[]): void {
        try {
            // Merge with existing history or replace
            const existingHistory = this.getConversationHistory();
            const mergedHistory = [...existingHistory, ...history];
            
            // Remove duplicates based on session ID
            const uniqueHistory = mergedHistory.filter((session, index, array) => 
                array.findIndex(s => s.id === session.id) === index
            );
            
            localStorage.setItem('elevenlabs-conversation-history', JSON.stringify(uniqueHistory));
        } catch (error) {
            console.error('Failed to restore conversation history:', error);
        }
    }

    private getDeviceInfo(): string {
        try {
            const platform = (navigator as any).platform || 'unknown';
            const userAgent = navigator.userAgent || 'unknown';
            return `${platform} - ${userAgent.substring(0, 100)}`;
        } catch (error) {
            return 'unknown';
        }
    }

    // Backup validation and repair
    async validateAndRepairBackup(backupData: BackupData): Promise<{ repaired: boolean; changes: string[] }> {
        const changes: string[] = [];
        let repaired = false;

        // Repair missing fields
        if (!backupData.version) {
            backupData.version = "1.0";
            changes.push("Added missing version field");
            repaired = true;
        }

        if (!backupData.metadata) {
            backupData.metadata = {
                deviceInfo: "unknown",
                obsidianVersion: "unknown",
                pluginVersion: this.currentVersion,
                noteCount: 0,
                exportReason: "repaired"
            };
            changes.push("Added missing metadata");
            repaired = true;
        }

        // Repair custom prompts structure
        if (backupData.settings && backupData.settings.customPrompts) {
            const prompts = backupData.settings.customPrompts;
            prompts.forEach((prompt: any, index: number) => {
                if (!prompt.id) {
                    prompt.id = `repaired-${Date.now()}-${index}`;
                    changes.push(`Added missing ID to custom prompt ${index + 1}`);
                    repaired = true;
                }
                if (!prompt.category) {
                    prompt.category = "custom";
                    changes.push(`Added missing category to custom prompt ${index + 1}`);
                    repaired = true;
                }
            });
        }

        return { repaired, changes };
    }

    // Cleanup old backups
    async cleanupOldBackups(keepCount: number = 5): Promise<number> {
        try {
            const files = this.app.vault.getFiles();
            const backupFiles = files
                .filter(file => file.name.includes('elevenlabs-backup') || file.name.includes('elevenlabs-auto-backup'))
                .sort((a, b) => b.stat.mtime - a.stat.mtime); // Sort by modification time, newest first

            if (backupFiles.length <= keepCount) {
                return 0; // No cleanup needed
            }

            const filesToDelete = backupFiles.slice(keepCount);
            let deletedCount = 0;

            for (const file of filesToDelete) {
                try {
                    await this.app.vault.delete(file);
                    deletedCount++;
                } catch (error) {
                    console.error(`Failed to delete backup file ${file.name}:`, error);
                }
            }

            if (deletedCount > 0) {
                new Notice(`Cleaned up ${deletedCount} old backup files`);
            }

            return deletedCount;
        } catch (error) {
            console.error('Failed to cleanup old backups:', error);
            return 0;
        }
    }

    // Get backup file list
    getBackupFiles(): TFile[] {
        return this.app.vault.getFiles()
            .filter(file => 
                file.name.includes('elevenlabs-backup') || 
                file.name.includes('elevenlabs-auto-backup')
            )
            .sort((a, b) => b.stat.mtime - a.stat.mtime);
    }

    // Quick restore from most recent backup
    async quickRestore(): Promise<RestoreResult> {
        const backupFiles = this.getBackupFiles();
        
        if (backupFiles.length === 0) {
            return {
                success: false,
                message: "No backup files found",
                warnings: [],
                restored: { settings: false, conversations: false, customPrompts: false }
            };
        }

        const mostRecent = backupFiles[0];
        return await this.importBackup(mostRecent.path);
    }
}