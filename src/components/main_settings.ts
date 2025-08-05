/**
 * Configuration settings for ElevenLabs Conversational AI plugin.
 * 
 * These settings control the behavior and connection parameters
 * for the ElevenLabs integration.
 */
export interface ElevenLabsSettings {
    /** 
     * Unique identifier for your ElevenLabs conversational AI agent.
     * Required for establishing connections to the ElevenLabs service.
     * 
     * @example "agent-123e4567-e89b-12d3-a456-426614174000"
     */
    agentId: string;
    
    /** 
     * Optional voice ID for text-to-speech operations.
     * If not specified, uses the agent's default voice.
     * 
     * @example "voice-456e7890-e89b-12d3-a456-426614174000"
     */
    voiceId?: string;
    
    /** 
     * Language code for speech recognition and synthesis.
     * Affects both input processing and output generation.
     * 
     * @default "en"
     * @example "en" | "es" | "fr" | "de"
     */
    language?: string;
}

/**
 * Default configuration values for the plugin.
 * 
 * These values are used when no user settings are found
 * or to fill in missing configuration options.
 */
export const defaultSettings: ElevenLabsSettings = {
    /** Empty agent ID - must be configured by user */
    agentId: "",
    /** Default to English language */
    language: "en"
};
