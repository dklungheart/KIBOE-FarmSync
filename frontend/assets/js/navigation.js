/**
 * KIBOE FarmSync - Navigation Module
 * Handles sticky navbar, active link tracking, and smooth scrolling.
 */

(function() {
  'use strict';

  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  const scrollIndicator = document.getElementById('scrollIndicator');

  /**
   * Add scrolled class to navbar on scroll
   */
  function handleNavbarScroll() {
    if (window.scrollY > 50) {
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }
  }

  /**
   * Update active nav link based on scroll position
   */
  function updateActiveLink() {
    let current = '';
    const scrollPos = window.scrollY + 200;

    sections.forEach(function(section) {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;

      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(function(link) {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }

  /**
   * Smooth scroll to section
   */
  function handleNavClick(e) {
    const href = this.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Close mobile menu
      const navCollapse = document.getElementById('navMenu');
      if (navCollapse && navCollapse.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(navCollapse);
        bsCollapse.hide();
      }
    }
  }

  /**
   * Hide scroll indicator when scrolled past hero
   */
  function handleScrollIndicator() {
    if (scrollIndicator) {
      if (window.scrollY > window.innerHeight * 0.8) {
        scrollIndicator.style.opacity = '0';
      } else {
        scrollIndicator.style.opacity = '1';
      }
    }
  }

  // Event listeners
  window.addEventListener('scroll', function() {
    handleNavbarScroll();
    updateActiveLink();
    handleScrollIndicator();
  });

  navLinks.forEach(function(link) {
    link.addEventListener('click', handleNavClick);
  });
})();
