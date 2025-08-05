import { App, Modal } from "obsidian";
import { ConnectionManager, ConnectionCallbacks } from "../components/connections";
import { SmartNotice } from "./notices";
import { Conversation } from "@11labs/client";
import { EnvironmentSettings } from "../components/env_settings";

export class ConversationOverlay extends Modal {
    private connectionManager: ConnectionManager;
    private conversation: Conversation | null = null;

    constructor(app: App, agentId: string, environmentSettings: EnvironmentSettings) {
        super(app);
        this.connectionManager = new ConnectionManager(app, agentId, environmentSettings);
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        this.createLayout(contentEl);
    }

    private createLayout(contentEl: HTMLElement) {
        this.createHeader(contentEl);
        const controls = this.createControls(contentEl);
        const status = this.createStatusIndicator(contentEl);
        
        this.setupEventHandlers(controls, status);
    }

    private createHeader(contentEl: HTMLElement) {
        contentEl.createEl("h1", {
            text: "ElevenLabs Conversational AI",
            attr: { style: "text-align: center;" },
        });
    }

    private createControls(contentEl: HTMLElement) {
        const container = contentEl.createDiv("controls-container");
        const startBtn = container.createEl("button", { text: "Start Conversation" });
        const stopBtn = container.createEl("button", { 
            text: "Stop Conversation",
            attr: { disabled: true }
        });
        
        return { startBtn, stopBtn };
    }

    private createStatusIndicator(contentEl: HTMLElement) {
        const container = contentEl.createDiv("status-container");
        const connectionStatus = container.createEl("p", { text: "Status: Disconnected" });
        const agentStatus = container.createEl("p", { text: "Agent is listening" });
        
        return { connectionStatus, agentStatus };
    }

    private setupEventHandlers(
        controls: { startBtn: HTMLButtonElement; stopBtn: HTMLButtonElement },
        status: { connectionStatus: HTMLElement; agentStatus: HTMLElement }
    ) {
        controls.startBtn.addEventListener("click", () => 
            this.handleStart(controls, status));
        controls.stopBtn.addEventListener("click", () => 
            this.handleStop(controls, status));
    }

    private async handleStart(controls: any, status: any) {
        try {
            this.conversation = await this.connectionManager.initializeConnection({
                onConnect: () => this.handleConnect(controls, status),
                onDisconnect: () => this.handleDisconnect(controls, status),
                onError: (error) => this.handleError(error),
                onModeChange: (mode) => this.handleModeChange(status, mode)
            });
        } catch (error) {
            SmartNotice.error("Failed to start conversation");
            console.error(error);
        }
    }

    private async handleStop(controls: any, status: any) {
        if (this.conversation) {
            await this.conversation.endSession();
            this.conversation = null;
            this.handleDisconnect(controls, status);
        }
    }

    private handleConnect(controls: any, status: any) {
        controls.startBtn.disabled = true;
        controls.stopBtn.disabled = false;
        status.connectionStatus.textContent = "Status: Connected";
        SmartNotice.success("Connection established");
    }

    private handleDisconnect(controls: any, status: any) {
        controls.startBtn.disabled = false;
        controls.stopBtn.disabled = true;
        status.connectionStatus.textContent = "Status: Disconnected";
    }

    private handleError(error: any) {
        SmartNotice.error("Connection error occurred");
        console.error("Conversation error:", error);
    }

    private handleModeChange(status: any, mode: { mode: string }) {
        status.agentStatus.textContent = `Agent is ${mode.mode}`;
    }

    async onClose() {
        if (this.conversation) {
            await this.conversation.endSession();
        }
        this.contentEl.empty();
    }
}