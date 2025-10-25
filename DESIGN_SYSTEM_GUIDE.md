# 🎨 DESIGN-SYSTEM GUIDE
## Fahrzeugannahme-App - Apple Liquid Glass Dark Mode

**Version:** 3.3 (Dark Mode & Mobile Optimierungen)
**Vorbild:** index.html (1976 Zeilen)
**Erstellt:** 25.10.2025
**Zweck:** Komponenten-Bibliothek für konsistentes Redesign aller 8 Seiten

---

## 📚 INHALTSVERZEICHNIS

1. [Design-Tokens (120+ CSS Variables)](#design-tokens)
2. [Komponenten-Bibliothek](#komponenten-bibliothek)
3. [GSAP Animationen](#gsap-animationen)
4. [Dark Mode Implementation](#dark-mode-implementation)
5. [Mobile-First Patterns](#mobile-first-patterns)
6. [Verwendung in anderen Seiten](#verwendung-in-anderen-seiten)

---

## 1. DESIGN-TOKENS

### CSS-Import Reihenfolge (KRITISCH!)

```html
<!-- 1. Google Fonts (ZUERST) -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

<!-- 2. Design System (CSS Custom Properties) -->
<link rel="stylesheet" href="design-system.css">

<!-- 3. Components (nutzt Design System Variables) -->
<link rel="stylesheet" href="components.css">

<!-- 4. Animations (optional) -->
<link rel="stylesheet" href="animations.css">

<!-- 5. Mobile-First (optional) -->
<link rel="stylesheet" href="mobile-first.css">
```

### Farbpalette

#### Light Mode (Default)
```css
/* Backgrounds */
--color-background: #f5f5f7;           /* Apple Gray */
--color-surface: rgba(255, 255, 255, 0.98); /* Fast opak */

/* Primary Colors */
--color-primary: #007aff;              /* Apple Blue */
--color-primary-hover: #0051d5;

/* Text */
--color-text-primary: #000000;         /* PURE BLACK */
--color-text-secondary: rgba(0, 0, 0, 0.75);
--color-text-tertiary: rgba(0, 0, 0, 0.6);

/* Borders */
--color-border: rgba(0, 0, 0, 0.2);
--color-border-glass: rgba(0, 0, 0, 0.25);

/* Semantic */
--color-success: #34c759;
--color-warning: #ff9500;
--color-error: #ff3b30;
--color-info: #007aff;
```

#### Dark Mode
```css
/* Backgrounds */
--color-background: radial-gradient(circle at 20% 15%, #1b1c1e 0%, #0b0b0c 100%);
--color-surface: rgba(255, 255, 255, 0.1);

/* Primary Colors */
--color-primary: #2ec8ff;              /* Premium Cyan */
--color-primary-hover: #4dd4ff;

/* Text */
--color-text-primary: rgba(255, 255, 255, 0.9);
--color-text-secondary: rgba(255, 255, 255, 0.6);
--color-text-tertiary: rgba(255, 255, 255, 0.4);

/* Borders */
--color-border: rgba(255, 255, 255, 0.18);
--color-border-glass: rgba(255, 255, 255, 0.25);

/* Semantic */
--color-success: #32d74b;
--color-warning: #ff9f0a;
--color-error: #ff453a;
```

### Typography

```css
/* Font Families */
--font-system: 'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;

/* Font Sizes (Type Scale) */
--font-size-xs: 0.75rem;      /* 12px */
--font-size-sm: 0.875rem;     /* 14px */
--font-size-base: 1rem;       /* 16px */
--font-size-lg: 1.125rem;     /* 18px */
--font-size-xl: 1.25rem;      /* 20px */
--font-size-2xl: 1.5rem;      /* 24px */
--font-size-3xl: 1.875rem;    /* 30px */
--font-size-4xl: 2.25rem;     /* 36px */

/* Font Weights */
--font-weight-light: 300;
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line Heights */
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

### Spacing (4px Base Unit)

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Shadows

```css
/* Light Mode */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.08);
--shadow-sm: 0 2px 8px 0 rgba(0, 0, 0, 0.12);
--shadow-md: 0 4px 20px 0 rgba(0, 0, 0, 0.14);
--shadow-lg: 0 8px 32px 0 rgba(0, 0, 0, 0.16);
--shadow-xl: 0 12px 48px 0 rgba(0, 0, 0, 0.18);
--shadow-2xl: 0 20px 60px 0 rgba(0, 0, 0, 0.22);

/* Dark Mode */
--shadow-lg: 0 8px 24px 0 rgba(0, 0, 0, 0.6);
--shadow-xl: 0 12px 40px 0 rgba(0, 0, 0, 0.7);
```

### Glassmorphism

```css
/* Blur Levels */
--glass-blur: 15px;              /* Light Mode */
--glass-blur-strong: 28px;
--glass-blur-card: 25px;         /* Dark Mode Cards */
--glass-blur-nav: 12px;          /* Navigation */

/* Opacity */
--glass-opacity: 0.85;           /* Light Mode */
--glass-opacity: 0.1;            /* Dark Mode */

/* Saturation */
--glass-saturation: 180%;
```

### Border Radius

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-2xl: 24px;
--radius-3xl: 32px;
--radius-full: 9999px;
```

### Z-Index

```css
--z-base: 0;
--z-dropdown: 1000;
--z-sticky: 1020;
--z-fixed: 1030;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-popover: 1060;
--z-tooltip: 1070;
```

### Timing Functions

```css
/* Duration */
--duration-fast: 150ms;
--duration-base: 250ms;
--duration-slow: 500ms;

/* Easing (Apple-Style) */
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);      /* Apple-Schwung! */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

/* Theme Transition */
--theme-transition: 0.4s;
```

---

## 2. KOMPONENTEN-BIBLIOTHEK

### 2.1 Hero Section

**Aus:** index.html Zeilen 1305-1309

```html
<div class="hero">
    <h1 class="hero__title">Fahrzeugannahme-App</h1>
    <p class="hero__subtitle">Fahrzeuge erfassen in unter 2 Minuten</p>
    <div class="hero__version">Version 2.0 - Premium Dark Glass Edition</div>
</div>
```

**CSS:**
```css
.hero {
    max-width: 1200px;
    margin: 0 auto var(--space-12);
    text-align: center;
}

.hero__title {
    font-size: clamp(48px, 7vw, 72px);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1;
    margin-bottom: var(--space-6);

    /* Gradient with Light Reflex */
    background: linear-gradient(135deg, #fff 0%, #00bfff 50%, #66d9ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.hero__subtitle {
    font-size: var(--font-size-lg);
    color: rgba(255,255,255,0.7);
    font-weight: var(--font-weight-regular);
    line-height: 1.6;
}

.hero__version {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-5);
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(25px) saturate(var(--glass-saturation));
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-full);
    box-shadow:
        inset 0 1px 1px rgba(255,255,255,0.2),
        0 8px 32px rgba(0,0,0,0.35);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-primary);
}
```

---

### 2.2 Hero Cards (Premium Glass Cards)

**Aus:** index.html Zeilen 1326-1352

```html
<div class="hero-cards-grid">
    <div class="hero-card hero-card--primary">
        <!-- Shine Overlay -->
        <div class="shine-overlay"></div>

        <div class="hero-card__header">
            <i data-feather="truck"></i>
            <h3>Fahrzeug-Management</h3>
            <span class="badge badge--count">0 offen</span>
        </div>

        <p class="hero-card__desc">Erfassen, übergeben & verwalten</p>

        <div class="hero-card__actions">
            <a href="annahme.html" class="quick-link">
                <i data-feather="file-plus"></i>
                <span>Annahme</span>
            </a>
            <a href="abnahme.html" class="quick-link">
                <i data-feather="check-circle"></i>
                <span>Abnahme</span>
            </a>
        </div>
    </div>
</div>
```

**CSS:** (components.css Zeilen 600-731)
```css
.hero-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--space-8);
    margin-bottom: var(--space-16);
}

.hero-card {
    padding: var(--space-10);
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(var(--glass-blur-card)) saturate(var(--glass-saturation));
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-2xl);
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.25),
        0 8px 24px rgba(0,0,0,0.4);
    transition: all var(--duration-base) var(--ease-out);
    position: relative;
    overflow: hidden;
    cursor: pointer;
}

/* Warmer Lichtreflex (oben) */
.hero-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 35%;
    background: linear-gradient(
        to bottom,
        rgba(255, 225, 200, 0.1),
        transparent
    );
    border-radius: inherit;
    pointer-events: none;
}

/* Soft-Glare-Highlight (Top-Line) */
.hero-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
        to right,
        transparent,
        rgba(255,255,255,0.5) 50%,
        transparent
    );
    opacity: 0.8;
}

.hero-card:hover {
    transform: translateY(-4px) scale(1.01);
    box-shadow:
        inset 0 1px 1px rgba(255,255,255,0.25),
        0 0 40px rgba(0,191,255,0.3),
        0 12px 40px rgba(0,0,0,0.45);
}

/* Shine Overlay for Click Animation */
.shine-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.4) 50%,
        transparent 100%
    );
    transform: translateX(-100%);
    pointer-events: none;
    z-index: 10;
}
```

---

### 2.3 Quick Links (Small Icon Buttons)

**Aus:** components.css Zeilen 737-765

```html
<a href="annahme.html" class="quick-link">
    <i data-feather="file-plus"></i>
    <span>Annahme</span>
</a>
```

**CSS:**
```css
.quick-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    min-height: 48px;
    min-width: 48px;
    background: rgba(0, 191, 255, 0.08);
    border: 1px solid rgba(0, 191, 255, 0.2);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: rgba(255,255,255,0.8);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    transition: all var(--duration-base) var(--ease-out);
}

.quick-link:hover {
    background: rgba(0, 191, 255, 0.15);
    border-color: var(--color-primary);
    color: var(--color-primary);
    transform: scale(1.05);
}
```

---

### 2.4 Welcome Banner

**Aus:** index.html Zeilen 1314-1322

```html
<div class="welcome-banner">
    <div class="welcome-banner__icon">
        <i data-feather="zap"></i>
    </div>
    <div class="welcome-banner__content">
        <h2>Willkommen im Dashboard</h2>
        <p>Verwalten Sie Fahrzeuge, Kunden und Partner-Anfragen professionell und effizient</p>
    </div>
</div>
```

**CSS:** (components.css Zeilen 826-890)

---

### 2.5 Badges (Status Indicators)

**Aus:** index.html Zeile 1334

```html
<span class="badge badge--count">0 offen</span>
<span class="badge badge--warning">0 in Arbeit</span>
<span class="badge badge--info">0 Anfragen</span>
<span class="badge badge--success">Aktiv</span>
```

**CSS:** (components.css Zeilen 391-440)
```css
.badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-3);
    background: var(--color-surface);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--color-border-glass);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.badge--count {
    background: rgba(0, 191, 255, 0.2);
    color: var(--color-primary);
    border-color: rgba(0, 191, 255, 0.4);
}

.badge--success {
    background: rgba(40, 205, 65, 0.1);
    color: var(--color-success);
    border-color: rgba(40, 205, 65, 0.3);
}

.badge--warning {
    background: rgba(255, 149, 0, 0.1);
    color: var(--color-warning);
    border-color: rgba(255, 149, 0, 0.3);
}

.badge--info {
    background: rgba(0, 113, 227, 0.1);
    color: var(--color-info);
    border-color: rgba(0, 113, 227, 0.3);
}
```

---

### 2.6 Bottom Navigation (Mobile)

**Aus:** index.html Zeilen 1478-1495

```html
<nav class="bottom-nav">
    <a href="index.html" class="bottom-nav__item bottom-nav__item--active">
        <i data-feather="home"></i>
        <span>Home</span>
    </a>
    <a href="annahme.html" class="bottom-nav__item">
        <i data-feather="file-plus"></i>
        <span>Annahme</span>
    </a>
    <a href="liste.html" class="bottom-nav__item">
        <i data-feather="list"></i>
        <span>Übersicht</span>
    </a>
    <a href="kanban.html" class="bottom-nav__item">
        <i data-feather="trello"></i>
        <span>Kanban</span>
    </a>
</nav>
```

**CSS:** (components.css Zeilen 973-1073)

---

### 2.7 Theme Toggle Button

**Aus:** index.html Zeilen 1283-1286

```html
<button id="themeToggle" class="theme-toggle" aria-label="Toggle Light/Dark Mode">
    <i data-feather="sun" class="theme-toggle__icon theme-toggle__icon--light"></i>
    <i data-feather="moon" class="theme-toggle__icon theme-toggle__icon--dark"></i>
</button>
```

**CSS:** (components.css Zeilen 1079-1152)
```css
.theme-toggle {
    position: fixed;
    top: var(--space-4);
    right: var(--space-4);
    z-index: 10000;
    width: 56px;
    height: 56px;
    border-radius: var(--radius-full);
    background: var(--color-surface);
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
    border: 1px solid var(--color-border-glass);
    box-shadow: var(--shadow-lg), inset 0 1px 1px rgba(255,255,255,0.1);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.theme-toggle:hover {
    transform: scale(1.1) rotate(15deg);
    box-shadow: var(--shadow-xl);
}

.theme-toggle__icon {
    position: absolute;
    width: 24px;
    height: 24px;
    color: var(--color-text-primary);
    transition: opacity 0.3s ease, transform 0.3s ease;
}

/* Dark Mode: Show sun icon */
[data-theme="dark"] .theme-toggle__icon--light {
    opacity: 1;
    transform: rotate(0deg) scale(1);
}

[data-theme="dark"] .theme-toggle__icon--dark {
    opacity: 0;
    transform: rotate(180deg) scale(0);
}

/* Light Mode: Show moon icon */
[data-theme="light"] .theme-toggle__icon--light {
    opacity: 0;
    transform: rotate(-180deg) scale(0);
}

[data-theme="light"] .theme-toggle__icon--dark {
    opacity: 1;
    transform: rotate(0deg) scale(1);
}
```

---

### 2.8 Mobile Header (Sticky Top)

**Aus:** index.html Zeilen 1268-1280

```html
<header class="mobile-header">
    <div class="mobile-header__logo">
        <i data-feather="zap"></i>
        <span>Fahrzeugannahme</span>
    </div>
    <div class="mobile-header__actions">
        <button class="mobile-header__icon" aria-label="Benachrichtigungen">
            <i data-feather="bell"></i>
            <span class="mobile-header__badge">3</span>
        </button>
    </div>
</header>
```

**CSS:** (components.css Zeilen 1158-1250)

---

### 2.9 Floating Action Button (FAB)

**Aus:** index.html Zeilen 1473-1475

```html
<a href="annahme.html" class="fab" aria-label="Neues Fahrzeug anlegen">
    <i data-feather="plus"></i>
</a>
```

**CSS:** (components.css Zeilen 1256-1315)
```css
.fab {
    /* Position: Zentriert über Bottom Nav (Mobile) */
    position: fixed;
    bottom: calc(80px + var(--space-4));
    left: 50%;
    transform: translateX(-50%);
    z-index: calc(var(--z-fixed) + 1);

    /* Layout */
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;

    /* Styling */
    background: var(--color-primary);
    color: white;
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-xl), 0 0 0 4px var(--color-background);

    /* Interaction */
    cursor: pointer;
    transition: all var(--duration-base) var(--ease-spring);
}

.fab:hover {
    transform: translateX(-50%) scale(1.1);
    box-shadow: var(--shadow-2xl);
}

/* Desktop: FAB rechts unten */
@media (min-width: 768px) {
    .fab {
        right: var(--space-6);
        left: auto;
        bottom: var(--space-6);
        transform: none;
    }
}
```

---

### 2.10 CTA Button (Large Call-to-Action)

**Aus:** index.html Zeilen 1411-1415

```html
<a href="annahme.html" class="btn-cta">
    <i data-feather="truck"></i>
    <span>🚗 Neues Fahrzeug anlegen</span>
    <i data-feather="arrow-right"></i>
</a>
```

**CSS:** (components.css Zeilen 781-820)

---

### 2.11 Features Section

**Aus:** index.html Zeilen 1419-1463

```html
<div class="features">
    <h3 class="features__title">Was kann diese App?</h3>
    <ul class="features__list">
        <li class="features__item">
            <i data-feather="camera"></i>
            <span>Fotos direkt mit Kamera aufnehmen</span>
        </li>
        <li class="features__item">
            <i data-feather="edit-3"></i>
            <span>Digitale Unterschrift des Kunden</span>
        </li>
        <!-- ... weitere Features ... -->
    </ul>
</div>
```

**CSS:** (components.css Zeilen 896-967)

---

### 2.12 Page Effects

#### Accent Light (Parallax Glow)

**Aus:** index.html Zeile 1289

```html
<div class="accent-light"></div>
```

**CSS:** (components.css Zeilen 1339-1360)
```css
.accent-light {
    position: fixed;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    /* Golden Glow (Light) / Cyan Glow (Dark) */
    background: radial-gradient(circle, var(--accent-light-color) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
    animation: pulse-light 8s ease-in-out infinite;
    transform: translate3d(0, 0, 0); /* GPU-Acceleration */
    will-change: transform;
}
```

#### Page Transition Overlay

**Aus:** index.html Zeile 1292

```html
<div class="page-transition-overlay"></div>
```

**CSS:** (components.css Zeilen 1322-1337)

---

## 3. GSAP ANIMATIONEN

### 3.1 Dependencies

**Aus:** index.html Zeile 34

```html
<!-- GSAP Animation Library -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
```

### 3.2 Page Transitions (Blur-Overlay)

**Aus:** index.html Zeilen 1509-1535

```javascript
function initPageTransitions() {
    const overlay = document.querySelector('.page-transition-overlay');
    const internalLinks = document.querySelectorAll('a[href]:not([href^="http"]):not([target="_blank"])');

    internalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;

            e.preventDefault();
            overlay.classList.add('active'); // Blur-Overlay einblenden

            setTimeout(() => {
                window.location.href = href;
            }, 300);
        });
    });
}
```

### 3.3 Haptic Feedback (Mobile)

**Aus:** index.html Zeilen 1540-1576

```javascript
function initHapticFeedback() {
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const canVibrate = 'vibrate' in navigator;

    if (!canVibrate || !isTouch) return;

    function vibrate(duration) {
        navigator.vibrate(duration);
    }

    // Hero-Cards: 10ms (leicht)
    document.querySelectorAll('.hero-card').forEach(card => {
        card.addEventListener('touchstart', () => vibrate(10), { passive: true });
    });

    // Buttons/CTAs: 15ms (mittel)
    document.querySelectorAll('.btn, .btn-cta').forEach(btn => {
        btn.addEventListener('touchstart', () => vibrate(15), { passive: true });
    });

    // Bottom-Nav: 8ms (sehr leicht)
    document.querySelectorAll('.bottom-nav__item').forEach(item => {
        item.addEventListener('touchstart', () => vibrate(8), { passive: true });
    });
}
```

### 3.4 Parallax Light (Scroll-Based)

**Aus:** index.html Zeilen 1581-1601

```javascript
function initParallaxLight() {
    const accentLight = document.querySelector('.accent-light');
    let ticking = false;

    function updateParallax() {
        const scrollY = window.scrollY || window.pageYOffset;
        const parallaxY = scrollY * 0.3; // 30% der Scroll-Distanz

        accentLight.style.transform = `translateY(${parallaxY}px)`;
        ticking = false;
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }, { passive: true });
}
```

### 3.5 Hero Card Animations (Pulse + Shine)

**Aus:** index.html Zeilen 1606-1653

```javascript
function initHeroCardAnimations() {
    if (typeof gsap === 'undefined') return;

    document.querySelectorAll('.hero-card').forEach(card => {
        const shineOverlay = card.querySelector('.shine-overlay');

        card.addEventListener('click', function(e) {
            if (e.target.closest('a')) return;

            // PULSE Animation (Scale)
            gsap.timeline()
                .to(card, { scale: 0.95, duration: 0.1, ease: "power2.out" })
                .to(card, { scale: 1.02, duration: 0.15, ease: "power2.out" })
                .to(card, { scale: 1, duration: 0.1, ease: "power2.out" });

            // SHINE Animation (Light Sweep)
            gsap.fromTo(shineOverlay,
                { x: '-100%' },
                { x: '100%', duration: 0.6, ease: "power2.out" }
            );
        });
    });
}
```

### 3.6 Page Load Animations

**Aus:** index.html Zeilen 1827-1895

```javascript
window.addEventListener('load', async function() {
    if (typeof gsap === 'undefined') return;

    // Fade-in body
    gsap.fromTo("body",
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: "power2.out" }
    );

    // Hero section entrance
    gsap.fromTo(".hero",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: "power2.out" }
    );

    // Stagger animation for hero cards
    gsap.fromTo(".hero-card",
        { opacity: 0, scale: 0.9, y: 30 },
        {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.15, // 150ms delay between each
            delay: 0.5,
            ease: "back.out(1.4)"
        }
    );

    // Welcome Banner entrance
    gsap.fromTo(".welcome-banner",
        { opacity: 0, scale: 0.95, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.8, delay: 0.3, ease: "back.out(1.2)" }
    );

    // Bottom nav entrance
    gsap.fromTo(".bottom-nav",
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, delay: 0.8, ease: "power2.out" }
    );
});
```

---

## 4. DARK MODE IMPLEMENTATION

### 4.1 Theme Toggle JavaScript

**Aus:** index.html Zeilen 1727-1779

```javascript
(function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    // Function to update Feather Icons stroke-width
    function updateFeatherIcons(theme) {
        const strokeWidth = theme === 'light' ? '2.5' : '2';

        document.querySelectorAll('i[data-feather]').forEach(icon => {
            const svg = icon.querySelector('svg');
            if (svg) {
                svg.querySelectorAll('*[stroke]').forEach(element => {
                    element.setAttribute('stroke-width', strokeWidth);
                });
            }
        });
    }

    // Initialize theme (default: light)
    let currentTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', currentTheme);

    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);

        // Re-initialize Feather Icons
        if (typeof feather !== 'undefined') {
            feather.replace();
            setTimeout(() => updateFeatherIcons(currentTheme), 50);
        }
    });

    // Initialize Feather Icons on load
    if (typeof feather !== 'undefined') {
        feather.replace();
        setTimeout(() => updateFeatherIcons(currentTheme), 50);
    }
})();
```

### 4.2 Light Mode Optimizations

**Aus:** components.css Zeilen 1367-1494

**KRITISCH:** Glassmorphism muss in Light Mode deaktiviert werden!

```css
/* GLASSMORPHISMUS FÜR LIGHT MODE DEAKTIVIEREN */
[data-theme="light"] .hero-card,
[data-theme="light"] .bottom-nav,
[data-theme="light"] .welcome-banner,
[data-theme="light"] .glass,
[data-theme="light"] .glass-strong {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(255, 255, 255, 1.0) !important; /* KOMPLETT OPAK! */
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12) !important;
}

/* Icons: Stärkere stroke-width für bessere Sichtbarkeit */
[data-theme="light"] i[data-feather] {
    stroke-width: 2.5;
}

/* Text: Pure Black für maximalen Kontrast */
[data-theme="light"] h1,
[data-theme="light"] h2,
[data-theme="light"] h3 {
    color: #000000;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

[data-theme="light"] p,
[data-theme="light"] span {
    color: rgba(0, 0, 0, 0.85);
}
```

---

## 5. MOBILE-FIRST PATTERNS

### 5.1 Responsive Breakpoints

```css
/* Mobile First: Start with mobile styles */

/* Small phones (320px+) */
@media (min-width: 320px) { }

/* Large phones (480px+) */
@media (min-width: 480px) { }

/* Tablets (768px+) */
@media (min-width: 768px) {
    /* Hide bottom nav on tablet+ */
    .bottom-nav {
        display: none;
    }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) { }

/* Large Desktop (1440px+) */
@media (min-width: 1440px) { }

/* Ultra-wide (1920px+) */
@media (min-width: 1920px) { }
```

### 5.2 Touch Targets

**KRITISCH:** Minimum 44px für iOS!

```css
.touch-target {
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

/* Android Standard: 48px */
.touch-target--android {
    min-width: 48px;
    min-height: 48px;
}
```

### 5.3 Safe Area Insets (iPhone Notch)

```css
.safe-area-top {
    padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
}

/* Beispiel: Bottom Navigation */
.bottom-nav {
    padding-bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
}
```

---

## 6. VERWENDUNG IN ANDEREN SEITEN

### 6.1 Minimales Setup (Beispiel: annahme.html)

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fahrzeug-Annahme | Auto-Lackierzentrum Mosbach</title>

    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- Design System -->
    <link rel="stylesheet" href="design-system.css">
    <link rel="stylesheet" href="components.css">
    <link rel="stylesheet" href="animations.css">
    <link rel="stylesheet" href="mobile-first.css">

    <!-- Feather Icons -->
    <script src="https://unpkg.com/feather-icons"></script>

    <!-- GSAP (optional) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body>
    <!-- Theme Toggle Button -->
    <button id="themeToggle" class="theme-toggle" aria-label="Toggle Light/Dark Mode">
        <i data-feather="sun" class="theme-toggle__icon theme-toggle__icon--light"></i>
        <i data-feather="moon" class="theme-toggle__icon theme-toggle__icon--dark"></i>
    </button>

    <!-- Accent Light (Parallax) -->
    <div class="accent-light"></div>

    <!-- Page Transition Overlay -->
    <div class="page-transition-overlay"></div>

    <!-- Content -->
    <div class="container">
        <!-- Your page content here -->
    </div>

    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
        <a href="index.html" class="bottom-nav__item">
            <i data-feather="home"></i>
            <span>Home</span>
        </a>
        <a href="annahme.html" class="bottom-nav__item bottom-nav__item--active">
            <i data-feather="file-plus"></i>
            <span>Annahme</span>
        </a>
        <a href="liste.html" class="bottom-nav__item">
            <i data-feather="list"></i>
            <span>Übersicht</span>
        </a>
        <a href="kanban.html" class="bottom-nav__item">
            <i data-feather="trello"></i>
            <span>Kanban</span>
        </a>
    </nav>

    <!-- Initialize Feather Icons -->
    <script>
        feather.replace();
    </script>

    <!-- Theme Toggle Script -->
    <script>
        (function initThemeToggle() {
            const themeToggle = document.getElementById('themeToggle');
            const html = document.documentElement;

            function updateFeatherIcons(theme) {
                const strokeWidth = theme === 'light' ? '2.5' : '2';
                document.querySelectorAll('i[data-feather]').forEach(icon => {
                    const svg = icon.querySelector('svg');
                    if (svg) {
                        svg.querySelectorAll('*[stroke]').forEach(element => {
                            element.setAttribute('stroke-width', strokeWidth);
                        });
                    }
                });
            }

            let currentTheme = localStorage.getItem('theme') || 'light';
            html.setAttribute('data-theme', currentTheme);

            themeToggle.addEventListener('click', () => {
                currentTheme = currentTheme === 'light' ? 'dark' : 'light';
                html.setAttribute('data-theme', currentTheme);
                localStorage.setItem('theme', currentTheme);

                if (typeof feather !== 'undefined') {
                    feather.replace();
                    setTimeout(() => updateFeatherIcons(currentTheme), 50);
                }
            });

            if (typeof feather !== 'undefined') {
                feather.replace();
                setTimeout(() => updateFeatherIcons(currentTheme), 50);
            }
        })();
    </script>
</body>
</html>
```

---

## 7. CHECKLISTE FÜR REDESIGN

### Pro Seite:

- [ ] CSS-Imports aktualisiert (design-system.css, components.css, animations.css, mobile-first.css)
- [ ] Theme Toggle Button hinzugefügt
- [ ] Accent Light (Parallax) hinzugefügt
- [ ] Page Transition Overlay hinzugefügt
- [ ] Bottom Navigation hinzugefügt
- [ ] Active State in Bottom Nav markiert
- [ ] Mobile Header hinzugefügt (optional)
- [ ] FAB hinzugefügt (optional)
- [ ] Glassmorphism auf Container angewendet
- [ ] Hero Cards Stil übernommen
- [ ] Feather Icons initialisiert
- [ ] Theme Toggle JavaScript implementiert
- [ ] Light Mode Lesbarkeit getestet
- [ ] Dark Mode Glassmorphism getestet
- [ ] Mobile Responsive (768px, 375px) getestet
- [ ] Touch-Targets min. 44px

---

## 8. BEKANNTE ISSUES & WORKAROUNDS

### Issue 1: Glassmorphism Lesbarkeit in Light Mode

**Problem:** Text auf transparenten Hintergründen schwer lesbar

**Lösung:**
```css
[data-theme="light"] .glass-container {
    backdrop-filter: none !important;
    background: rgba(255, 255, 255, 1.0) !important;
}
```

### Issue 2: Feather Icons stroke-width

**Problem:** Icons zu dünn in Light Mode

**Lösung:**
```javascript
function updateFeatherIcons(theme) {
    const strokeWidth = theme === 'light' ? '2.5' : '2';
    // ... (siehe Theme Toggle Script)
}
```

### Issue 3: Bottom Nav auf Desktop sichtbar

**Problem:** Bottom Nav sollte nur Mobile angezeigt werden

**Lösung:**
```css
@media (min-width: 768px) {
    .bottom-nav {
        display: none;
    }
}
```

---

## 9. PERFORMANCE BEST PRACTICES

1. **CSS in `<head>` laden** (blocking, aber notwendig für FOUC-Vermeidung)
2. **GSAP nur wenn nötig** (27KB gzipped)
3. **Feather Icons lazy** (erst bei DOMContentLoaded)
4. **Lazy Loading für Bilder** (`loading="lazy"`)
5. **GPU-Acceleration nutzen** (`transform: translate3d(0, 0, 0)`)
6. **will-change sparsam** (nur für Parallax)

---

**Erstellt:** 25.10.2025
**Basiert auf:** index.html (Version 2.0 - Premium Dark Glass Edition)
**Autor:** Claude Code (Dev/SEO Designer)
**Zweck:** Konsistentes Redesign aller 8 HTML-Seiten
