/**
 * SCORALIA UI UTILITIES v2.0
 * Premium animations, toast notifications, and micro-interactions
 */

// ==========================================================================
// TOAST NOTIFICATION SYSTEM
// ==========================================================================

const Toast = {
    container: null,
    
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },
    
    show(options = {}) {
        this.init();
        
        const {
            type = 'info', // success, error, warning, info
            title = '',
            message = '',
            duration = 4000,
            icon = null
        } = options;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '<i class="fas fa-check"></i>',
            error: '<i class="fas fa-times"></i>',
            warning: '<i class="fas fa-exclamation"></i>',
            info: '<i class="fas fa-info"></i>'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">${icon || icons[type]}</div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" aria-label="Close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.container.appendChild(toast);
        
        // Close button handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.hide(toast));
        
        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.hide(toast), duration);
        }
        
        return toast;
    },
    
    hide(toast) {
        if (!toast) return;
        
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    },
    
    success(message, title = 'Success') {
        return this.show({ type: 'success', title, message });
    },
    
    error(message, title = 'Error') {
        return this.show({ type: 'error', title, message });
    },
    
    warning(message, title = 'Warning') {
        return this.show({ type: 'warning', title, message });
    },
    
    info(message, title = 'Info') {
        return this.show({ type: 'info', title, message });
    }
};

// Expose to window
window.Toast = Toast;

// Replace alert() with Toast for better UX
const originalAlert = window.alert;
window.alert = (message) => {
    Toast.info(message);
};

// ==========================================================================
// SCROLL REVEAL ANIMATIONS
// ==========================================================================

const ScrollReveal = {
    observer: null,
    elements: [],
    
    init() {
        // Check if IntersectionObserver is supported
        if (!('IntersectionObserver' in window)) {
            // Fallback: just add active class to all elements
            document.querySelectorAll('.reveal').forEach(el => {
                el.classList.add('active');
            });
            return;
        }
        
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                        // Optionally unobserve after revealing
                        // this.observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            }
        );
        
        // Observe all reveal elements
        this.observeAll();
    },
    
    observeAll() {
        const elements = document.querySelectorAll('.reveal');
        elements.forEach(el => this.observer.observe(el));
    },
    
    observe(element) {
        if (this.observer && element) {
            this.observer.observe(element);
        }
    },
    
    unobserve(element) {
        if (this.observer && element) {
            this.observer.unobserve(element);
        }
    },
    
    refresh() {
        // Re-scan for new reveal elements
        this.observeAll();
    }
};

window.ScrollReveal = ScrollReveal;

// ==========================================================================
// PAGE TRANSITION EFFECTS
// ==========================================================================

const PageTransition = {
    init() {
        // Add page-enter animation to body on load
        document.body.classList.add('page-enter');
        
        // Smooth fade for internal links
        this.setupLinkTransitions();
    },
    
    setupLinkTransitions() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="/"]');
            if (!link || link.target === '_blank' || link.download) return;
            
            // Don't interfere with special navigation
            if (link.closest('.no-transition') || link.classList.contains('no-transition')) return;
            
            // Let default behavior happen (navigation)
            // The next page will have page-enter animation
        });
    },
    
    fadeIn(callback) {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.2s ease';
        
        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
            if (callback) {
                setTimeout(callback, 200);
            }
        });
    }
};

window.PageTransition = PageTransition;

// ==========================================================================
// PARALLAX EFFECTS
// ==========================================================================

const Parallax = {
    elements: [],
    ticking: false,
    
    init() {
        this.elements = document.querySelectorAll('[data-parallax]');
        
        if (this.elements.length === 0) return;
        
        window.addEventListener('scroll', () => this.onScroll(), { passive: true });
        window.addEventListener('resize', () => this.onResize());
        
        this.onScroll();
    },
    
    onScroll() {
        if (this.ticking) return;
        
        this.ticking = true;
        requestAnimationFrame(() => {
            this.update();
            this.ticking = false;
        });
    },
    
    onResize() {
        this.elements = document.querySelectorAll('[data-parallax]');
    },
    
    update() {
        const scrollTop = window.pageYOffset;
        
        this.elements.forEach(el => {
            const speed = parseFloat(el.dataset.parallax) || 0.5;
            const offset = el.offsetTop;
            const yPos = (scrollTop - offset) * speed;
            
            el.style.transform = `translateY(${yPos}px)`;
        });
    }
};

window.Parallax = Parallax;

// ==========================================================================
// LAZY IMAGE LOADING
// ==========================================================================

const LazyLoad = {
    observer: null,
    
    init() {
        if (!('IntersectionObserver' in window)) {
            // Fallback: load all images immediately
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
                img.classList.add('loaded');
            });
            return;
        }
        
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.observer.unobserve(entry.target);
                    }
                });
            },
            {
                rootMargin: '50px 0px',
                threshold: 0.01
            }
        );
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            this.observer.observe(img);
        });
    },
    
    loadImage(img) {
        const src = img.dataset.src;
        if (!src) return;
        
        // Create a new image to preload
        const tempImg = new Image();
        tempImg.onload = () => {
            img.src = src;
            img.classList.add('loaded');
        };
        tempImg.src = src;
    }
};

window.LazyLoad = LazyLoad;

// ==========================================================================
// RIPPLE EFFECT FOR BUTTONS
// ==========================================================================

const Ripple = {
    init() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.ripple, .btn');
            if (!button) return;
            
            this.createRipple(button, e);
        });
    },
    
    createRipple(button, event) {
        // Remove existing ripples
        const existing = button.querySelector('.ripple-effect');
        if (existing) existing.remove();
        
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple-animation 0.6s ease-out;
            pointer-events: none;
        `;
        
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 400);
    }
};

// Add ripple animation if not exists
if (!document.getElementById('ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'ripple-styles';
    style.textContent = `
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

window.Ripple = Ripple;

// ==========================================================================
// COUNTER ANIMATION
// ==========================================================================


const Counter = {
    animate(element, end, duration = 1200, prefix = '', suffix = '') {
        const start = 0;
        const startTime = performance.now();
        
        const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
        
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);
            
            const current = Math.round(start + (end - start) * easedProgress);
            
            // Format number with commas
            const formatted = current.toLocaleString();
            element.textContent = prefix + formatted + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };
        
        requestAnimationFrame(update);
    },
    
    init() {
        // Find all elements with data-counter attribute
        const counters = document.querySelectorAll('[data-counter]');
        
        if (counters.length === 0) return;
        
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        const end = parseInt(el.dataset.counter, 10);
                        const prefix = el.dataset.prefix || '';
                        const suffix = el.dataset.suffix || '';
                        
                        this.animate(el, end, 2000, prefix, suffix);
                        observer.unobserve(el);
                    }
                });
            },
            { threshold: 0.5 }
        );
        
        counters.forEach(el => observer.observe(el));
    }
};

window.Counter = Counter;

// ==========================================================================
// SMOOTH SCROLL TO ELEMENT
// ==========================================================================

const SmoothScroll = {
    to(element, options = {}) {
        if (!element) return;
        
        const {
            offset = 0,
            duration = 800,
            easing = 'easeInOutCubic'
        } = options;
        
        const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        
        let startTime = null;
        
        const easingFunctions = {
            easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
            easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
            linear: (t) => t
        };
        
        const ease = easingFunctions[easing] || easingFunctions.easeInOutCubic;
        
        const animation = (currentTime) => {
            if (startTime === null) startTime = currentTime;
            
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const easedProgress = ease(progress);
            
            window.scrollTo(0, startPosition + distance * easedProgress);
            
            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            }
        };
        
        requestAnimationFrame(animation);
    }
};

window.SmoothScroll = SmoothScroll;

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all UI utilities
    Toast.init();
    ScrollReveal.init();
    PageTransition.init();
    Parallax.init();
    LazyLoad.init();
    Ripple.init();
    Counter.init();
    
    // Add fade-in class to main content
    const mainContent = document.querySelector('main, .main-wrap, body > div:not([class*="modal"])');
    if (mainContent) {
        mainContent.classList.add('fade-transition');
    }
});

// Export for module usage
export { Toast, ScrollReveal, PageTransition, Parallax, LazyLoad, Ripple, Counter, SmoothScroll };
