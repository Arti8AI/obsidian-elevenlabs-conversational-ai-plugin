import { Conversation } from "@11labs/client";
import { App, TFile } from "obsidian";
import { lookupNote } from "src/actions/lookup";
import { SmartNotice } from "../views/notices";

export interface ConnectionCallbacks {
    onConnect: () => void;
    onDisconnect: () => void;
    onError: (error: any) => void;
    onModeChange: (mode: { mode: string }) => void;
}

export class ConnectionManager {
    private app: App;
    private agentId: string;
    
    constructor(app: App, agentId: string) {
        this.app = app;
        this.agentId = agentId;
    }

    async initializeConnection(callbacks: ConnectionCallbacks): Promise<Conversation> {
        try {
            await this.requestMicrophonePermission();
            return await this.startConversationSession(callbacks);
        } catch (error) {
            this.handleConnectionError(error, callbacks);
            throw error;
        }
    }

    private async requestMicrophonePermission(): Promise<void> {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            const errorMessage = this.getMicrophoneErrorMessage(error);
            SmartNotice.error(errorMessage);
            throw new Error(`Microphone access denied: ${errorMessage}`);
        }
    }

    private getMicrophoneErrorMessage(error: any): string {
        if (!error?.name) return "Unknown microphone error";
        
        switch (error.name) {
            case "NotAllowedError":
                return "Microphone access denied. Please allow microphone permissions in your browser settings.";
            case "NotFoundError":
                return "No microphone found. Please connect a microphone and try again.";
            case "NotSupportedError":
                return "Microphone not supported by your browser.";
            case "OverconstrainedError":
                return "Microphone constraints not satisfied.";
            default:
                return `Microphone error: ${error.message || error.name}`;
        }
    }

    private async startConversationSession(callbacks: ConnectionCallbacks): Promise<Conversation> {
        try {
            const enhancedCallbacks = this.enhanceCallbacks(callbacks);
            
            return await Conversation.startSession({
                agentId: this.agentId,
                clientTools: this.getClientTools(),
                ...enhancedCallbacks
            });
        } catch (error) {
            this.handleConnectionError(error, callbacks);
            throw error;
        }
    }

    private enhanceCallbacks(callbacks: ConnectionCallbacks): ConnectionCallbacks {
        return {
            ...callbacks,
            onError: (error: any) => {
                this.handleConnectionError(error, callbacks);
                callbacks.onError(error);
            }
        };
    }

    private handleConnectionError(error: any, callbacks: ConnectionCallbacks): void {
        console.error("[ElevenLabs Connection]", error);
        
        const errorMessage = this.getConnectionErrorMessage(error);
        SmartNotice.error(errorMessage);
        
        // Notify UI about the error
        callbacks.onError(error);
    }

    private getConnectionErrorMessage(error: any): string {
        if (!error) return "Unknown connection error";
        
        // Handle different types of errors
        if (typeof error === 'string') return error;
        
        if (error.message) {
            if (error.message.includes('agent')) {
                return "Invalid Agent ID. Please check your ElevenLabs Agent ID in settings.";
            }
            if (error.message.includes('network') || error.message.includes('fetch')) {
                return "Network error. Please check your internet connection.";
            }
            if (error.message.includes('unauthorized') || error.message.includes('auth')) {
                return "Authentication failed. Please verify your ElevenLabs credentials.";
            }
            return `Connection error: ${error.message}`;
        }
        
        if (error.status) {
            switch (error.status) {
                case 401:
                    return "Authentication failed. Please check your ElevenLabs Agent ID.";
                case 403:
                    return "Access forbidden. Please verify your ElevenLabs account permissions.";
                case 404:
                    return "Agent not found. Please check your Agent ID.";
                case 429:
                    return "Too many requests. Please wait before trying again.";
                case 500:
                    return "ElevenLabs server error. Please try again later.";
                default:
                    return `Server error (${error.status}). Please try again.`;
            }
        }
        
        return "Failed to connect to ElevenLabs. Please try again.";
    }

    private getClientTools() {
        return {
            saveNote: async ({ title, message }: { title: string; message: string }) => {
                try {
                    // Sanitize filename
                    const sanitizedTitle = this.sanitizeFileName(title);
                    const fileName = `${sanitizedTitle}.md`;
                    
                    // Check if file already exists
                    const existingFile = this.app.vault.getAbstractFileByPath(fileName);
                    if (existingFile) {
                        SmartNotice.warning(`Note "${sanitizedTitle}" already exists. Creating with timestamp.`);
                        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                        const uniqueFileName = `${sanitizedTitle}_${timestamp}.md`;
                        await this.app.vault.create(uniqueFileName, message);
                        SmartNotice.success(`Note created: ${uniqueFileName.replace('.md', '')}`);
                    } else {
                        await this.app.vault.create(fileName, message);
                        SmartNotice.success(`Note created: ${sanitizedTitle}`);
                    }
                } catch (error) {
                    SmartNotice.error(`Failed to create note: ${error.message}`);
                    console.error("Error creating note:", error);
                }
            },
            getNote: async ({ noteName }: { noteName: string }) => {
                try {
                    const content = await this.readNote(noteName);
                    if (content === null) {
                        SmartNotice.warning(`Note "${noteName}" not found`);
                        return `Note "${noteName}" was not found in your vault.`;
                    }
                    return content;
                } catch (error) {
                    SmartNotice.error(`Failed to read note: ${error.message}`);
                    return `Error reading note "${noteName}": ${error.message}`;
                }
            },
            getListOfNotes: async () => {
                try {
                    const notesList = this.getFormattedNotesList();
                    if (!notesList) {
                        return "No notes found in your vault.";
                    }
                    return notesList;
                } catch (error) {
                    SmartNotice.error(`Failed to get notes list: ${error.message}`);
                    return "Error retrieving notes list.";
                }
            }
        };
    }

    private sanitizeFileName(title: string): string {
        // Remove or replace invalid characters for file names
        return title
            .replace(/[/\\?%*:|"<>]/g, "-")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 100); // Limit length
    }

    private async readNote(noteName: string): Promise<string | null> {
        try {
            const path = await lookupNote(this.app, noteName);
            if (!path) return null;
            
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) {
                return await this.app.vault.read(file);
            }
            return null;
        } catch (error) {
            console.error("Error reading note:", error);
            throw error;
        }
    }

    private getFormattedNotesList(): string {
        try {
            const files = this.app.vault.getFiles();
            const markdownFiles = files.filter(f => f.extension === 'md');
            
            if (markdownFiles.length === 0) {
                return "";
            }
            
            return markdownFiles
                .map(f => f.name.replace(".md", ""))
                .slice(0, 50) // Limit to first 50 notes
                .join(", ");
        } catch (error) {
            console.error("Error getting notes list:", error);
            throw error;
        }
    }
}
