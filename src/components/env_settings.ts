/**
 * Environment and debugging settings for the plugin.
 * 
 * These settings control operational behavior, debugging features,
 * and connection retry logic.
 */
export interface EnvironmentSettings {
    /** 
     * Enable detailed console logging for troubleshooting.
     * When enabled, logs connection attempts, errors, and debug information.
     * 
     * @default false
     */
    isDebugMode: boolean;
    
    /** 
     * API version identifier for ElevenLabs integration.
     * Reserved for future use with API versioning.
     * 
     * @default "1.0"
     */
    apiVersion: string;
    
    /** 
     * Maximum number of retry attempts for failed connections.
     * Used by the retry logic with exponential backoff.
     * 
     * @default 3
     * @minimum 0
     * @maximum 10
     */
    maxRetries: number;
}

/**
 * Default environment configuration values.
 * 
 * These provide sensible defaults for operational settings
 * that most users won't need to modify.
 */
export const defaultEnvironmentSettings: EnvironmentSettings = {
    /** Debug mode disabled by default for cleaner console */
    isDebugMode: false,
    /** Current API version */
    apiVersion: "1.0",
    /** Conservative retry count for stability */
    maxRetries: 3
};
