export interface ElevenLabsSettings {
    agentId: string;
    voiceId?: string;
    language?: string;
    conversationMode: 'standard' | 'note-focused' | 'creative' | 'analysis';
    autoExportSessions: boolean;
    maxHistorySize: number;
    enableKeyboardShortcuts: boolean;
    voiceActivationThreshold: number;
    pauseAfterResponse: boolean;
    showTranscriptInRealTime: boolean;
    enableQuickActions: boolean;
    defaultNoteTemplate?: string;
    customPrompts: CustomPrompt[];
    uiDensity: 'compact' | 'normal' | 'spacious';
    enableNotifications: boolean;
    autoSaveTranscripts: boolean;
    transcriptSaveLocation?: string;
}

export interface CustomPrompt {
    id: string;
    name: string;
    prompt: string;
    category: 'note-creation' | 'analysis' | 'search' | 'custom';
    icon: string;
}

export const defaultSettings: ElevenLabsSettings = {
    agentId: "",
    language: "en",
    conversationMode: "standard",
    autoExportSessions: false,
    maxHistorySize: 50,
    enableKeyboardShortcuts: true,
    voiceActivationThreshold: 0.5,
    pauseAfterResponse: true,
    showTranscriptInRealTime: true,
    enableQuickActions: true,
    customPrompts: [
        {
            id: "daily-note",
            name: "Create Daily Note",
            prompt: "Create a daily note for today with sections for tasks, goals, and reflections",
            category: "note-creation",
            icon: "📅"
        },
        {
            id: "meeting-notes",
            name: "Meeting Notes Template",
            prompt: "Create a meeting notes template with agenda, attendees, and action items",
            category: "note-creation",
            icon: "🤝"
        },
        {
            id: "research-summary",
            name: "Research Summary",
            prompt: "Analyze my notes and create a research summary on a specific topic",
            category: "analysis",
            icon: "🔬"
        },
        {
            id: "find-connections",
            name: "Find Connections",
            prompt: "Find connections and relationships between my notes",
            category: "analysis",
            icon: "🔗"
        }
    ],
    uiDensity: "normal",
    enableNotifications: true,
    autoSaveTranscripts: false
};
