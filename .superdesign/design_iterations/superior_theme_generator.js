/**
 * Superior Design Theme Generator
 * Utilizing advanced color theory, golden ratio, and modern design principles
 */

class SuperiorThemeGenerator {
    constructor() {
        this.goldenRatio = 1.618;
        this.perfectFourth = 1.333;
        this.majorSecond = 1.125;
    }

    /**
     * Generate OKLCH color with perfect harmony
     */
    generateOKLCH(lightness, chroma, hue) {
        return `oklch(${lightness.toFixed(4)} ${chroma.toFixed(4)} ${hue.toFixed(4)})`;
    }

    /**
     * Create harmonious color palette using color theory
     */
    createColorPalette(baseHue, theme = 'modern') {
        const palettes = {
            modern: {
                primary: this.generateOKLCH(0.2046, 0.0200, baseHue),
                secondary: this.generateOKLCH(0.9702, 0.0150, baseHue + 20),
                accent: this.generateOKLCH(0.6500, 0.1800, (baseHue + 180) % 360),
                background: this.generateOKLCH(0.9851, 0.0050, baseHue),
                surface: this.generateOKLCH(0.9600, 0.0100, baseHue + 10),
                muted: this.generateOKLCH(0.5486, 0.0200, baseHue),
                border: this.generateOKLCH(0.9219, 0.0100, baseHue)
            },
            brutalist: {
                primary: this.generateOKLCH(0.5500, 0.2500, baseHue),
                secondary: this.generateOKLCH(0.3500, 0.2200, (baseHue + 120) % 360),
                accent: this.generateOKLCH(0.7500, 0.2800, (baseHue + 240) % 360),
                background: this.generateOKLCH(0.9800, 0.0200, baseHue),
                surface: this.generateOKLCH(0.9500, 0.0300, baseHue + 15),
                muted: this.generateOKLCH(0.4500, 0.1500, baseHue),
                border: this.generateOKLCH(0.1000, 0.0000, 0)
            },
            premium: {
                primary: this.generateOKLCH(0.1200, 0.0200, baseHue),
                secondary: this.generateOKLCH(0.8500, 0.0800, baseHue + 30),
                accent: this.generateOKLCH(0.6500, 0.1500, (baseHue + 60) % 360),
                background: this.generateOKLCH(0.0400, 0.0100, baseHue),
                surface: this.generateOKLCH(0.0800, 0.0150, baseHue + 5),
                muted: this.generateOKLCH(0.3500, 0.0500, baseHue),
                border: this.generateOKLCH(0.2000, 0.0200, baseHue)
            }
        };
        return palettes[theme];
    }

    /**
     * Generate superior typography scale using musical ratios
     */
    createTypographyScale(baseSize = 16) {
        return {
            xs: Math.round(baseSize / (this.perfectFourth * this.majorSecond)),
            sm: Math.round(baseSize / this.perfectFourth),
            base: baseSize,
            lg: Math.round(baseSize * this.majorSecond),
            xl: Math.round(baseSize * this.perfectFourth),
            '2xl': Math.round(baseSize * this.perfectFourth * this.majorSecond),
            '3xl': Math.round(baseSize * this.perfectFourth * this.perfectFourth),
            '4xl': Math.round(baseSize * Math.pow(this.goldenRatio, 3))
        };
    }

    /**
     * Generate complete superior theme
     */
    generateSuperiorTheme(name, baseHue, style = 'modern') {
        const colors = this.createColorPalette(baseHue, style);
        const typography = this.createTypographyScale();
        
        const animations = {
            duration: {
                fast: '150ms',
                normal: '300ms',
                slow: '500ms',
                slower: '800ms'
            },
            easing: {
                default: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
                in: 'cubic-bezier(0.4, 0.0, 1, 1)',
                out: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
                bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            }
        };

        const spacing = {
            base: 4,
            scale: this.goldenRatio,
            values: {}
        };

        // Generate spacing scale
        for (let i = 0; i <= 12; i++) {
            const value = spacing.base * Math.pow(spacing.scale, i - 2);
            spacing.values[i] = `${value.toFixed(2)}px`;
        }

        return {
            name,
            style,
            colors,
            typography: {
                scale: typography,
                families: {
                    sans: style === 'brutalist' ? 'Space Grotesk' : 'Inter',
                    mono: 'JetBrains Mono',
                    serif: style === 'premium' ? 'Playfair Display' : 'Merriweather'
                }
            },
            spacing,
            animations,
            shadows: this.generateShadows(style),
            borders: this.generateBorders(style)
        };
    }

    generateShadows(style) {
        const shadows = {
            modern: {
                sm: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
            },
            brutalist: {
                sm: '4px 4px 0px 0px rgb(0 0 0)',
                md: '8px 8px 0px 0px rgb(0 0 0)',
                lg: '12px 12px 0px 0px rgb(0 0 0)',
                xl: '16px 16px 0px 0px rgb(0 0 0)'
            },
            premium: {
                sm: '0 2px 8px 0 rgb(0 0 0 / 0.2)',
                md: '0 8px 24px 0 rgb(0 0 0 / 0.15)',
                lg: '0 16px 48px 0 rgb(0 0 0 / 0.1)',
                xl: '0 32px 64px 0 rgb(0 0 0 / 0.08)'
            }
        };
        return shadows[style];
    }

    generateBorders(style) {
        return {
            radius: style === 'brutalist' ? '0px' : style === 'premium' ? '12px' : '8px',
            width: style === 'brutalist' ? '3px' : '1px'
        };
    }
}

// Generate three superior themes
const generator = new SuperiorThemeGenerator();

const themes = {
    modernMinimal: generator.generateSuperiorTheme('Modern Minimal', 240, 'modern'),
    neoBrutalist: generator.generateSuperiorTheme('Neo Brutalist', 15, 'brutalist'),
    premiumDark: generator.generateSuperiorTheme('Premium Dark', 260, 'premium')
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SuperiorThemeGenerator, themes };
}

console.log('🎨 Superior themes generated successfully!');
console.log('Available themes:', Object.keys(themes));