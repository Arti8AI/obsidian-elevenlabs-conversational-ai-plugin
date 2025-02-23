import { Conversation } from "@11labs/client";
import { App, TFile } from "obsidian";
import { lookupNote } from "src/actions/lookup";

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
        await this.requestMicrophonePermission();
        return this.startConversationSession(callbacks);
    }

    private async requestMicrophonePermission(): Promise<void> {
        await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    private async startConversationSession(callbacks: ConnectionCallbacks): Promise<Conversation> {
        return await Conversation.startSession({
            agentId: this.agentId,
            clientTools: this.getClientTools(),
            ...callbacks
        });
    }

    private getClientTools() {
        return {
            saveNote: async ({ title, message }: { title: string; message: string }) => {
                await this.app.vault.create(`${title}.md`, message);
            },
            getNote: async ({ noteName }: { noteName: string }) => {
                const content = await this.readNote(noteName);
                return content || "";
            },
            getListOfNotes: async () => {
                return this.getFormattedNotesList();
            }
        };
    }

    private async readNote(noteName: string): Promise<string | null> {
        const path = await lookupNote(this.app, noteName);
        if (!path) return null;
        
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
            return await this.app.vault.read(file);
        }
        return null;
    }

    private getFormattedNotesList(): string {
        const files = this.app.vault.getFiles();
        return files.map(f => f.name.replace(".md", "")).join(", ");
    }
}
