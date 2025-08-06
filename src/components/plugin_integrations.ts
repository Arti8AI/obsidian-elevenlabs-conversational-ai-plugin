import { App, Plugin, TFile, MetadataCache } from "obsidian";

export interface PluginIntegration {
    id: string;
    name: string;
    isInstalled: boolean;
    isEnabled: boolean;
    version?: string;
    capabilities: string[];
}

export interface DataviewQuery {
    query: string;
    type: 'table' | 'list' | 'task';
    result?: any;
}

export interface TemplaterTemplate {
    name: string;
    path: string;
    content: string;
    variables: string[];
}

export interface TasksQuery {
    filter: string;
    tasks: TaskItem[];
}

export interface TaskItem {
    description: string;
    status: 'todo' | 'done' | 'cancelled';
    due?: string;
    created?: string;
    priority?: 'high' | 'medium' | 'low';
    tags: string[];
    file: string;
}

export class PluginIntegrationsManager {
    private app: App;
    private integrations: Map<string, PluginIntegration> = new Map();

    constructor(app: App) {
        this.app = app;
        this.detectInstalledPlugins();
    }

    // Plugin Detection and Management
    private detectInstalledPlugins(): void {
        const plugins = (this.app as any).plugins;
        
        const knownPlugins = [
            { id: 'dataview', name: 'Dataview', capabilities: ['queries', 'metadata', 'automation'] },
            { id: 'templater-obsidian', name: 'Templater', capabilities: ['templates', 'automation', 'scripting'] },
            { id: 'calendar', name: 'Calendar', capabilities: ['daily-notes', 'scheduling', 'navigation'] },
            { id: 'obsidian-tasks-plugin', name: 'Tasks', capabilities: ['task-management', 'queries', 'scheduling'] },
            { id: 'quickadd', name: 'QuickAdd', capabilities: ['automation', 'templates', 'capture'] },
            { id: 'obsidian-git', name: 'Obsidian Git', capabilities: ['version-control', 'backup', 'sync'] },
            { id: 'obsidian-kanban', name: 'Kanban', capabilities: ['project-management', 'visualization'] },
            { id: 'graph-analysis', name: 'Graph Analysis', capabilities: ['analytics', 'visualization'] },
            { id: 'advanced-tables', name: 'Advanced Tables', capabilities: ['table-editing', 'formatting'] },
            { id: 'note-refactor-obsidian', name: 'Note Refactor', capabilities: ['organization', 'splitting'] }
        ];

        knownPlugins.forEach(plugin => {
            const installedPlugin = plugins?.plugins?.[plugin.id];
            const isInstalled = !!installedPlugin;
            const isEnabled = installedPlugin?.enabled || false;
            
            this.integrations.set(plugin.id, {
                id: plugin.id,
                name: plugin.name,
                isInstalled,
                isEnabled,
                version: installedPlugin?.version,
                capabilities: plugin.capabilities
            });
        });
    }

    public getInstalledIntegrations(): PluginIntegration[] {
        return Array.from(this.integrations.values())
            .filter(integration => integration.isInstalled);
    }

    public getEnabledIntegrations(): PluginIntegration[] {
        return Array.from(this.integrations.values())
            .filter(integration => integration.isInstalled && integration.isEnabled);
    }

    // Dataview Integration
    public async executeDataviewQuery(query: string): Promise<string> {
        const dataview = this.integrations.get('dataview');
        if (!dataview?.isEnabled) {
            return "Dataview plugin is not installed or enabled. Please install it to use advanced queries.";
        }

        try {
            const dvApi = (this.app as any).plugins.plugins.dataview?.api;
            if (!dvApi) {
                return "Dataview API not available.";
            }

            // Execute the query and format results
            const result = await dvApi.query(query);
            
            if (result.successful) {
                return this.formatDataviewResult(result.value, query);
            } else {
                return `Dataview query failed: ${result.error}`;
            }
        } catch (error) {
            return `Error executing Dataview query: ${error.message}`;
        }
    }

    private formatDataviewResult(result: any, query: string): string {
        if (!result || result.length === 0) {
            return `No results found for query: ${query}`;
        }

        let output = `Query Results (${result.length} items):\n\n`;
        
        if (Array.isArray(result)) {
            result.slice(0, 10).forEach((item, index) => {
                if (typeof item === 'object' && item.file) {
                    output += `${index + 1}. **${item.file.name}**\n`;
                    if (item.created) output += `   Created: ${item.created}\n`;
                    if (item.modified) output += `   Modified: ${item.modified}\n`;
                    if (item.tags?.length > 0) output += `   Tags: ${item.tags.join(', ')}\n`;
                } else {
                    output += `${index + 1}. ${String(item)}\n`;
                }
                output += '\n';
            });
            
            if (result.length > 10) {
                output += `... and ${result.length - 10} more items\n`;
            }
        } else {
            output += String(result);
        }

        return output;
    }

    // Templater Integration
    public async createNoteFromTemplaterTemplate(templateName: string, noteName: string, variables?: Record<string, any>): Promise<string> {
        const templater = this.integrations.get('templater-obsidian');
        if (!templater?.isEnabled) {
            return "Templater plugin is not installed or enabled.";
        }

        try {
            const templaterApi = (this.app as any).plugins.plugins['templater-obsidian']?.templater;
            if (!templaterApi) {
                return "Templater API not available.";
            }

            // Find template file
            const templateFile = this.app.vault.getAbstractFileByPath(`Templates/${templateName}.md`);
            if (!templateFile || !(templateFile instanceof TFile)) {
                return `Template "${templateName}" not found in Templates folder.`;
            }

            // Create note from template
            const newFile = await templaterApi.create_new_note_from_template(templateFile, '', noteName);
            
            if (newFile) {
                return `Note "${noteName}" created successfully from template "${templateName}".`;
            } else {
                return `Failed to create note from template.`;
            }
        } catch (error) {
            return `Error creating note from Templater template: ${error.message}`;
        }
    }

    public getAvailableTemplates(): string {
        const templater = this.integrations.get('templater-obsidian');
        if (!templater?.isEnabled) {
            return "Templater plugin is not installed or enabled.";
        }

        try {
            const templateFolder = this.app.vault.getAbstractFileByPath('Templates');
            if (!templateFolder) {
                return "No Templates folder found. Create a 'Templates' folder to use templates.";
            }

            const templates = this.app.vault.getMarkdownFiles()
                .filter(file => file.path.startsWith('Templates/'))
                .map(file => file.name.replace('.md', ''));

            if (templates.length === 0) {
                return "No templates found in Templates folder.";
            }

            return `Available templates:\n${templates.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
        } catch (error) {
            return `Error getting templates: ${error.message}`;
        }
    }

    // Tasks Plugin Integration
    public async getTasksQuery(filter: string = ""): Promise<string> {
        const tasks = this.integrations.get('obsidian-tasks-plugin');
        if (!tasks?.isEnabled) {
            return "Tasks plugin is not installed or enabled.";
        }

        try {
            // Simple task extraction from files
            const files = this.app.vault.getMarkdownFiles();
            const allTasks: TaskItem[] = [];

            for (const file of files) {
                const content = await this.app.vault.read(file);
                const taskMatches = content.match(/^[\s]*[-*+]\s*\[(.)\]\s*(.+)$/gm);
                
                if (taskMatches) {
                    taskMatches.forEach(match => {
                        const statusMatch = match.match(/\[(.)\]/);
                        const textMatch = match.match(/\]\s*(.+)$/);
                        
                        if (statusMatch && textMatch) {
                            const status = statusMatch[1] === ' ' ? 'todo' : 
                                         statusMatch[1] === 'x' ? 'done' : 'cancelled';
                            
                            const description = textMatch[1];
                            const tags = description.match(/#[\w-]+/g) || [];
                            
                            allTasks.push({
                                description: description.replace(/#[\w-]+/g, '').trim(),
                                status,
                                tags,
                                file: file.name
                            });
                        }
                    });
                }
            }

            // Apply filter
            let filteredTasks = allTasks;
            if (filter) {
                const filterLower = filter.toLowerCase();
                filteredTasks = allTasks.filter(task => 
                    task.description.toLowerCase().includes(filterLower) ||
                    task.tags.some(tag => tag.toLowerCase().includes(filterLower)) ||
                    task.file.toLowerCase().includes(filterLower)
                );
            }

            return this.formatTasksResult(filteredTasks, filter);
        } catch (error) {
            return `Error querying tasks: ${error.message}`;
        }
    }

    private formatTasksResult(tasks: TaskItem[], filter: string): string {
        if (tasks.length === 0) {
            return filter ? `No tasks found matching "${filter}".` : "No tasks found in vault.";
        }

        const todoTasks = tasks.filter(t => t.status === 'todo');
        const doneTasks = tasks.filter(t => t.status === 'done');
        
        let output = `Task Summary ${filter ? `(filtered by "${filter}")` : ''}:\n`;
        output += `- Total: ${tasks.length} tasks\n`;
        output += `- Todo: ${todoTasks.length}\n`;
        output += `- Done: ${doneTasks.length}\n\n`;

        if (todoTasks.length > 0) {
            output += `**Pending Tasks:**\n`;
            todoTasks.slice(0, 10).forEach((task, i) => {
                output += `${i + 1}. ${task.description}`;
                if (task.tags.length > 0) output += ` ${task.tags.join(' ')}`;
                output += ` (${task.file})\n`;
            });
            
            if (todoTasks.length > 10) {
                output += `... and ${todoTasks.length - 10} more pending tasks\n`;
            }
        }

        return output;
    }

    // Calendar Integration
    public async getDailyNoteForDate(date: string): Promise<string> {
        const calendar = this.integrations.get('calendar');
        const dateStr = date || new Date().toISOString().split('T')[0];
        
        try {
            // Check if daily note exists
            const dailyNoteFile = this.app.vault.getAbstractFileByPath(`Daily Notes/${dateStr}.md`) ||
                                 this.app.vault.getAbstractFileByPath(`${dateStr}.md`);
            
            if (dailyNoteFile && dailyNoteFile instanceof TFile) {
                const content = await this.app.vault.read(dailyNoteFile);
                return `Daily note for ${dateStr}:\n\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`;
            } else {
                return `No daily note found for ${dateStr}. ${calendar?.isEnabled ? 'You can create one using the Calendar plugin.' : 'Consider installing the Calendar plugin for better daily note management.'}`;
            }
        } catch (error) {
            return `Error accessing daily note: ${error.message}`;
        }
    }

    // QuickAdd Integration
    public getQuickAddCaptures(): string {
        const quickAdd = this.integrations.get('quickadd');
        if (!quickAdd?.isEnabled) {
            return "QuickAdd plugin is not installed or enabled.";
        }

        return "QuickAdd integration available. You can create custom capture templates and automation workflows.";
    }

    // Git Integration
    public async getGitStatus(): Promise<string> {
        const git = this.integrations.get('obsidian-git');
        if (!git?.isEnabled) {
            return "Obsidian Git plugin is not installed or enabled.";
        }

        try {
            const gitApi = (this.app as any).plugins.plugins['obsidian-git'];
            if (!gitApi) {
                return "Git API not available.";
            }

            // Basic git status info
            return "Git integration active. Use voice commands like 'commit my changes' or 'sync with remote' for version control.";
        } catch (error) {
            return `Error accessing Git status: ${error.message}`;
        }
    }

    // Advanced Integration Tools
    public getIntegrationCapabilities(): string {
        const enabled = this.getEnabledIntegrations();
        
        if (enabled.length === 0) {
            return "No plugin integrations available. Consider installing popular plugins like Dataview, Templater, or Tasks for enhanced AI capabilities.";
        }

        let output = "Available plugin integrations:\n\n";
        
        enabled.forEach(integration => {
            output += `**${integration.name}** (v${integration.version || 'unknown'})\n`;
            output += `Capabilities: ${integration.capabilities.join(', ')}\n\n`;
        });

        output += "Use voice commands like:\n";
        output += "- 'Query my notes with Dataview'\n";
        output += "- 'Create note from template'\n";
        output += "- 'Show my tasks'\n";
        output += "- 'Get daily note for today'\n";

        return output;
    }

    public async executeIntegratedCommand(command: string, params: any = {}): Promise<string> {
        const commandLower = command.toLowerCase();
        
        // Dataview commands
        if (commandLower.includes('dataview') || commandLower.includes('query')) {
            const query = params.query || "TABLE file.name AS Name, file.mtime AS Modified FROM \"\" SORT file.mtime DESC LIMIT 10";
            return await this.executeDataviewQuery(query);
        }

        // Template commands
        if (commandLower.includes('template')) {
            if (commandLower.includes('list') || commandLower.includes('available')) {
                return this.getAvailableTemplates();
            }
            if (params.templateName && params.noteName) {
                return await this.createNoteFromTemplaterTemplate(params.templateName, params.noteName, params.variables);
            }
        }

        // Task commands
        if (commandLower.includes('task')) {
            return await this.getTasksQuery(params.filter);
        }

        // Daily note commands
        if (commandLower.includes('daily') && commandLower.includes('note')) {
            return await this.getDailyNoteForDate(params.date);
        }

        // Git commands
        if (commandLower.includes('git') || commandLower.includes('commit') || commandLower.includes('sync')) {
            return await this.getGitStatus();
        }

        // QuickAdd commands
        if (commandLower.includes('quickadd') || commandLower.includes('capture')) {
            return this.getQuickAddCaptures();
        }

        return `Unknown integration command: ${command}. Available integrations: ${this.getEnabledIntegrations().map(i => i.name).join(', ')}`;
    }

    // Smart Integration Suggestions
    public getSmartSuggestions(context: string): string[] {
        const suggestions: string[] = [];
        const enabled = this.getEnabledIntegrations();
        const contextLower = context.toLowerCase();

        // Context-based suggestions
        if (contextLower.includes('note') || contextLower.includes('create')) {
            if (enabled.some(i => i.id === 'templater-obsidian')) {
                suggestions.push("Use Templater to create structured notes from templates");
            }
            if (enabled.some(i => i.id === 'quickadd')) {
                suggestions.push("Use QuickAdd for rapid note capture with automation");
            }
        }

        if (contextLower.includes('task') || contextLower.includes('todo')) {
            if (enabled.some(i => i.id === 'obsidian-tasks-plugin')) {
                suggestions.push("Query and manage tasks across your vault");
            }
            if (enabled.some(i => i.id === 'obsidian-kanban')) {
                suggestions.push("Visualize tasks in Kanban boards");
            }
        }

        if (contextLower.includes('data') || contextLower.includes('search') || contextLower.includes('query')) {
            if (enabled.some(i => i.id === 'dataview')) {
                suggestions.push("Use Dataview for powerful data queries and visualization");
            }
        }

        if (contextLower.includes('daily') || contextLower.includes('calendar')) {
            if (enabled.some(i => i.id === 'calendar')) {
                suggestions.push("Navigate and manage daily notes with Calendar");
            }
        }

        return suggestions;
    }

    // Plugin Health Check
    public checkPluginHealth(): { healthy: boolean; issues: string[]; recommendations: string[] } {
        const installed = this.getInstalledIntegrations();
        const enabled = this.getEnabledIntegrations();
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Check for common issues
        if (installed.length === 0) {
            issues.push("No supported plugins detected");
            recommendations.push("Install Dataview, Templater, or Tasks for enhanced functionality");
        }

        if (installed.length > enabled.length) {
            const disabled = installed.length - enabled.length;
            issues.push(`${disabled} supported plugins are installed but disabled`);
            recommendations.push("Enable installed plugins to unlock AI integration features");
        }

        // Check for missing popular plugins
        const popularPlugins = ['dataview', 'templater-obsidian', 'obsidian-tasks-plugin'];
        const missing = popularPlugins.filter(id => !this.integrations.get(id)?.isInstalled);
        
        if (missing.length > 0) {
            recommendations.push(`Consider installing: ${missing.map(id => this.integrations.get(id)?.name).join(', ')}`);
        }

        return {
            healthy: issues.length === 0,
            issues,
            recommendations
        };
    }

    public refreshIntegrations(): void {
        this.detectInstalledPlugins();
    }
}