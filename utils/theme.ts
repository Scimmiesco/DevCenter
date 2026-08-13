// Basic color conversion types and utilities

interface HSL {
    h: number;
    s: number;
    l: number;
}

export interface ThemeColors {
    primary: string;
    primaryHover: string;
    primaryDark: string;
    accent: string;
    accentHover: string;
    accentLight: string;
    surface: string;
    surfaceMuted: string;
}

// Helper: Hex to HSL
const hexToHSL = (hex: string): HSL => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    }

    r /= 255;
    g /= 255;
    b /= 255;

    const cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin;
    let h = 0,
        s = 0,
        l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    return { h, s: s * 100, l: l * 100 };
};

// Helper: HSL to Hex
const hslToHex = ({ h, s, l }: HSL): string => {
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
        m = l - c / 2,
        r = 0,
        g = 0,
        b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    const toHex = (n: number) => {
        const hex = n.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    return "#" + toHex(r) + toHex(g) + toHex(b);
};

// Generate Colors
export const generateTheme = (baseHex: string): ThemeColors => {
    const hsl = hexToHSL(baseHex);

    // Primary: Base
    const primary = baseHex;

    // Primary Hover: Slightly Darker
    const primaryHover = hslToHex({ ...hsl, l: Math.max(0, hsl.l - 10) });

    // Primary Dark: Very Dark (for borders/backgrounds)
    const primaryDark = hslToHex({ ...hsl, s: Math.max(0, hsl.s - 10), l: Math.max(0, hsl.l - 20) });


    // Accent: Complementary (180deg)
    // Ensure it's vibrant (S > 50, L ~ 50)
    const accentH = (hsl.h + 240) % 360;
    const accent = hslToHex({ h: accentH, s: 80, l: 55 }); // Force vibrant accent

    // Accent Hover: Darker
    const accentHover = hslToHex({ h: accentH, s: 80, l: 60 });

    // Accent Light: Very light for text (L > 90)
    const accentLight = hslToHex({ h: accentH, s: 70, l: 95 });


    // Surface: Tinted with Primary, Very Dark
    // L = 5-8%, S = 20%
    const surface = hslToHex({ h: hsl.h, s: 40, l: 5 });

    // Surface Muted: Slightly Lighter Surface with opacity (simulated or Hex with Alpha if needed, but we'll use Hex and let CSS handle opacity if separate, OR just a solid muted color)
    // Existing CSS uses #17382f33 (Hex + Alpha).
    // We'll generate a solid dark color to stand in for "Muted" or just return the base color and let CSS add alpha?
    // The CSS uses: --surface-muted: #17382f33;
    // Let's provide a solid backup or the hex.
    // We can return a Hex with Alpha if we want.
    // Let's return a solid color that looks like it:
    // L = 10-15%
    const surfaceMuted = hslToHex({ h: hsl.h, s: 35, l: 20 });


    return {
        primary,
        primaryHover,
        primaryDark,
        accent,
        accentHover,
        accentLight,
        surface,
        surfaceMuted
    };
};

export const applyTheme = (theme: ThemeColors) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-hover', theme.primaryHover);
    root.style.setProperty('--primary-dark', theme.primaryDark);

    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-hover', theme.accentHover);
    root.style.setProperty('--accent-light', theme.accentLight);

    root.style.setProperty('--surface', theme.surface);
    // Surface Muted in CSS currently uses alpha: #17382f33
    // We can try to approximate or use rgba.
    // Let's just set a solid color for now or try to append alpha if it's 6 chars.
    if (theme.surfaceMuted.length === 7) {
        root.style.setProperty('--surface-muted', theme.surfaceMuted + "33"); // Add ~20% opacity
    } else {
        root.style.setProperty('--surface-muted', theme.surfaceMuted);
    }
};
