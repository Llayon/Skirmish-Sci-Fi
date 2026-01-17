/**
 * Validates a name string based on predefined rules.
 * @param name The name to validate.
 * @returns An object with `isValid` and an optional `reason` for failure.
 */
export const validateName = (name: string): { isValid: boolean; reason?: string } => {
    if (name.length < 1 || name.length > 30) {
        return { isValid: false, reason: 'Name must be between 1 and 30 characters.' };
    }
    if (!/^[a-zA-Z0-9\s-]+$/.test(name)) {
        return { isValid: false, reason: 'Name can only contain letters, numbers, spaces, and hyphens.' };
    }
    // Future enhancement: Add a check for forbidden words/patterns.
    return { isValid: true };
};
