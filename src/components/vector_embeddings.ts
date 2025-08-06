import { App, TFile } from "obsidian";

export interface NoteEmbedding {
    noteId: string;
    noteName: string;
    path: string;
    content: string;
    vector: number[];
    lastModified: number;
    keywords: string[];
    tags: string[];
}

export interface SearchResult {
    note: NoteEmbedding;
    similarity: number;
    relevantChunks: string[];
}

export class VectorEmbeddingsManager {
    private app: App;
    private embeddings: Map<string, NoteEmbedding> = new Map();
    private vocabulary: Set<string> = new Set();
    private idfScores: Map<string, number> = new Map();
    private isInitialized = false;

    constructor(app: App) {
        this.app = app;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        
        console.log("Initializing vector embeddings...");
        await this.buildEmbeddings();
        this.isInitialized = true;
        console.log("Vector embeddings initialized");
    }

    async buildEmbeddings(): Promise<void> {
        const files = this.app.vault.getMarkdownFiles();
        const documents: string[] = [];
        const noteData: { file: TFile; content: string }[] = [];

        // Read all notes and prepare documents
        for (const file of files) {
            try {
                const content = await this.app.vault.read(file);
                const cleanContent = this.preprocessText(content);
                documents.push(cleanContent);
                noteData.push({ file, content: cleanContent });
            } catch (error) {
                console.error(`Failed to read file ${file.path}:`, error);
            }
        }

        // Build vocabulary and calculate IDF scores
        this.buildVocabulary(documents);
        this.calculateIdfScores(documents);

        // Create embeddings for each note
        noteData.forEach(({ file, content }, index) => {
            const embedding = this.createNoteEmbedding(file, content);
            this.embeddings.set(file.path, embedding);
        });
    }

    private preprocessText(text: string): string {
        // Remove markdown syntax, normalize text
        return text
            .replace(/#+\s/g, '') // Remove headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
            .replace(/\[\[(.*?)\]\]/g, '$1') // Remove wikilinks, keep text
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`(.*?)`/g, '$1') // Remove inline code
            .replace(/[^\w\s]/g, ' ') // Remove special characters
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    private buildVocabulary(documents: string[]): void {
        this.vocabulary.clear();
        documents.forEach(doc => {
            const words = doc.split(/\s+/).filter(word => 
                word.length > 2 && !this.isStopWord(word)
            );
            words.forEach(word => this.vocabulary.add(word));
        });
    }

    private calculateIdfScores(documents: string[]): void {
        this.idfScores.clear();
        const totalDocs = documents.length;

        this.vocabulary.forEach(term => {
            const docsContainingTerm = documents.filter(doc => 
                doc.includes(term)
            ).length;
            
            const idf = Math.log(totalDocs / (1 + docsContainingTerm));
            this.idfScores.set(term, idf);
        });
    }

    private createNoteEmbedding(file: TFile, content: string): NoteEmbedding {
        const words = content.split(/\s+/).filter(word => 
            word.length > 2 && !this.isStopWord(word)
        );

        // Calculate TF scores
        const termFreq = new Map<string, number>();
        words.forEach(word => {
            termFreq.set(word, (termFreq.get(word) || 0) + 1);
        });

        // Create TF-IDF vector
        const vector: number[] = [];
        const sortedVocab = Array.from(this.vocabulary).sort();
        
        sortedVocab.forEach(term => {
            const tf = (termFreq.get(term) || 0) / words.length;
            const idf = this.idfScores.get(term) || 0;
            vector.push(tf * idf);
        });

        // Extract keywords (top TF-IDF terms)
        const termScores = Array.from(termFreq.entries())
            .map(([term, freq]) => ({
                term,
                score: (freq / words.length) * (this.idfScores.get(term) || 0)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        const keywords = termScores.map(item => item.term);

        // Extract tags
        const originalContent = content;
        const tags = this.extractTags(originalContent);

        return {
            noteId: file.path,
            noteName: file.name.replace('.md', ''),
            path: file.path,
            content: originalContent,
            vector,
            lastModified: file.stat.mtime,
            keywords,
            tags
        };
    }

    private isStopWord(word: string): boolean {
        const stopWords = new Set([
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'will', 'with', 'would', 'you', 'your', 'have', 'had',
            'can', 'could', 'should', 'would', 'may', 'might', 'must', 'shall',
            'this', 'these', 'those', 'they', 'them', 'their', 'there', 'where',
            'when', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose'
        ]);
        return stopWords.has(word);
    }

    private extractTags(content: string): string[] {
        const tagRegex = /#[\w\-_/]+/g;
        const matches = content.match(tagRegex) || [];
        return [...new Set(matches)];
    }

    private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
        if (vectorA.length !== vectorB.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async semanticSearch(query: string, limit: number = 10, threshold: number = 0.1): Promise<SearchResult[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Create query vector
        const queryVector = this.createQueryVector(query);
        const results: SearchResult[] = [];

        // Calculate similarity with all notes
        this.embeddings.forEach(embedding => {
            const similarity = this.cosineSimilarity(queryVector, embedding.vector);
            
            if (similarity > threshold) {
                const relevantChunks = this.findRelevantChunks(embedding.content, query);
                results.push({
                    note: embedding,
                    similarity,
                    relevantChunks
                });
            }
        });

        // Sort by similarity and return top results
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    private createQueryVector(query: string): number[] {
        const processedQuery = this.preprocessText(query);
        const queryWords = processedQuery.split(/\s+/).filter(word => 
            word.length > 2 && !this.isStopWord(word)
        );

        // Calculate query term frequencies
        const termFreq = new Map<string, number>();
        queryWords.forEach(word => {
            termFreq.set(word, (termFreq.get(word) || 0) + 1);
        });

        // Create TF-IDF vector for query
        const vector: number[] = [];
        const sortedVocab = Array.from(this.vocabulary).sort();
        
        sortedVocab.forEach(term => {
            const tf = (termFreq.get(term) || 0) / queryWords.length;
            const idf = this.idfScores.get(term) || 0;
            vector.push(tf * idf);
        });

        return vector;
    }

    private findRelevantChunks(content: string, query: string, chunkSize: number = 200): string[] {
        const queryTerms = this.preprocessText(query).split(/\s+/);
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const chunks: { text: string; score: number }[] = [];

        // Create overlapping chunks
        for (let i = 0; i < sentences.length; i++) {
            const chunk = sentences.slice(i, i + 3).join('. ').trim();
            if (chunk.length < 50) continue;

            const chunkLower = chunk.toLowerCase();
            const score = queryTerms.reduce((score, term) => {
                return score + (chunkLower.includes(term) ? 1 : 0);
            }, 0);

            if (score > 0) {
                chunks.push({ text: chunk, score });
            }
        }

        return chunks
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(chunk => chunk.text);
    }

    async updateNoteEmbedding(file: TFile): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            const cleanContent = this.preprocessText(content);
            
            // If this is a new note, we need to rebuild vocabulary and IDF scores
            // For simplicity, we'll do a full rebuild if the note is new
            if (!this.embeddings.has(file.path)) {
                await this.buildEmbeddings();
                return;
            }

            // Update existing embedding
            const embedding = this.createNoteEmbedding(file, cleanContent);
            this.embeddings.set(file.path, embedding);
        } catch (error) {
            console.error(`Failed to update embedding for ${file.path}:`, error);
        }
    }

    removeNoteEmbedding(filePath: string): void {
        this.embeddings.delete(filePath);
    }

    async findSimilarNotes(notePath: string, limit: number = 5): Promise<SearchResult[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const targetEmbedding = this.embeddings.get(notePath);
        if (!targetEmbedding) {
            return [];
        }

        const results: SearchResult[] = [];

        this.embeddings.forEach((embedding, path) => {
            if (path === notePath) return; // Skip the target note itself

            const similarity = this.cosineSimilarity(targetEmbedding.vector, embedding.vector);
            
            if (similarity > 0.1) {
                results.push({
                    note: embedding,
                    similarity,
                    relevantChunks: []
                });
            }
        });

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    getEmbeddingStats(): { totalNotes: number; vocabularySize: number; avgVectorLength: number } {
        const totalNotes = this.embeddings.size;
        const vocabularySize = this.vocabulary.size;
        const avgVectorLength = this.vocabulary.size;

        return {
            totalNotes,
            vocabularySize,
            avgVectorLength
        };
    }

    async rebuildEmbeddings(): Promise<void> {
        console.log("Rebuilding vector embeddings...");
        this.embeddings.clear();
        this.vocabulary.clear();
        this.idfScores.clear();
        this.isInitialized = false;
        await this.initialize();
    }
}