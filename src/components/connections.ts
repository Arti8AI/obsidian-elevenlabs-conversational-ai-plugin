import { Conversation } from "@11labs/client";
import { App, TFile } from "obsidian";
import { lookupNote } from "src/actions/lookup";
import { SmartNotice } from "../views/notices";
import { EnvironmentSettings } from "./env_settings";

export interface ConnectionCallbacks {
    onConnect: () => void;
    onDisconnect: () => void;
    onError: (error: any) => void;
    onModeChange: (mode: { mode: string }) => void;
}

interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    timeoutMs: number;
}

export class ConnectionManager {
    private app: App;
    private agentId: string;
    private environmentSettings: EnvironmentSettings;
    private retryConfig: RetryConfig;
    private currentRetryCount: number = 0;
    
    constructor(app: App, agentId: string, environmentSettings: EnvironmentSettings) {
        this.app = app;
        this.agentId = agentId;
        this.environmentSettings = environmentSettings;
        this.retryConfig = {
            maxRetries: environmentSettings.maxRetries,
            baseDelay: 1000, // 1 second base delay
            maxDelay: 30000, // 30 seconds max delay
            timeoutMs: 15000 // 15 seconds timeout
        };
    }

    async initializeConnection(callbacks: ConnectionCallbacks): Promise<Conversation> {
        this.currentRetryCount = 0;
        return this.attemptConnectionWithRetry(callbacks);
    }

    private async attemptConnectionWithRetry(callbacks: ConnectionCallbacks): Promise<Conversation> {
        const enhancedCallbacks = this.enhanceCallbacks(callbacks);
        
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            this.currentRetryCount = attempt;
            
            try {
                if (attempt > 0) {
                    SmartNotice.info(`Retrying connection... (${attempt}/${this.retryConfig.maxRetries})`);
                    
                    if (this.environmentSettings.isDebugMode) {
                        console.log(`[ElevenLabs] Retry attempt ${attempt}/${this.retryConfig.maxRetries}`);
                    }
                }

                // Set timeout for the entire connection attempt
                const connectionPromise = this.performConnection(enhancedCallbacks);
                const timeoutPromise = this.createTimeoutPromise(this.retryConfig.timeoutMs);
                
                const result = await Promise.race([connectionPromise, timeoutPromise]);
                
                if (attempt > 0) {
                    SmartNotice.success("Connection established successfully!");
                }
                
                return result;
                
            } catch (error) {
                const isLastAttempt = attempt === this.retryConfig.maxRetries;
                
                if (this.environmentSettings.isDebugMode) {
                    console.log(`[ElevenLabs] Attempt ${attempt + 1} failed:`, error);
                }
                
                if (isLastAttempt) {
                    this.handleFinalConnectionFailure(error, enhancedCallbacks);
                    throw error;
                }
                
                // Check if error is retryable
                if (!this.isRetryableError(error)) {
                    this.handleConnectionError(error, enhancedCallbacks);
                    throw error;
                }
                
                // Wait before retry with exponential backoff
                const delay = this.calculateRetryDelay(attempt);
                await this.delay(delay);
            }
        }
        
        throw new Error("Max retry attempts exceeded");
    }

    private async performConnection(callbacks: ConnectionCallbacks): Promise<Conversation> {
        await this.requestMicrophonePermission();
        return await this.startConversationSession(callbacks);
    }

    private createTimeoutPromise(timeoutMs: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Connection timeout after ${timeoutMs / 1000} seconds`));
            }, timeoutMs);
        });
    }

    private calculateRetryDelay(attempt: number): number {
        // Exponential backoff with jitter
        const exponentialDelay = Math.min(
            this.retryConfig.baseDelay * Math.pow(2, attempt),
            this.retryConfig.maxDelay
        );
        
        // Add jitter (±25% of the delay)
        const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
        return Math.round(exponentialDelay + jitter);
    }

    private isRetryableError(error: any): boolean {
        // Don't retry on certain types of errors
        if (typeof error === 'string') {
            const lowerError = error.toLowerCase();
            if (lowerError.includes('unauthorized') || 
                lowerError.includes('agent') || 
                lowerError.includes('microphone access denied')) {
                return false;
            }
        }
        
        if (error.message) {
            const lowerMessage = error.message.toLowerCase();
            if (lowerMessage.includes('unauthorized') || 
                lowerMessage.includes('auth') ||
                lowerMessage.includes('microphone access denied') ||
                lowerMessage.includes('invalid agent')) {
                return false;
            }
        }
        
        // Don't retry on specific HTTP status codes
        if (error.status) {
            switch (error.status) {
                case 400: // Bad Request
                case 401: // Unauthorized
                case 403: // Forbidden
                case 404: // Not Found
                    return false;
                case 429: // Too Many Requests
                case 500: // Internal Server Error
                case 502: // Bad Gateway
                case 503: // Service Unavailable
                case 504: // Gateway Timeout
                    return true;
                default:
                    return true;
            }
        }
        
        // Retry on network errors, timeouts, and unknown errors by default
        return true;
    }

    private handleFinalConnectionFailure(error: any, callbacks: ConnectionCallbacks): void {
        console.error("[ElevenLabs Connection] Final attempt failed:", error);
        
        const errorMessage = this.getConnectionErrorMessage(error);
        SmartNotice.error(`Connection failed after ${this.retryConfig.maxRetries + 1} attempts: ${errorMessage}`);
        
        callbacks.onError(error);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
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
            return await Conversation.startSession({
                agentId: this.agentId,
                clientTools: this.getClientTools(),
                ...callbacks
            });
        } catch (error) {
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
        if (this.environmentSettings.isDebugMode) {
            console.error("[ElevenLabs Connection]", error);
        }
        
        // Only show error message if it's not a retryable error or it's the final attempt
        if (!this.isRetryableError(error) || this.currentRetryCount >= this.retryConfig.maxRetries) {
            const errorMessage = this.getConnectionErrorMessage(error);
            SmartNotice.error(errorMessage);
        }
    }

    private getConnectionErrorMessage(error: any): string {
        if (!error) return "Unknown connection error";
        
        // Handle timeout errors specifically
        if (error.message && error.message.includes('timeout')) {
            return "Connection timed out. Please check your internet connection and try again.";
        }
        
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
                    // Import validation functions
                    const { validateFileCreation } = await import('../actions/validation');
                    
                    // Validate inputs
                    const validation = validateFileCreation(title, message);
                    if (!validation.isValid) {
                        SmartNotice.error(`Cannot create note: ${validation.errorMessage}`);
                        return;
                    }
                    
                    const sanitizedFileName = validation.sanitizedValue!;
                    const fileNameWithoutExt = sanitizedFileName.replace('.md', '');
                    
                    // Check if file already exists
                    const existingFile = this.app.vault.getAbstractFileByPath(sanitizedFileName);
                    if (existingFile) {
                        SmartNotice.warning(`Note "${fileNameWithoutExt}" already exists. Creating with timestamp.`);
                        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                        const uniqueFileName = `${fileNameWithoutExt}_${timestamp}.md`;
                        
                        // Validate the new filename too
                        const uniqueValidation = validateFileCreation(uniqueFileName.replace('.md', ''), message);
                        if (!uniqueValidation.isValid) {
                            SmartNotice.error(`Cannot create unique note: ${uniqueValidation.errorMessage}`);
                            return;
                        }
                        
                        await this.app.vault.create(uniqueFileName, message);
                        SmartNotice.success(`Note created: ${uniqueFileName.replace('.md', '')}`);
                    } else {
                        await this.app.vault.create(sanitizedFileName, message);
                        SmartNotice.success(`Note created: ${fileNameWithoutExt}`);
                    }
                } catch (error) {
                    SmartNotice.error(`Failed to create note: ${error.message}`);
                    if (this.environmentSettings.isDebugMode) {
                        console.error("Error creating note:", error);
                    }
                }
            },
            getNote: async ({ noteName }: { noteName: string }) => {
                try {
                    // Import validation functions
                    const { validateFileName } = await import('../actions/validation');
                    
                    // Validate note name
                    const validation = validateFileName(noteName);
                    if (!validation.isValid) {
                        SmartNotice.error(`Invalid note name: ${validation.errorMessage}`);
                        return `Error: Invalid note name - ${validation.errorMessage}`;
                    }
                    
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
