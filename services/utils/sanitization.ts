import DOMPurify from 'dompurify';

/**
 * Strips all HTML from a string and returns only the plain text content.
 * This is a safe way to display user-provided content without needing
 * to use `dangerouslySetInnerHTML`.
 * @param input The potentially unsafe string with HTML.
 * @returns A string with all HTML tags removed.
 */
export const sanitizeToText = (input: string | undefined | null): string => {
    if (!input) {
        return "";
    }
    // DOMPurify sanitizes the input, removing any malicious code.
    // We then create a temporary element to parse this sanitized HTML.
    const sanitizedHtml = DOMPurify.sanitize(input, { USE_PROFILES: { html: false } });
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitizedHtml;
    // Extracting textContent gives us the string without any HTML tags.
    return tempDiv.textContent || tempDiv.innerText || "";
};