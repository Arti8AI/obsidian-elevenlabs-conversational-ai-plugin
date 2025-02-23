export interface ElevenLabsSettings {
    agentId: string;
    voiceId?: string;
    language?: string;
}

export const defaultSettings: ElevenLabsSettings = {
    agentId: "",
    language: "en"
};
