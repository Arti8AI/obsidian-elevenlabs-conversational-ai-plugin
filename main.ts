import { Conversation } from "@11labs/client";
import { App, Modal, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";

/**
 * Gets the path of an existing note
 */
export function getNotePath(app: App, title: string): string | null {
	const fileName = title.replace(/[/\\?%*:|"<>]/g, "-").trim() + ".md";
	const files = app.vault.getFiles();
	const file = files.find((f) => f.name === fileName);
	return file ? file.path : null;
}

/**
 * Reads the content of a note
 * @param app - Obsidian App instance
 * @param title - Note title
 * @returns Promise<string | null> - Note content or null if not found
 */
export async function readNote(
	app: App,
	title: string
): Promise<string | null> {
	const path = getNotePath(app, title);
	if (!path) return null;

	const file = app.vault.getAbstractFileByPath(path);
	if (file instanceof TFile) {
		return await app.vault.read(file);
	}
	return null;
}

interface ElevenLabsConversationalAISettings {
	agentId: string;
}

const DEFAULT_SETTINGS: ElevenLabsConversationalAISettings = {
	agentId: "",
};

export default class ElevenLabsConversationalAIPlugin extends Plugin {
	settings: ElevenLabsConversationalAISettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"microphone",
			"ElevenLabsConversationalAI Plugin",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new ElevenLabsConversationalAIModal(this.app, this.settings).open();
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-voice-ai-agent",
			name: "Open ElevenLabs Conversational AI",
			callback: () => {
				new ElevenLabsConversationalAIModal(this.app, this.settings).open();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ElevenLabsConversationalAISettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ElevenLabsConversationalAIModal extends Modal {
	private conversation: Conversation | null;
	private settings: ElevenLabsConversationalAISettings;

	constructor(app: App, settings: ElevenLabsConversationalAISettings) {
		super(app);
		this.settings = settings;
		this.conversation = null;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Set up the modal content
		contentEl.createEl("h1", {
			text: "ElevenLabs Conversational AI",
			attr: { style: "text-align: center;" },
		});

		const buttonContainer = contentEl.createDiv({
			attr: { style: "margin-bottom: 20px; text-align: center;" },
		});

		const startButton = buttonContainer.createEl("button", {
			text: "Start Conversation",
			attr: { style: "padding: 10px 20px; margin: 5px;" },
		});
		const stopButton = buttonContainer.createEl("button", {
			text: "Stop Conversation",
			attr: { style: "padding: 10px 20px; margin: 5px;", disabled: true },
		});

		const statusContainer = contentEl.createDiv({
			attr: { style: "font-size: 18px; text-align: center;" },
		});
		statusContainer.createEl("p", { text: "Status: " }).createEl("span", {
			text: "Disconnected",
			attr: { id: "connectionStatus" },
		});
		statusContainer.createEl("p", { text: "Agent is " }).createEl("span", {
			text: "listening",
			attr: { id: "agentStatus" },
		});

		const connectionStatus = contentEl.querySelector("#connectionStatus");
		const agentStatus = contentEl.querySelector("#agentStatus");

		const startConversation = async () => {
			try {
				// Request microphone permission
				await navigator.mediaDevices.getUserMedia({ audio: true });

				// Start the conversation
				this.conversation = await Conversation.startSession({
					agentId: this.settings.agentId,
					clientTools: {
						saveNote: async ({ title, message }) => {
							console.log(message);
							await this.app.vault.create(`${title}.md`, message);
						},
						getNote: async ({ noteName }) => {
							console.log(noteName);
							const content = await readNote(this.app, noteName);
							if (content) {
								console.log(content);
								return content;
							}
							return "Note not found";
						},
                        getListOfNotes: async () => {
                            const files = this.app.vault.getFiles();
                            const notes = files.map(f => f.name.replace(".md", "")).join(", ");
                            console.log(notes);
                            return notes;
                        }
					},
					onConnect: () => {
						if (connectionStatus) {
							connectionStatus.textContent = "Connected";
						}
						startButton.disabled = true;
						stopButton.disabled = false;
					},
					onDisconnect: () => {
						if (connectionStatus) {
							connectionStatus.textContent = "Disconnected";
						}
						startButton.disabled = false;
						stopButton.disabled = true;
					},
					onError: (error) => {
						console.error("Error:", error);
					},
					onModeChange: (mode) => {
						if (agentStatus) {
							agentStatus.textContent =
								mode.mode === "speaking"
									? "speaking"
									: "listening";
						}
					},
				});
			} catch (error) {
				console.error("Failed to start conversation:", error);
			}
		};

		const stopConversation = async () => {
			if (this.conversation) {
				await this.conversation.endSession();
				this.conversation = null;
			}
		};

		startButton.addEventListener("click", startConversation);
		stopButton.addEventListener("click", stopConversation);
	}

	async onClose() {
		const { contentEl } = this;
		if (this.conversation) {
			await this.conversation.endSession();
		}
		contentEl.empty();
	}
}

class ElevenLabsConversationalAISettingTab extends PluginSettingTab {
	plugin: ElevenLabsConversationalAIPlugin;

	constructor(app: App, plugin: ElevenLabsConversationalAIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("ElevenLabs Agent Id")
			.setDesc("ElevenLabs Agent Id")
			.addText((text) =>
				text
					.setPlaceholder("Enter your Agent Id")
					.setValue(this.plugin.settings.agentId)
					.onChange(async (value) => {
						this.plugin.settings.agentId = value;
						await this.plugin.saveSettings();
					})
			);
	}
}