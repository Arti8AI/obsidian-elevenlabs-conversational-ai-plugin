import { App, TFile } from "obsidian";

/**
 * Represents a search result with scoring and match type information.
 * Used internally by the fuzzy search algorithm.
 */
interface SearchResult {
    /** The matched file object */
    file: TFile;
    /** Numeric score indicating match quality (0-100) */
    score: number;
    /** Type of match found */
    matchType: 'exact' | 'partial' | 'fuzzy';
}

/**
 * Intelligent note lookup with fuzzy search capabilities.
 * 
 * Attempts to find notes using multiple search strategies:
 * 1. Exact title match (highest priority)
 * 2. Sanitized title match (handles special characters)
 * 3. Partial text matching (substring searches)
 * 4. Fuzzy matching (similar text with typos)
 * 
 * @param app - Obsidian App instance for vault access
 * @param title - The note title to search for
 * @returns Promise resolving to the file path of the best match, or null if no match found
 * 
 * @example
 * ```typescript
 * // Exact match
 * const path = await lookupNote(app, "Daily Notes");
 * 
 * // Fuzzy match (finds "Daily Notes" even with typos)
 * const path = await lookupNote(app, "Daly Nots");
 * 
 * // Partial match
 * const path = await lookupNote(app, "Daily");
 * ```
 */
export async function lookupNote(app: App, title: string): Promise<string | null> {
    if (!title || !title.trim()) {
        return null;
    }

    const searchTitle = title.trim();
    const allFiles = app.vault.getFiles().filter(f => f.extension === 'md');
    
    if (allFiles.length === 0) {
        return null;
    }

    // Try multiple search strategies
    const results = searchNotes(allFiles, searchTitle);
    
    if (results.length === 0) {
        return null;
    }

    // Return the best match
    const bestMatch = results[0];
    return bestMatch.file.path;
}

/**
 * Performs multi-strategy search on the provided files.
 * 
 * @param files - Array of markdown files to search through
 * @param searchTitle - The title to search for
 * @returns Array of search results sorted by relevance (best first)
 */
function searchNotes(files: TFile[], searchTitle: string): SearchResult[] {
    const results: SearchResult[] = [];
    const searchLower = searchTitle.toLowerCase();
    
    for (const file of files) {
        const fileName = file.name.replace('.md', '');
        const fileNameLower = fileName.toLowerCase();
        
        // Strategy 1: Exact match (highest priority)
        if (fileName === searchTitle || fileNameLower === searchLower) {
            results.push({
                file,
                score: 100,
                matchType: 'exact'
            });
            continue;
        }
        
        // Strategy 2: Exact match with sanitized filename
        const sanitizedSearch = sanitizeSearchTerm(searchTitle);
        const sanitizedFileName = sanitizeSearchTerm(fileName);
        
        if (sanitizedFileName === sanitizedSearch) {
            results.push({
                file,
                score: 95,
                matchType: 'exact'
            });
            continue;
        }
        
        // Strategy 3: Partial matches
        const partialScore = calculatePartialMatch(fileNameLower, searchLower);
        if (partialScore > 0) {
            results.push({
                file,
                score: partialScore,
                matchType: 'partial'
            });
            continue;
        }
        
        // Strategy 4: Fuzzy matching
        const fuzzyScore = calculateFuzzyMatch(fileNameLower, searchLower);
        if (fuzzyScore > 30) { // Only include reasonably good fuzzy matches
            results.push({
                file,
                score: fuzzyScore,
                matchType: 'fuzzy'
            });
        }
    }
    
    // Sort by score (descending)
    return results.sort((a, b) => b.score - a.score);
}

/**
 * Sanitizes a search term by removing special characters and whitespace.
 * Used for normalized comparisons.
 */
function sanitizeSearchTerm(term: string): string {
    return term
        .toLowerCase()
        .replace(/[/\\?%*:|"<>\s\-_.]/g, '')
        .trim();
}

/**
 * Calculates partial match score based on substring matching and word boundaries.
 * Higher scores for better matches (beginning of string, word boundaries).
 */
function calculatePartialMatch(fileName: string, searchTerm: string): number {
    // Check if search term is contained in filename
    if (fileName.includes(searchTerm)) {
        // Higher score for matches at the beginning
        if (fileName.startsWith(searchTerm)) {
            return 85;
        }
        // Good score for word boundary matches
        if (fileName.includes(' ' + searchTerm) || fileName.includes('-' + searchTerm) || fileName.includes('_' + searchTerm)) {
            return 75;
        }
        // Standard partial match
        return 65;
    }
    
    // Check if filename is contained in search term (for longer search queries)
    if (searchTerm.includes(fileName) && fileName.length > 3) {
        return 70;
    }
    
    // Check word-by-word matching
    const searchWords = searchTerm.split(/[\s\-_]+/).filter(w => w.length > 0);
    const fileWords = fileName.split(/[\s\-_]+/).filter(w => w.length > 0);
    
    if (searchWords.length > 1 && fileWords.length > 1) {
        const wordMatchScore = calculateWordMatch(fileWords, searchWords);
        if (wordMatchScore > 0) {
            return Math.min(60, wordMatchScore);
        }
    }
    
    return 0;
}

/**
 * Calculates score for word-by-word matching between file and search terms.
 */
function calculateWordMatch(fileWords: string[], searchWords: string[]): number {
    let matches = 0;
    let totalWords = searchWords.length;
    
    for (const searchWord of searchWords) {
        if (searchWord.length < 2) continue; // Skip very short words
        
        for (const fileWord of fileWords) {
            if (fileWord.includes(searchWord) || searchWord.includes(fileWord)) {
                matches++;
                break;
            }
        }
    }
    
    if (matches === 0) return 0;
    
    // Score based on percentage of matched words
    const matchRatio = matches / totalWords;
    return Math.round(50 * matchRatio + 10); // Base score of 10, up to 60
}

/**
 * Calculates fuzzy match score using Levenshtein distance algorithm.
 * Includes bonuses for matching prefixes and suffixes.
 */
function calculateFuzzyMatch(fileName: string, searchTerm: string): number {
    // Simple fuzzy matching algorithm based on character similarity
    if (fileName.length === 0 || searchTerm.length === 0) {
        return 0;
    }
    
    // Use Levenshtein-inspired algorithm
    const maxLength = Math.max(fileName.length, searchTerm.length);
    const distance = levenshteinDistance(fileName, searchTerm);
    
    // Convert distance to similarity score (0-100)
    const similarity = ((maxLength - distance) / maxLength) * 100;
    
    // Bonus for matching prefixes
    let prefixBonus = 0;
    const minLen = Math.min(fileName.length, searchTerm.length);
    for (let i = 0; i < minLen; i++) {
        if (fileName[i] === searchTerm[i]) {
            prefixBonus += 2;
        } else {
            break;
        }
    }
    
    // Bonus for matching suffixes
    let suffixBonus = 0;
    for (let i = 1; i <= minLen; i++) {
        if (fileName[fileName.length - i] === searchTerm[searchTerm.length - i]) {
            suffixBonus += 1;
        } else {
            break;
        }
    }
    
    return Math.min(100, Math.round(similarity + prefixBonus + suffixBonus));
}

/**
 * Calculates Levenshtein distance between two strings.
 * Used for fuzzy matching to handle typos and character substitutions.
 */
function levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    // Initialize first row and column
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    // Fill the matrix
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

/**
 * Advanced search function that searches both note titles and content.
 * 
 * Provides comprehensive search across the entire vault with relevance scoring.
 * Useful for finding notes that mention specific topics or contain certain text.
 * 
 * @param app - Obsidian App instance for vault access
 * @param searchTerm - The term to search for in titles and content
 * @param maxResults - Maximum number of results to return (default: 10)
 * @returns Promise resolving to array of matching files, sorted by relevance
 * 
 * @example
 * ```typescript
 * // Find all notes mentioning "machine learning"
 * const files = await searchNotesByContent(app, "machine learning", 5);
 * 
 * // Search for project-related notes
 * const files = await searchNotesByContent(app, "project", 20);
 * ```
 */
export async function searchNotesByContent(app: App, searchTerm: string, maxResults: number = 10): Promise<TFile[]> {
    const allFiles = app.vault.getFiles().filter(f => f.extension === 'md');
    const results: { file: TFile; relevance: number }[] = [];
    
    for (const file of allFiles) {
        try {
            const content = await app.vault.read(file);
            const contentLower = content.toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            
            let relevance = 0;
            
            // Title match (highest weight)
            const fileName = file.name.replace('.md', '').toLowerCase();
            if (fileName.includes(searchLower)) {
                relevance += 100;
            }
            
            // Content match
            const contentMatches = (content.match(new RegExp(searchTerm, 'gi')) || []).length;
            relevance += contentMatches * 10;
            
            // Header match (medium weight)
            const headerMatches = (content.match(new RegExp(`^#+.*${searchTerm}.*$`, 'gmi')) || []).length;
            relevance += headerMatches * 30;
            
            if (relevance > 0) {
                results.push({ file, relevance });
            }
        } catch (error) {
            console.warn(`Failed to read file ${file.path}:`, error);
        }
    }
    
    return results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, maxResults)
        .map(r => r.file);
}
