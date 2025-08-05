import { TFile } from 'obsidian';

// Mock TFile class for testing
class MockTFile {
    name: string;
    extension: string;
    path: string;

    constructor(name: string, path?: string) {
        this.name = name;
        this.extension = name.split('.').pop() || '';
        this.path = path || name;
    }
}

// Mock App class for testing
class MockApp {
    vault = {
        getFiles: () => this.files,
        read: async (file: TFile) => this.fileContents[file.path] || ''
    };
    
    files: TFile[] = [];
    fileContents: { [path: string]: string } = {};

    addFile(name: string, content: string = '') {
        const file = new MockTFile(name) as any as TFile;
        this.files.push(file);
        this.fileContents[file.path] = content;
        return file;
    }

    clear() {
        this.files = [];
        this.fileContents = {};
    }
}

// Import the functions to test after setting up mocks
const mockApp = new MockApp();

// We need to dynamically import to ensure mocks are set up
const lookupModule = require('../src/actions/lookup');
const { lookupNote, searchNotesByContent } = lookupModule;

describe('Note Lookup', () => {
    beforeEach(() => {
        mockApp.clear();
    });

    describe('lookupNote', () => {
        test('should find exact matches', async () => {
            mockApp.addFile('Daily Notes.md');
            mockApp.addFile('Weekly Review.md');
            
            const result = await lookupNote(mockApp as any, 'Daily Notes');
            expect(result).toBe('Daily Notes.md');
        });

        test('should handle case insensitive searches', async () => {
            mockApp.addFile('Project Ideas.md');
            
            const result = await lookupNote(mockApp as any, 'project ideas');
            expect(result).toBe('Project Ideas.md');
        });

        test('should find partial matches', async () => {
            mockApp.addFile('Meeting Notes 2024-01-15.md');
            mockApp.addFile('Random File.md');
            
            const result = await lookupNote(mockApp as any, 'Meeting');
            expect(result).toBe('Meeting Notes 2024-01-15.md');
        });

        test('should handle fuzzy matching', async () => {
            mockApp.addFile('JavaScript Tutorial.md');
            mockApp.addFile('Python Guide.md');
            
            // Test with typo
            const result = await lookupNote(mockApp as any, 'JavaScrit Tutorail');
            expect(result).toBe('JavaScript Tutorial.md');
        });

        test('should prefer exact matches over fuzzy matches', async () => {
            mockApp.addFile('Test.md');
            mockApp.addFile('Testing Framework.md');
            
            const result = await lookupNote(mockApp as any, 'Test');
            expect(result).toBe('Test.md');
        });

        test('should return null for no matches', async () => {
            mockApp.addFile('Existing Note.md');
            
            // Use a completely different search term that won't fuzzy match
            const result = await lookupNote(mockApp as any, 'XYZ123CompletelyDifferent');
            expect(result).toBeNull();
        });

        test('should return null for empty search', async () => {
            mockApp.addFile('Some Note.md');
            
            const result1 = await lookupNote(mockApp as any, '');
            const result2 = await lookupNote(mockApp as any, '   ');
            
            expect(result1).toBeNull();
            expect(result2).toBeNull();
        });

        test('should handle special characters in filenames', async () => {
            mockApp.addFile('Notes-with-dashes.md');
            mockApp.addFile('Notes_with_underscores.md');
            mockApp.addFile('Notes with spaces.md');
            
            const result1 = await lookupNote(mockApp as any, 'Notes with dashes');
            const result2 = await lookupNote(mockApp as any, 'Notes with underscores');
            const result3 = await lookupNote(mockApp as any, 'Notes with spaces');
            
            expect(result1).toBe('Notes-with-dashes.md');
            expect(result2).toBe('Notes_with_underscores.md');
            expect(result3).toBe('Notes with spaces.md');
        });

        test('should handle word boundary matching', async () => {
            mockApp.addFile('Machine Learning Basics.md');
            mockApp.addFile('Advanced Machine Learning.md');
            mockApp.addFile('Learning Resources.md');
            
            const result = await lookupNote(mockApp as any, 'Learning');
            // Should prefer the exact word match
            expect(result).toMatch(/Learning/);
        });
    });

    describe('searchNotesByContent', () => {
        test('should search in note content', async () => {
            mockApp.addFile('Note1.md', 'This contains machine learning concepts');
            mockApp.addFile('Note2.md', 'This is about cooking recipes');
            mockApp.addFile('Machine Learning Guide.md', 'Advanced ML techniques');
            
            const results = await searchNotesByContent(mockApp as any, 'machine learning', 10);
            
            expect(results.length).toBeGreaterThan(0);
            expect(results.some(file => file.name === 'Machine Learning Guide.md')).toBe(true);
        });

        test('should rank by relevance', async () => {
            mockApp.addFile('High Relevance.md', 'machine learning machine learning machine learning');
            mockApp.addFile('Low Relevance.md', 'This mentions machine learning once');
            
            const results = await searchNotesByContent(mockApp as any, 'machine learning', 10);
            
            expect(results[0].name).toBe('High Relevance.md');
        });

        test('should limit results', async () => {
            for (let i = 0; i < 20; i++) {
                mockApp.addFile(`Note${i}.md`, 'test content here');
            }
            
            const results = await searchNotesByContent(mockApp as any, 'test', 5);
            expect(results.length).toBe(5);
        });

        test('should handle header matches', async () => {
            mockApp.addFile('Header Test.md', '# Machine Learning\n\nSome content here');
            mockApp.addFile('Regular Test.md', 'Just some machine learning content');
            
            const results = await searchNotesByContent(mockApp as any, 'machine learning', 10);
            
            // Header matches should have higher relevance
            const headerNote = results.find(f => f.name === 'Header Test.md');
            const regularNote = results.find(f => f.name === 'Regular Test.md');
            
            expect(headerNote).toBeDefined();
            expect(regularNote).toBeDefined();
            
            // Header note should appear first (higher relevance)
            const headerIndex = results.indexOf(headerNote!);
            const regularIndex = results.indexOf(regularNote!);
            
            expect(headerIndex).toBeLessThan(regularIndex);
        });

        test('should handle title matches with highest priority', async () => {
            mockApp.addFile('Machine Learning.md', 'Some content about other topics');
            mockApp.addFile('Other Topic.md', 'This has machine learning machine learning machine learning in content');
            
            const results = await searchNotesByContent(mockApp as any, 'machine learning', 10);
            
            // Title match should come first despite less content matches
            expect(results[0].name).toBe('Machine Learning.md');
        });

        test('should return empty array for no matches', async () => {
            mockApp.addFile('Note1.md', 'This is about cooking');
            mockApp.addFile('Note2.md', 'This is about travel');
            
            const results = await searchNotesByContent(mockApp as any, 'programming', 10);
            expect(results).toEqual([]);
        });
    });
});