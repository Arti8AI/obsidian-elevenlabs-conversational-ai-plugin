export interface ValidationResult {
    isValid: boolean;
    errorMessage: string;
    sanitizedValue?: string;
}

export interface FileValidationOptions {
    maxTitleLength?: number;
    maxContentLength?: number;
    allowedExtensions?: string[];
    forbiddenPatterns?: string[];
}

const DEFAULT_OPTIONS: Required<FileValidationOptions> = {
    maxTitleLength: 100,
    maxContentLength: 1000000, // 1MB of text
    allowedExtensions: ['md', 'txt'],
    forbiddenPatterns: [
        '../',
        '../',
        '\\.\\.',
        '<script',
        'javascript:',
        'data:',
        'file://',
        'ftp://',
        '\\x00', // null bytes
    ]
};

/**
 * Validates and sanitizes a file title/name
 */
export function validateFileName(title: string, options: FileValidationOptions = {}): ValidationResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Check if title is provided
    if (!title || typeof title !== 'string') {
        return {
            isValid: false,
            errorMessage: "File name is required and must be a string"
        };
    }
    
    // Trim whitespace
    const trimmedTitle = title.trim();
    
    // Check if empty after trimming
    if (trimmedTitle.length === 0) {
        return {
            isValid: false,
            errorMessage: "File name cannot be empty"
        };
    }
    
    // Check length
    if (trimmedTitle.length > opts.maxTitleLength) {
        return {
            isValid: false,
            errorMessage: `File name too long. Maximum ${opts.maxTitleLength} characters allowed`
        };
    }
    
    // Check for forbidden patterns
    for (const pattern of opts.forbiddenPatterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(trimmedTitle)) {
            return {
                isValid: false,
                errorMessage: "File name contains forbidden characters or patterns"
            };
        }
    }
    
    // Check for dangerous file system characters
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(trimmedTitle)) {
        return {
            isValid: false,
            errorMessage: "File name contains invalid characters"
        };
    }
    
    // Check for reserved Windows file names
    const reservedNames = [
        'CON', 'PRN', 'AUX', 'NUL',
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    
    const upperTitle = trimmedTitle.toUpperCase();
    if (reservedNames.includes(upperTitle) || reservedNames.some(name => upperTitle.startsWith(name + '.'))) {
        return {
            isValid: false,
            errorMessage: "File name conflicts with system reserved names"
        };
    }
    
    // Check for hidden files (starting with dot)
    if (trimmedTitle.startsWith('.')) {
        return {
            isValid: false,
            errorMessage: "File name cannot start with a dot (hidden files not allowed)"
        };
    }
    
    // Sanitize the title
    const sanitized = sanitizeFileName(trimmedTitle);
    
    return {
        isValid: true,
        errorMessage: "",
        sanitizedValue: sanitized
    };
}

/**
 * Validates file content for security and size limits
 */
export function validateFileContent(content: string, options: FileValidationOptions = {}): ValidationResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Check if content is a string
    if (typeof content !== 'string') {
        return {
            isValid: false,
            errorMessage: "Content must be a string"
        };
    }
    
    // Check content length
    if (content.length > opts.maxContentLength) {
        return {
            isValid: false,
            errorMessage: `Content too large. Maximum ${Math.round(opts.maxContentLength / 1000)}KB allowed`
        };
    }
    
    // Check for forbidden patterns in content
    for (const pattern of opts.forbiddenPatterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(content)) {
            return {
                isValid: false,
                errorMessage: "Content contains potentially dangerous patterns"
            };
        }
    }
    
    // Check for null bytes
    if (content.includes('\x00')) {
        return {
            isValid: false,
            errorMessage: "Content contains null bytes"
        };
    }
    
    // Check for excessively long lines (potential attack vector)
    const lines = content.split('\n');
    const maxLineLength = 10000;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].length > maxLineLength) {
            return {
                isValid: false,
                errorMessage: `Line ${i + 1} is too long (max ${maxLineLength} characters per line)`
            };
        }
    }
    
    // Check for suspicious base64-like patterns (potential embedded content)
    const suspiciousBase64 = /[A-Za-z0-9+/]{500,}/;
    if (suspiciousBase64.test(content)) {
        return {
            isValid: false,
            errorMessage: "Content contains suspicious encoded patterns"
        };
    }
    
    return {
        isValid: true,
        errorMessage: "",
        sanitizedValue: content
    };
}

/**
 * Sanitizes a file name by removing/replacing problematic characters
 */
export function sanitizeFileName(fileName: string): string {
    return fileName
        // Replace invalid filesystem characters with safe alternatives
        .replace(/[<>:"/\\|?*]/g, '-')
        // Replace control characters
        .replace(/[\x00-\x1f]/g, '')
        // Replace multiple spaces/dashes with single ones
        .replace(/\s+/g, ' ')
        .replace(/-+/g, '-')
        // Remove leading/trailing spaces and dashes
        .replace(/^[\s-]+|[\s-]+$/g, '')
        // Limit length
        .slice(0, 100);
}

/**
 * Validates file extension
 */
export function validateFileExtension(fileName: string, options: FileValidationOptions = {}): ValidationResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    if (!fileName || typeof fileName !== 'string') {
        return {
            isValid: false,
            errorMessage: "File name is required"
        };
    }
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (!extension) {
        return {
            isValid: false,
            errorMessage: "File must have an extension"
        };
    }
    
    if (!opts.allowedExtensions.includes(extension)) {
        return {
            isValid: false,
            errorMessage: `File extension '.${extension}' not allowed. Allowed: ${opts.allowedExtensions.join(', ')}`
        };
    }
    
    return {
        isValid: true,
        errorMessage: ""
    };
}

/**
 * Comprehensive validation for file creation
 */
export function validateFileCreation(title: string, content: string, options: FileValidationOptions = {}): ValidationResult {
    // Validate title
    const titleValidation = validateFileName(title, options);
    if (!titleValidation.isValid) {
        return titleValidation;
    }
    
    // Validate content
    const contentValidation = validateFileContent(content, options);
    if (!contentValidation.isValid) {
        return contentValidation;
    }
    
    // Validate extension (add .md if not present)
    let finalFileName = titleValidation.sanitizedValue!;
    if (!finalFileName.endsWith('.md')) {
        finalFileName += '.md';
    }
    
    const extensionValidation = validateFileExtension(finalFileName, options);
    if (!extensionValidation.isValid) {
        return extensionValidation;
    }
    
    return {
        isValid: true,
        errorMessage: "",
        sanitizedValue: finalFileName
    };
}

/**
 * Security-focused path validation
 */
export function validateFilePath(path: string): ValidationResult {
    if (!path || typeof path !== 'string') {
        return {
            isValid: false,
            errorMessage: "Path is required"
        };
    }
    
    // Check for path traversal attempts
    if (path.includes('..') || path.includes('./') || path.startsWith('/')) {
        return {
            isValid: false,
            errorMessage: "Path traversal not allowed"
        };
    }
    
    // Check for absolute paths
    if (path.match(/^[a-zA-Z]:\\/)) {
        return {
            isValid: false,
            errorMessage: "Absolute paths not allowed"
        };
    }
    
    // Check path length
    if (path.length > 260) { // Windows MAX_PATH limit
        return {
            isValid: false,
            errorMessage: "Path too long"
        };
    }
    
    return {
        isValid: true,
        errorMessage: ""
    };
}