/**
 * KIBOE FarmSync - Animations Module
 * Additional scroll and hover animations.
 */

(function() {
  'use strict';

  /**
   * Parallax effect on hero background
   */
  function initParallax() {
    const heroBg = document.getElementById('heroBg');
    if (!heroBg) return;

    window.addEventListener('scroll', function() {
      const scrollPos = window.scrollY;
      if (scrollPos < window.innerHeight) {
        heroBg.style.transform = 'translateY(' + scrollPos * 0.3 + 'px)';
      }
    });
  }

  /**
   * Reveal animations on scroll (fallback for browsers without AOS)
   */
  function initRevealAnimations() {
    const revealElements = document.querySelectorAll('[data-aos]');
    if (revealElements.length === 0) return;

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    revealElements.forEach(function(el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });
  }

  /**
   * Smooth reveal for feature cards on hover
   */
  function initCardHoverEffects() {
    const cards = document.querySelectorAll('.feature-card, .service-card');
    cards.forEach(function(card) {
      card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px)';
      });
      card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
      });
    });
  }

  // Initialize
  initParallax();
  initCardHoverEffects();

  // Fallback reveal if AOS doesn't load
  setTimeout(initRevealAnimations, 2000);
})();
