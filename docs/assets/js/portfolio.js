/**
 * Portfolio JavaScript
 * Handles dark mode, navigation, and smooth interactions
 */

(function() {
    'use strict';

    // Theme Management
    const ThemeManager = {
        STORAGE_KEY: 'portfolio-theme',

        init() {
            this.toggle = document.getElementById('theme-toggle');
            if (!this.toggle) return;

            // Load saved theme or detect system preference
            const savedTheme = localStorage.getItem(this.STORAGE_KEY);
            if (savedTheme) {
                this.setTheme(savedTheme);
            } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.setTheme('dark');
            }

            // Listen for toggle click
            this.toggle.addEventListener('click', () => this.toggleTheme());

            // Listen for system preference changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem(this.STORAGE_KEY)) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        },

        setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem(this.STORAGE_KEY, theme);
        },

        toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            this.setTheme(current === 'light' ? 'dark' : 'light');
        }
    };

    // Navigation Management
    const NavManager = {
        init() {
            this.nav = document.getElementById('nav');
            this.toggle = document.getElementById('nav-toggle');
            this.menu = document.getElementById('nav-menu');

            if (!this.nav) return;

            // Mobile menu toggle
            if (this.toggle && this.menu) {
                this.toggle.addEventListener('click', () => this.toggleMenu());

                // Close menu on link click
                this.menu.querySelectorAll('.nav-link').forEach(link => {
                    link.addEventListener('click', () => this.closeMenu());
                });

                // Close menu on outside click
                document.addEventListener('click', (e) => {
                    if (!this.nav.contains(e.target)) {
                        this.closeMenu();
                    }
                });
            }

            // Scroll behavior
            this.handleScroll();
            window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        },

        toggleMenu() {
            this.menu.classList.toggle('active');
            this.toggle.classList.toggle('active');
        },

        closeMenu() {
            this.menu.classList.remove('active');
            this.toggle.classList.remove('active');
        },

        handleScroll() {
            if (window.scrollY > 50) {
                this.nav.classList.add('scrolled');
            } else {
                this.nav.classList.remove('scrolled');
            }
        }
    };

    // Smooth Scroll for anchor links
    const SmoothScroll = {
        init() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    const href = anchor.getAttribute('href');
                    if (href === '#') return;

                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        }
    };

    // Intersection Observer for animations
    const AnimationObserver = {
        init() {
            if (!('IntersectionObserver' in window)) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            document.querySelectorAll('.cv-item, .experience-card, .publication-card, .timeline-item, .quick-link-card').forEach(el => {
                el.classList.add('animate-on-scroll');
                observer.observe(el);
            });
        }
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        ThemeManager.init();
        NavManager.init();
        SmoothScroll.init();
        AnimationObserver.init();
    });

    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        .animate-on-scroll {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .animate-on-scroll.visible {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
})();
