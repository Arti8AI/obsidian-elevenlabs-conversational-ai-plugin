import { App, Modal, Setting } from "obsidian";
import { ConnectionManager, ConnectionCallbacks } from "../components/connections";
import { SmartNotice } from "./notices";
import { Conversation } from "@11labs/client";

interface ConversationEntry {
    timestamp: Date;
    type: 'user' | 'agent' | 'system';
    content: string;
}

interface ConversationSession {
    id: string;
    startTime: Date;
    endTime?: Date;
    entries: ConversationEntry[];
}

export class ConversationOverlay extends Modal {
    private connectionManager: ConnectionManager;
    private conversation: Conversation | null = null;
    private currentSession: ConversationSession | null = null;
    private conversationHistory: ConversationSession[] = [];
    private transcriptContainer: HTMLElement;
    private statusContainer: HTMLElement;
    private controlsContainer: HTMLElement;
    private isRecording = false;
    private isConnected = false;

    constructor(app: App, agentId: string) {
        super(app);
        this.connectionManager = new ConnectionManager(app, agentId);
        this.loadConversationHistory();
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('elevenlabs-conversation-modal');
        
        this.createLayout(contentEl);
        this.setupKeyboardShortcuts();
    }

    private createLayout(contentEl: HTMLElement) {
        this.createHeader(contentEl);
        this.createQuickActions(contentEl);
        this.createControls(contentEl);
        this.createStatusIndicator(contentEl);
        this.createTranscriptArea(contentEl);
        this.createSessionHistory(contentEl);
    }

    private createHeader(contentEl: HTMLElement) {
        const headerContainer = contentEl.createDiv('header-container');
        headerContainer.createEl("h1", {
            text: "ElevenLabs Conversational AI",
            attr: { style: "text-align: center; margin-bottom: 10px;" },
        });
        
        const subtitle = headerContainer.createEl("p", {
            text: "Voice-powered note management and conversation",
            attr: { style: "text-align: center; color: var(--text-muted); margin-bottom: 20px;" }
        });
    }

    private createQuickActions(contentEl: HTMLElement) {
        const quickActionsContainer = contentEl.createDiv('quick-actions-container');
        quickActionsContainer.createEl('h3', { text: 'Quick Actions' });
        
        const actionsGrid = quickActionsContainer.createDiv('actions-grid');
        
        const actions = [
            { name: 'Create Note', icon: '📝', action: () => this.quickAction('Create a new note') },
            { name: 'List Notes', icon: '📋', action: () => this.quickAction('List all my notes') },
            { name: 'Search Notes', icon: '🔍', action: () => this.quickAction('Search my notes') },
            { name: 'Vault Stats', icon: '📊', action: () => this.quickAction('Show vault statistics') }
        ];
        
        actions.forEach(action => {
            const actionBtn = actionsGrid.createEl('button', {
                text: `${action.icon} ${action.name}`,
                cls: 'quick-action-btn'
            });
            actionBtn.addEventListener('click', action.action);
        });
    }

    private createControls(contentEl: HTMLElement) {
        this.controlsContainer = contentEl.createDiv("controls-container");
        
        const primaryControls = this.controlsContainer.createDiv('primary-controls');
        const startBtn = primaryControls.createEl("button", { 
            text: "🎤 Start Conversation",
            cls: 'primary-btn start-btn'
        });
        const stopBtn = primaryControls.createEl("button", { 
            text: "⏹️ Stop Conversation",
            cls: 'primary-btn stop-btn',
            attr: { disabled: 'true' }
        });
        
        const secondaryControls = this.controlsContainer.createDiv('secondary-controls');
        const pauseBtn = secondaryControls.createEl("button", { 
            text: "⏸️ Pause",
            cls: 'secondary-btn',
            attr: { disabled: 'true' }
        });
        const clearBtn = secondaryControls.createEl("button", { 
            text: "🗑️ Clear Transcript",
            cls: 'secondary-btn'
        });
        const exportBtn = secondaryControls.createEl("button", { 
            text: "📄 Export Session",
            cls: 'secondary-btn'
        });
        
        // Event listeners
        startBtn.addEventListener("click", () => this.handleStart());
        stopBtn.addEventListener("click", () => this.handleStop());
        pauseBtn.addEventListener("click", () => this.handlePause());
        clearBtn.addEventListener("click", () => this.clearTranscript());
        exportBtn.addEventListener("click", () => this.exportCurrentSession());
        
        return { startBtn, stopBtn, pauseBtn, clearBtn, exportBtn };
    }

    private createStatusIndicator(contentEl: HTMLElement) {
        this.statusContainer = contentEl.createDiv("status-container");
        
        const connectionStatus = this.statusContainer.createEl("div", { cls: 'status-item' });
        connectionStatus.createEl("span", { text: "Connection: ", cls: 'status-label' });
        connectionStatus.createEl("span", { text: "Disconnected", cls: 'status-value disconnected' });
        
        const agentStatus = this.statusContainer.createEl("div", { cls: 'status-item' });
        agentStatus.createEl("span", { text: "Agent: ", cls: 'status-label' });
        agentStatus.createEl("span", { text: "Ready", cls: 'status-value ready' });
        
        const recordingStatus = this.statusContainer.createEl("div", { cls: 'status-item' });
        recordingStatus.createEl("span", { text: "Recording: ", cls: 'status-label' });
        recordingStatus.createEl("span", { text: "Inactive", cls: 'status-value inactive' });
        
        return { connectionStatus, agentStatus, recordingStatus };
    }

    private createTranscriptArea(contentEl: HTMLElement) {
        const transcriptSection = contentEl.createDiv('transcript-section');
        transcriptSection.createEl('h3', { text: 'Conversation Transcript' });
        
        this.transcriptContainer = transcriptSection.createDiv('transcript-container');
        this.transcriptContainer.addClass('transcript-area');
        
        // Add placeholder text
        if (!this.currentSession || this.currentSession.entries.length === 0) {
            this.addTranscriptEntry('system', 'Start a conversation to see the transcript here...');
        }
    }

    private createSessionHistory(contentEl: HTMLElement) {
        const historySection = contentEl.createDiv('history-section');
        historySection.createEl('h3', { text: 'Recent Sessions' });
        
        const historyContainer = historySection.createDiv('history-container');
        
        if (this.conversationHistory.length === 0) {
            historyContainer.createEl('p', { 
                text: 'No previous conversations found.',
                cls: 'empty-history'
            });
        } else {
            this.conversationHistory.slice(-5).reverse().forEach((session, index) => {
                const sessionItem = historyContainer.createDiv('session-item');
                
                const sessionInfo = sessionItem.createDiv('session-info');
                sessionInfo.createEl('strong', { text: `Session ${session.id.slice(0, 8)}` });
                sessionInfo.createEl('span', { 
                    text: ` - ${session.startTime.toLocaleDateString()} ${session.startTime.toLocaleTimeString()}`,
                    cls: 'session-date'
                });
                sessionInfo.createEl('span', { 
                    text: ` (${session.entries.length} messages)`,
                    cls: 'session-count'
                });
                
                const sessionActions = sessionItem.createDiv('session-actions');
                const viewBtn = sessionActions.createEl('button', { 
                    text: '👁️ View',
                    cls: 'session-btn'
                });
                const deleteBtn = sessionActions.createEl('button', { 
                    text: '🗑️ Delete',
                    cls: 'session-btn delete-btn'
                });
                
                viewBtn.addEventListener('click', () => this.viewSession(session));
                deleteBtn.addEventListener('click', () => this.deleteSession(session.id));
            });
        }
    }

    private setupKeyboardShortcuts() {
        this.scope.register(['Ctrl'], 'Enter', () => {
            if (!this.isConnected) {
                this.handleStart();
            } else {
                this.handleStop();
            }
        });
        
        this.scope.register(['Ctrl'], 'Space', () => {
            this.handlePause();
        });
        
        this.scope.register(['Escape'], '', () => {
            this.close();
        });
    }

    private async quickAction(prompt: string) {
        if (!this.isConnected) {
            await this.handleStart();
            // Wait a moment for connection to establish
            setTimeout(() => {
                this.addTranscriptEntry('user', prompt);
                // Here you would typically send the prompt to the AI
            }, 1000);
        } else {
            this.addTranscriptEntry('user', prompt);
            // Here you would typically send the prompt to the AI
        }
    }

    private async handleStart() {
        try {
            // Create new session
            this.currentSession = {
                id: this.generateSessionId(),
                startTime: new Date(),
                entries: []
            };
            
            this.conversation = await this.connectionManager.initializeConnection({
                onConnect: () => this.handleConnect(),
                onDisconnect: () => this.handleDisconnect(),
                onError: (error) => this.handleError(error),
                onModeChange: (mode) => this.handleModeChange(mode)
            });
            
            this.addTranscriptEntry('system', 'Conversation started. You can now speak to the AI agent.');
        } catch (error) {
            SmartNotice.error("Failed to start conversation");
            // eslint-disable-next-line no-console
            console.error(error);
        }
    }

    private async handleStop() {
        if (this.conversation) {
            await this.conversation.endSession();
            this.conversation = null;
            
            if (this.currentSession) {
                this.currentSession.endTime = new Date();
                this.conversationHistory.push(this.currentSession);
                this.saveConversationHistory();
                this.addTranscriptEntry('system', 'Conversation ended.');
            }
            
            this.handleDisconnect();
        }
    }

    private handlePause() {
        if (this.isRecording) {
            this.addTranscriptEntry('system', 'Recording paused.');
            this.isRecording = false;
        } else {
            this.addTranscriptEntry('system', 'Recording resumed.');
            this.isRecording = true;
        }
        this.updateControls();
    }

    private clearTranscript() {
        this.transcriptContainer.empty();
        if (this.currentSession) {
            this.currentSession.entries = [];
        }
        this.addTranscriptEntry('system', 'Transcript cleared.');
    }

    private async exportCurrentSession() {
        if (!this.currentSession || this.currentSession.entries.length === 0) {
            SmartNotice.error("No conversation to export");
            return;
        }
        
        try {
            const exportContent = this.formatSessionForExport(this.currentSession);
            const fileName = `conversation-${this.currentSession.id}-${new Date().toISOString().split('T')[0]}.md`;
            
            await this.app.vault.create(fileName, exportContent);
            SmartNotice.success(`Conversation exported to ${fileName}`);
        } catch (error) {
            SmartNotice.error("Failed to export conversation");
            console.error(error);
        }
    }

    private formatSessionForExport(session: ConversationSession): string {
        let content = `# Conversation Export\n\n`;
        content += `**Session ID:** ${session.id}\n`;
        content += `**Start Time:** ${session.startTime.toISOString()}\n`;
        if (session.endTime) {
            content += `**End Time:** ${session.endTime.toISOString()}\n`;
        }
        content += `**Total Messages:** ${session.entries.length}\n\n`;
        content += `## Transcript\n\n`;
        
        session.entries.forEach(entry => {
            const timestamp = entry.timestamp.toLocaleTimeString();
            const speaker = entry.type === 'user' ? 'You' : entry.type === 'agent' ? 'AI Agent' : 'System';
            content += `**[${timestamp}] ${speaker}:** ${entry.content}\n\n`;
        });
        
        return content;
    }

    private addTranscriptEntry(type: 'user' | 'agent' | 'system', content: string) {
        const entry: ConversationEntry = {
            timestamp: new Date(),
            type,
            content
        };
        
        if (this.currentSession) {
            this.currentSession.entries.push(entry);
        }
        
        const entryEl = this.transcriptContainer.createDiv(`transcript-entry ${type}`);
        
        const headerEl = entryEl.createDiv('entry-header');
        const timeEl = headerEl.createEl('span', { 
            text: entry.timestamp.toLocaleTimeString(),
            cls: 'entry-time'
        });
        const speakerEl = headerEl.createEl('span', { 
            text: type === 'user' ? 'You' : type === 'agent' ? 'AI Agent' : 'System',
            cls: 'entry-speaker'
        });
        
        const contentEl = entryEl.createDiv('entry-content');
        contentEl.textContent = content;
        
        // Auto-scroll to bottom
        this.transcriptContainer.scrollTop = this.transcriptContainer.scrollHeight;
    }

    private handleConnect() {
        this.isConnected = true;
        this.updateControls();
        this.updateStatus('connection', 'Connected', 'connected');
        SmartNotice.success("Connection established");
    }

    private handleDisconnect() {
        this.isConnected = false;
        this.isRecording = false;
        this.updateControls();
        this.updateStatus('connection', 'Disconnected', 'disconnected');
        this.updateStatus('recording', 'Inactive', 'inactive');
    }

    private handleError(error: any) {
        SmartNotice.error("Connection error occurred");
        // eslint-disable-next-line no-console
        console.error("Conversation error:", error);
        this.addTranscriptEntry('system', `Error: ${error.message || 'Connection error occurred'}`);
    }

    private handleModeChange(mode: { mode: string }) {
        const agentMode = mode.mode;
        this.updateStatus('agent', agentMode, agentMode.toLowerCase());
        
        if (agentMode === 'listening') {
            this.isRecording = true;
            this.updateStatus('recording', 'Active', 'active');
        } else {
            this.isRecording = false;
            this.updateStatus('recording', 'Inactive', 'inactive');
        }
        
        this.updateControls();
    }

    private updateStatus(type: string, text: string, className: string) {
        const statusItems = this.statusContainer.querySelectorAll('.status-item');
        statusItems.forEach(item => {
            const label = item.querySelector('.status-label')?.textContent;
            if (label?.toLowerCase().includes(type)) {
                const valueEl = item.querySelector('.status-value');
                if (valueEl) {
                    valueEl.textContent = text;
                    valueEl.className = `status-value ${className}`;
                }
            }
        });
    }

    private updateControls() {
        const startBtn = this.controlsContainer.querySelector('.start-btn') as HTMLButtonElement;
        const stopBtn = this.controlsContainer.querySelector('.stop-btn') as HTMLButtonElement;
        const pauseBtn = this.controlsContainer.querySelector('.secondary-btn') as HTMLButtonElement;
        
        if (startBtn && stopBtn && pauseBtn) {
            startBtn.disabled = this.isConnected;
            stopBtn.disabled = !this.isConnected;
            pauseBtn.disabled = !this.isConnected;
            
            pauseBtn.textContent = this.isRecording ? '⏸️ Pause' : '▶️ Resume';
        }
    }

    private viewSession(session: ConversationSession) {
        this.transcriptContainer.empty();
        session.entries.forEach(entry => {
            this.addTranscriptEntryFromHistory(entry);
        });
        this.addTranscriptEntry('system', `Viewing session from ${session.startTime.toLocaleDateString()}`);
    }

    private addTranscriptEntryFromHistory(entry: ConversationEntry) {
        const entryEl = this.transcriptContainer.createDiv(`transcript-entry ${entry.type} historical`);
        
        const headerEl = entryEl.createDiv('entry-header');
        headerEl.createEl('span', { 
            text: entry.timestamp.toLocaleTimeString(),
            cls: 'entry-time'
        });
        headerEl.createEl('span', { 
            text: entry.type === 'user' ? 'You' : entry.type === 'agent' ? 'AI Agent' : 'System',
            cls: 'entry-speaker'
        });
        
        const contentEl = entryEl.createDiv('entry-content');
        contentEl.textContent = entry.content;
    }

    private deleteSession(sessionId: string) {
        this.conversationHistory = this.conversationHistory.filter(s => s.id !== sessionId);
        this.saveConversationHistory();
        this.close();
        this.open(); // Refresh the modal
    }

    private generateSessionId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private loadConversationHistory() {
        const saved = localStorage.getItem('elevenlabs-conversation-history');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.conversationHistory = parsed.map((session: any) => ({
                    ...session,
                    startTime: new Date(session.startTime),
                    endTime: session.endTime ? new Date(session.endTime) : undefined,
                    entries: session.entries.map((entry: any) => ({
                        ...entry,
                        timestamp: new Date(entry.timestamp)
                    }))
                }));
            } catch (error) {
                console.error('Failed to load conversation history:', error);
                this.conversationHistory = [];
            }
        }
    }

    private saveConversationHistory() {
        try {
            localStorage.setItem('elevenlabs-conversation-history', JSON.stringify(this.conversationHistory));
        } catch (error) {
            console.error('Failed to save conversation history:', error);
        }
    }

    async onClose() {
        if (this.conversation) {
            await this.conversation.endSession();
        }
        this.contentEl.empty();
    }
}