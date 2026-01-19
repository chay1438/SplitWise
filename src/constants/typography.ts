export const Typography = {
    // Top Level Headings
    h1: { fontSize: 32, fontWeight: '700' as const }, // Massive (e.g. Total Balance)
    h2: { fontSize: 24, fontWeight: '700' as const }, // Standard Page Headers
    h3: { fontSize: 20, fontWeight: '600' as const }, // Card Titles / Section Headers

    // Card & Content
    body1: { fontSize: 16, fontWeight: '400' as const }, // Primary Content (e.g. "John owes you")
    body2: { fontSize: 14, fontWeight: '400' as const }, // Secondary Content (e.g. Description)

    // UI Elements
    button: { fontSize: 16, fontWeight: '600' as const }, // Buttons
    label: { fontSize: 12, fontWeight: '600' as const, textTransform: 'uppercase' as const }, // "YOU OWE" labels
    caption: { fontSize: 12, fontWeight: '400' as const, color: '#888' }, // Timestamps, meta info
};
