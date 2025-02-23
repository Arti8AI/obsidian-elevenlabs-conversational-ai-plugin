export interface EnvironmentSettings {
    isDebugMode: boolean;
    apiVersion: string;
    maxRetries: number;
}

export const defaultEnvironmentSettings: EnvironmentSettings = {
    isDebugMode: false,
    apiVersion: "1.0",
    maxRetries: 3
};
