import {
    validateFileName,
    validateFileContent,
    validateFileCreation,
    validateFilePath,
    sanitizeFileName
} from '../src/actions/validation';

describe('File Validation', () => {
    describe('validateFileName', () => {
        test('should accept valid file names', () => {
            const result = validateFileName('My Note');
            expect(result.isValid).toBe(true);
            expect(result.sanitizedValue).toBe('My Note');
        });

        test('should reject empty file names', () => {
            const result = validateFileName('');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('required');
        });

        test('should reject file names with dangerous characters', () => {
            const result = validateFileName('test<script>alert()</script>');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('forbidden');
        });

        test('should reject reserved Windows names', () => {
            const result = validateFileName('CON');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('reserved names');
        });

        test('should reject hidden files', () => {
            const result = validateFileName('.hidden');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('dot');
        });

        test('should reject overly long file names', () => {
            const longName = 'a'.repeat(150);
            const result = validateFileName(longName);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('too long');
        });

        test('should detect forbidden patterns', () => {
            const result = validateFileName('test../../../etc/passwd');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('forbidden');
        });
    });

    describe('validateFileContent', () => {
        test('should accept valid content', () => {
            const content = 'This is a valid note content with normal text.';
            const result = validateFileContent(content);
            expect(result.isValid).toBe(true);
        });

        test('should reject non-string content', () => {
            const result = validateFileContent(123 as any);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('must be a string');
        });

        test('should reject content with null bytes', () => {
            const result = validateFileContent('test\x00content');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('dangerous patterns');
        });

        test('should reject overly large content', () => {
            const largeContent = 'a'.repeat(2000000); // 2MB
            const result = validateFileContent(largeContent);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('too large');
        });

        test('should reject lines that are too long', () => {
            const longLine = 'a'.repeat(15000);
            const result = validateFileContent(longLine);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('too long');
        });

        test('should detect suspicious base64 patterns', () => {
            const suspiciousContent = 'A'.repeat(600); // Simple long pattern instead of base64
            const result = validateFileContent(suspiciousContent);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('suspicious');
        });

        test('should detect script tags', () => {
            const result = validateFileContent('Hello <script>alert("xss")</script> world');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('dangerous patterns');
        });
    });

    describe('validateFileCreation', () => {
        test('should validate complete file creation', () => {
            const result = validateFileCreation('My Note', 'Valid content here');
            expect(result.isValid).toBe(true);
            expect(result.sanitizedValue).toBe('My Note.md');
        });

        test('should add .md extension if missing', () => {
            const result = validateFileCreation('Note', 'Content');
            expect(result.isValid).toBe(true);
            expect(result.sanitizedValue).toBe('Note.md');
        });

        test('should fail if title is invalid', () => {
            const result = validateFileCreation('CON', 'Valid content');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('reserved names');
        });

        test('should fail if content is invalid', () => {
            const result = validateFileCreation('Valid Title', 'content\x00with\x00nulls');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('dangerous patterns');
        });
    });

    describe('validateFilePath', () => {
        test('should accept valid relative paths', () => {
            const result = validateFilePath('folder/note.md');
            expect(result.isValid).toBe(true);
        });

        test('should reject path traversal attempts', () => {
            const result = validateFilePath('../../../etc/passwd');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('traversal');
        });

        test('should reject absolute paths', () => {
            const result = validateFilePath('/absolute/path');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('traversal');
        });

        test('should reject Windows absolute paths', () => {
            const result = validateFilePath('C:\\Windows\\System32');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('Absolute paths');
        });

        test('should reject overly long paths', () => {
            const longPath = 'a/'.repeat(200);
            const result = validateFilePath(longPath);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('too long');
        });
    });

    describe('sanitizeFileName', () => {
        test('should replace invalid characters', () => {
            const result = sanitizeFileName('test<>file|name?.txt');
            expect(result).toBe('test-file-name-.txt');
        });

        test('should remove control characters', () => {
            const result = sanitizeFileName('test\x01\x02file');
            expect(result).toBe('testfile');
        });

        test('should normalize spaces and dashes', () => {
            const result = sanitizeFileName('  test  --  file  ');
            expect(result).toBe('test - file');
        });

        test('should limit length', () => {
            const longName = 'a'.repeat(150);
            const result = sanitizeFileName(longName);
            expect(result.length).toBeLessThanOrEqual(100);
        });

        test('should handle empty input', () => {
            const result = sanitizeFileName('');
            expect(result).toBe('');
        });
    });
});