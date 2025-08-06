import { Conversation } from "@11labs/client";
import { App, TFile, TFolder } from "obsidian";
import { lookupNote } from "src/actions/lookup";
import { VectorEmbeddingsManager, SearchResult } from "./vector_embeddings";
import { AnalyticsEngine } from "./analytics_engine";
import { PluginIntegrationsManager } from "./plugin_integrations";

export interface ConnectionCallbacks {
    onConnect: () => void;
    onDisconnect: () => void;
    onError: (error: any) => void;
    onModeChange: (mode: { mode: string }) => void;
}

export interface NoteMetadata {
    name: string;
    path: string;
    size: number;
    created: string;
    modified: string;
    tags?: string[];
    links?: string[];
}

export class ConnectionManager {
    private app: App;
    private agentId: string;
    private vectorEmbeddings: VectorEmbeddingsManager;
    private analytics?: AnalyticsEngine;
    private pluginIntegrations?: PluginIntegrationsManager;
    
    constructor(app: App, agentId: string, analytics?: AnalyticsEngine, pluginIntegrations?: PluginIntegrationsManager) {
        this.app = app;
        this.agentId = agentId;
        this.analytics = analytics;
        this.pluginIntegrations = pluginIntegrations;
        this.vectorEmbeddings = new VectorEmbeddingsManager(app);
        
        // Initialize embeddings in the background
        this.vectorEmbeddings.initialize().catch(error => {
            console.error('Failed to initialize vector embeddings:', error);
        });
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
            // Basic note operations
            saveNote: async ({ title, message }: { title: string; message: string }) => {
                try {
                    const fileName = this.sanitizeFileName(title);
                    const file = await this.app.vault.create(`${fileName}.md`, message);
                    
                    // Update vector embeddings for the new note
                    setTimeout(() => {
                        this.vectorEmbeddings.updateNoteEmbedding(file).catch(console.error);
                    }, 100);
                    
                    return `Note "${title}" created successfully.`;
                } catch (error) {
                    return `Error creating note: ${error.message}`;
                }
            },
            
            getNote: async ({ noteName }: { noteName: string }) => {
                const content = await this.readNote(noteName);
                return content || `Note "${noteName}" not found.`;
            },
            
            // Advanced note operations
            editNote: async ({ noteName, newContent }: { noteName: string; newContent: string }) => {
                try {
                    const path = await lookupNote(this.app, noteName);
                    if (!path) return `Note "${noteName}" not found.`;
                    
                    const file = this.app.vault.getAbstractFileByPath(path);
                    if (file instanceof TFile) {
                        await this.app.vault.modify(file, newContent);
                        
                        // Update vector embeddings
                        setTimeout(() => {
                            this.vectorEmbeddings.updateNoteEmbedding(file).catch(console.error);
                        }, 100);
                        
                        return `Note "${noteName}" updated successfully.`;
                    }
                    return `Error: Could not modify note "${noteName}".`;
                } catch (error) {
                    return `Error editing note: ${error.message}`;
                }
            },
            
            appendToNote: async ({ noteName, content }: { noteName: string; content: string }) => {
                try {
                    const path = await lookupNote(this.app, noteName);
                    if (!path) return `Note "${noteName}" not found.`;
                    
                    const file = this.app.vault.getAbstractFileByPath(path);
                    if (file instanceof TFile) {
                        const currentContent = await this.app.vault.read(file);
                        const newContent = currentContent + '\n\n' + content;
                        await this.app.vault.modify(file, newContent);
                        
                        // Update vector embeddings
                        setTimeout(() => {
                            this.vectorEmbeddings.updateNoteEmbedding(file).catch(console.error);
                        }, 100);
                        
                        return `Content appended to "${noteName}" successfully.`;
                    }
                    return `Error: Could not append to note "${noteName}".`;
                } catch (error) {
                    return `Error appending to note: ${error.message}`;
                }
            },
            
            deleteNote: async ({ noteName }: { noteName: string }) => {
                try {
                    const path = await lookupNote(this.app, noteName);
                    if (!path) return `Note "${noteName}" not found.`;
                    
                    const file = this.app.vault.getAbstractFileByPath(path);
                    if (file instanceof TFile) {
                        await this.app.vault.delete(file);
                        
                        // Remove from vector embeddings
                        this.vectorEmbeddings.removeNoteEmbedding(path);
                        
                        return `Note "${noteName}" deleted successfully.`;
                    }
                    return `Error: Could not delete note "${noteName}".`;
                } catch (error) {
                    return `Error deleting note: ${error.message}`;
                }
            },
            
            // Enhanced search and discovery
            searchNotes: async ({ query }: { query: string }) => {
                try {
                    const files = this.app.vault.getMarkdownFiles();
                    const results: string[] = [];
                    
                    for (const file of files) {
                        const content = await this.app.vault.read(file);
                        if (content.toLowerCase().includes(query.toLowerCase()) || 
                            file.name.toLowerCase().includes(query.toLowerCase())) {
                            results.push(file.name.replace('.md', ''));
                        }
                    }
                    
                    return results.length > 0 
                        ? `Found ${results.length} notes matching "${query}": ${results.join(', ')}`
                        : `No notes found matching "${query}".`;
                } catch (error) {
                    return `Error searching notes: ${error.message}`;
                }
            },

            // Semantic search using vector embeddings
            semanticSearch: async ({ query, limit = 5 }: { query: string; limit?: number }) => {
                try {
                    const results = await this.vectorEmbeddings.semanticSearch(query, limit);
                    
                    if (results.length === 0) {
                        return `No semantically related notes found for "${query}".`;
                    }
                    
                    let response = `Found ${results.length} semantically related notes for "${query}":\n\n`;
                    
                    results.forEach((result, index) => {
                        const percentage = (result.similarity * 100).toFixed(1);
                        response += `${index + 1}. "${result.note.noteName}" (${percentage}% match)\n`;
                        
                        if (result.relevantChunks.length > 0) {
                            response += `   Preview: "${result.relevantChunks[0].substring(0, 100)}..."\n`;
                        }
                        
                        if (result.note.keywords.length > 0) {
                            response += `   Keywords: ${result.note.keywords.slice(0, 5).join(', ')}\n`;
                        }
                        response += '\n';
                    });
                    
                    return response;
                } catch (error) {
                    return `Error performing semantic search: ${error.message}`;
                }
            },

            // Find similar notes to a specific note
            findSimilarNotes: async ({ noteName, limit = 5 }: { noteName: string; limit?: number }) => {
                try {
                    const path = await lookupNote(this.app, noteName);
                    if (!path) return `Note "${noteName}" not found.`;
                    
                    const results = await this.vectorEmbeddings.findSimilarNotes(path, limit);
                    
                    if (results.length === 0) {
                        return `No similar notes found for "${noteName}".`;
                    }
                    
                    let response = `Found ${results.length} notes similar to "${noteName}":\n\n`;
                    
                    results.forEach((result, index) => {
                        const percentage = (result.similarity * 100).toFixed(1);
                        response += `${index + 1}. "${result.note.noteName}" (${percentage}% similarity)\n`;
                        
                        if (result.note.keywords.length > 0) {
                            response += `   Keywords: ${result.note.keywords.slice(0, 5).join(', ')}\n`;
                        }
                        response += '\n';
                    });
                    
                    return response;
                } catch (error) {
                    return `Error finding similar notes: ${error.message}`;
                }
            },

            // Get smart suggestions based on context
            getSmartSuggestions: async ({ context }: { context: string }) => {
                try {
                    const results = await this.vectorEmbeddings.semanticSearch(context, 3, 0.05);
                    
                    if (results.length === 0) {
                        return `No contextual suggestions found.`;
                    }
                    
                    let response = `Based on the context "${context}", here are some relevant notes:\n\n`;
                    
                    results.forEach((result, index) => {
                        response += `${index + 1}. "${result.note.noteName}"\n`;
                        if (result.relevantChunks.length > 0) {
                            response += `   Context: "${result.relevantChunks[0].substring(0, 150)}..."\n`;
                        }
                        response += '\n';
                    });
                    
                    return response;
                } catch (error) {
                    return `Error getting smart suggestions: ${error.message}`;
                }
            },
            
            getListOfNotes: async () => {
                return this.getFormattedNotesList();
            },
            
            getNotesWithMetadata: async () => {
                try {
                    const files = this.app.vault.getMarkdownFiles();
                    const metadata: NoteMetadata[] = [];
                    
                    for (const file of files) {
                        const content = await this.app.vault.read(file);
                        const tags = this.extractTags(content);
                        const links = this.extractLinks(content);
                        
                        metadata.push({
                            name: file.name.replace('.md', ''),
                            path: file.path,
                            size: file.stat.size,
                            created: new Date(file.stat.ctime).toISOString(),
                            modified: new Date(file.stat.mtime).toISOString(),
                            tags,
                            links
                        });
                    }
                    
                    return JSON.stringify(metadata, null, 2);
                } catch (error) {
                    return `Error getting notes metadata: ${error.message}`;
                }
            },
            
            // Vault statistics and analysis
            getVaultStats: async () => {
                try {
                    const files = this.app.vault.getMarkdownFiles();
                    const folders = this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder).length;
                    let totalWords = 0;
                    let totalCharacters = 0;
                    const allTags = new Set<string>();
                    
                    for (const file of files) {
                        const content = await this.app.vault.read(file);
                        totalWords += content.split(/\s+/).length;
                        totalCharacters += content.length;
                        
                        const tags = this.extractTags(content);
                        tags.forEach(tag => allTags.add(tag));
                    }

                    // Get embedding stats
                    const embeddingStats = this.vectorEmbeddings.getEmbeddingStats();
                    
                    return `Vault Statistics:
- Total notes: ${files.length}
- Total folders: ${folders}
- Total words: ${totalWords.toLocaleString()}
- Total characters: ${totalCharacters.toLocaleString()}
- Unique tags: ${allTags.size}
- Average words per note: ${Math.round(totalWords / files.length)}

Semantic Search Stats:
- Indexed notes: ${embeddingStats.totalNotes}
- Vocabulary size: ${embeddingStats.vocabularySize}
- Vector dimensions: ${embeddingStats.avgVectorLength}`;
                } catch (error) {
                    return `Error getting vault statistics: ${error.message}`;
                }
            },

            // Advanced vault analysis
            analyzeVaultStructure: async () => {
                try {
                    const files = this.app.vault.getMarkdownFiles();
                    const folders = new Map<string, number>();
                    const tagFrequency = new Map<string, number>();
                    const linkNetwork = new Map<string, Set<string>>();
                    
                    for (const file of files) {
                        // Folder analysis
                        const folderPath = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : 'Root';
                        folders.set(folderPath, (folders.get(folderPath) || 0) + 1);
                        
                        // Tag and link analysis
                        const content = await this.app.vault.read(file);
                        const tags = this.extractTags(content);
                        const links = this.extractLinks(content);
                        
                        tags.forEach(tag => {
                            tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
                        });
                        
                        linkNetwork.set(file.name, new Set(links));
                    }
                    
                    // Find most connected notes
                    const mostConnected = Array.from(linkNetwork.entries())
                        .sort((a, b) => b[1].size - a[1].size)
                        .slice(0, 5);
                    
                    // Find most used tags
                    const topTags = Array.from(tagFrequency.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10);
                    
                    let analysis = `Vault Structure Analysis:\n\n`;
                    
                    analysis += `Folder Distribution:\n`;
                    Array.from(folders.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .forEach(([folder, count]) => {
                            analysis += `  ${folder}: ${count} notes\n`;
                        });
                    
                    analysis += `\nMost Connected Notes:\n`;
                    mostConnected.forEach(([note, links]) => {
                        analysis += `  ${note}: ${links.size} outgoing links\n`;
                    });
                    
                    analysis += `\nMost Used Tags:\n`;
                    topTags.forEach(([tag, count]) => {
                        analysis += `  ${tag}: used in ${count} notes\n`;
                    });
                    
                    return analysis;
                } catch (error) {
                    return `Error analyzing vault structure: ${error.message}`;
                }
            },

            // Rebuild semantic index
            rebuildSemanticIndex: async () => {
                try {
                    await this.vectorEmbeddings.rebuildEmbeddings();
                    return `Semantic search index rebuilt successfully. All notes have been re-indexed.`;
                } catch (error) {
                    return `Error rebuilding semantic index: ${error.message}`;
                }
            },
            
            // Template creation
            createNoteFromTemplate: async ({ title, templateName }: { title: string; templateName: string }) => {
                try {
                    const templatePath = await lookupNote(this.app, templateName);
                    if (!templatePath) return `Template "${templateName}" not found.`;
                    
                    const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
                    if (templateFile instanceof TFile) {
                        const templateContent = await this.app.vault.read(templateFile);
                        const fileName = this.sanitizeFileName(title);
                        
                        // Replace template variables
                        const processedContent = templateContent
                            .replace(/{{title}}/g, title)
                            .replace(/{{date}}/g, new Date().toISOString().split('T')[0])
                            .replace(/{{time}}/g, new Date().toLocaleTimeString());
                        
                        const file = await this.app.vault.create(`${fileName}.md`, processedContent);
                        
                        // Update vector embeddings
                        setTimeout(() => {
                            this.vectorEmbeddings.updateNoteEmbedding(file).catch(console.error);
                        }, 100);
                        
                        return `Note "${title}" created from template "${templateName}".`;
                    }
                    return `Error: Could not read template "${templateName}".`;
                } catch (error) {
                    return `Error creating note from template: ${error.message}`;
                }
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
        const files = this.app.vault.getMarkdownFiles();
        const notesList = files.map(f => f.name.replace(".md", ""));
        return `You have ${files.length} notes: ${notesList.join(", ")}`;
    }
    
    private sanitizeFileName(title: string): string {
        return title.replace(/[/\\?%*:|"<>]/g, "-").trim();
    }
    
    private extractTags(content: string): string[] {
        const tagRegex = /#[\w\-_/]+/g;
        const matches = content.match(tagRegex) || [];
        return [...new Set(matches)];
    }
    
    private extractLinks(content: string): string[] {
        const linkRegex = /\[\[([^\]]+)\]\]/g;
        const matches = [];
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        return [...new Set(matches)];
    }
}
