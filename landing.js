/**
 * VehicleFlow Landing Page - JavaScript
 * Handles interactions, animations, and form submissions
 */

// ============================================
// NAVIGATION - Sticky Header (with Throttle)
// ============================================
// 🚀 PERF: Throttled scroll handler (100ms) - prevents 60 events/sec
let scrollThrottleTimeout = null;
const nav = document.getElementById('navigation');

window.addEventListener('scroll', () => {
    if (scrollThrottleTimeout) return;
    scrollThrottleTimeout = setTimeout(() => {
        scrollThrottleTimeout = null;
        if (nav) {
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        }
    }, 100);
}, { passive: true });

// ============================================
// MOBILE MENU - Toggle
// ============================================
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('active');

    // Prevent body scroll when menu is open
    if (menu.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

// ============================================
// SMOOTH SCROLL - Navigation Links
// ============================================
function scrollToDemo() {
    document.getElementById('contact').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function scrollToFeatures() {
    document.getElementById('features').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// ============================================
// SCROLL REVEAL ANIMATION
// ============================================
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

revealElements.forEach(el => {
    revealObserver.observe(el);
});

// ============================================
// FAQ - Accordion Toggle
// ============================================
function toggleFAQ(button) {
    const faqItem = button.parentElement;
    const isActive = faqItem.classList.contains('active');

    // Close all FAQ items
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });

    // Open clicked item if it wasn't active
    if (!isActive) {
        faqItem.classList.add('active');
    }

    // Re-render feather icons
    feather.replace();
}

// ============================================
// DEMO FORM - Submission Handler
// ============================================
function handleDemoForm(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        company: formData.get('company')
    };

    // Show success message
    alert(`Vielen Dank, ${data.name}! Wir melden uns in Kürze bei Ihnen.`);

    // Reset form
    event.target.reset();

    // TODO: Send data to backend/email service
    // Example: 
    // fetch('/api/demo-request', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(data)
    // });
}

// ============================================
// KEYBOARD NAVIGATION
// ============================================
document.addEventListener('keydown', (e) => {
    // Close mobile menu on ESC
    if (e.key === 'Escape') {
        const menu = document.getElementById('mobileMenu');
        if (menu.classList.contains('active')) {
            toggleMobileMenu();
        }

        // Close active FAQ
        document.querySelectorAll('.faq-item.active').forEach(item => {
            item.classList.remove('active');
        });
    }
});

// ============================================
// INITIALIZE - On Page Load
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Trigger scroll reveal for elements already in viewport
    setTimeout(() => {
        const viewportElements = document.querySelectorAll('.reveal');
        viewportElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                el.classList.add('visible');
            }
        });
    }, 100);

    // Initialize Counter Animation
    initCounters();
});

// ============================================
// COUNTER ANIMATION
// ============================================
function initCounters() {
    const stats = document.querySelectorAll('.stat-item strong');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const value = target.innerText;

                // Check if already animated
                if (target.dataset.animated) return;

                // Parse value (handle <, +, etc)
                let endValue = 0;
                let prefix = '';
                let suffix = '';

                if (value.includes('<')) { prefix = '<'; endValue = parseInt(value.replace('<', '')); }
                else if (value.includes('+')) { suffix = '+'; endValue = parseInt(value.replace('+', '')); }
                else { endValue = parseInt(value); }

                animateValue(target, 0, endValue, 2000, prefix, suffix);
                target.dataset.animated = "true";
                observer.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => observer.observe(stat));
}

function animateValue(obj, start, end, duration, prefix = '', suffix = '') {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);

        // Easing function (easeOutExpo)
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        const current = Math.floor(easeProgress * (end - start) + start);
        obj.innerHTML = `${prefix}${current}${suffix}`;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            // Ensure final value is exact
            obj.innerHTML = `${prefix}${end}${suffix}`;
        }
    };
    window.requestAnimationFrame(step);
}

// ============================================
// PERFORMANCE - Lazy Load Images (if needed)
// ============================================
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            }
        });
    });

    // Observe lazy images
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ============================================
// ANALYTICS - Track Button Clicks (Optional)
// ============================================
function trackEvent(category, action, label) {
    // TODO: Integrate with Google Analytics or similar
    // if (typeof ga !== 'undefined') {
    //     ga('send', 'event', category, action, label);
    // }
}

// Track CTA clicks
document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', () => {
        const text = btn.textContent.trim();
        trackEvent('CTA', 'Click', text);
    });
});
