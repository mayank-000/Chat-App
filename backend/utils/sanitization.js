import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize message content for chat messages
 * Allows basic formatting but removes dangerous scripts
 */
export const sanitizeMessageContent = (content) => {
    if (!content || typeof content !== 'string') return '';

    return sanitizeHtml(content, {
        allowedTags: ['b', 'i', 'u', 'strong', 'em', 'p', 'br'],
        allowedAttributes: {},
        allowedSchemes: ['http', 'https', 'mailto'],
        allowProtocolRelative: false,
        enforceHtmlBoundary: true,
        textFilter: (text) => {
            return text.trim();
        }
    }).trim();
};

/**
 * Sanitize username input
 * Only allows alphanumeric characters, spaces, and basic punctuation
 */
export const sanitizeUsername = (username) => {
    if (!username || typeof username !== 'string') return '';

    return username
        .replace(/[<>'"&]/g, '') 
        .replace(/[^\w\s\-_.@]/g, '') 
        .trim()
        .substring(0, 50);
};

/**
 * Sanitize general text input (for search queries, etc.)
 */
export const sanitizeTextInput = (input) => {
    if (!input || typeof input !== 'string') return '';

    return input
        .replace(/[<>'"&]/g, '') 
        .trim()
        .substring(0, 200); 
};

/**
 * Sanitize email input (basic validation)
 */
export const sanitizeEmail = (email) => {
    if (!email || typeof email !== 'string') return '';

    // Basic email sanitization - remove dangerous chars and validate format
    const cleanEmail = email
        .replace(/[<>'"&\\]/g, '')
        .trim()
        .toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(cleanEmail) ? cleanEmail : '';
};

/**
 * Check if content contains potentially malicious patterns
 * This is a basic check - not a replacement for proper sanitization
 */
export const containsMaliciousContent = (content) => {
    if (!content || typeof content !== 'string') return false;

    const maliciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
        /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    ];

    return maliciousPatterns.some(pattern => pattern.test(content));
};