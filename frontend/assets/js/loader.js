/**
 * KIBOE FarmSync - Welcome/Loader Screen Module
 * Handles the welcome screen, typing animation, and transition to homepage.
 */

(function() {
  'use strict';

  const welcomeScreen = document.getElementById('welcomeScreen');
  const mainContent = document.getElementById('mainContent');
  const enterBtn = document.getElementById('enterBtn');
  const titleEl = document.getElementById('welcomeTitle');
  const taglineEl = document.getElementById('welcomeTagline');

  const fullTitle = 'KIBOE FarmSync';
  const taglines = [
    'Smart Farming Management System',
    'Track · Predict · Grow',
    'Agriculture Meets Technology'
  ];
  let charIndex = 0;
  let taglineIndex = 0;
  let isDeleting = false;

  /**
   * Typing animation for the main title
   */
  function typeTitle() {
    if (charIndex <= fullTitle.length) {
      titleEl.textContent = fullTitle.substring(0, charIndex);
      charIndex++;
      setTimeout(typeTitle, 80);
    } else {
      setTimeout(typeTagline, 500);
    }
  }

  /**
   * Typing animation for rotating taglines
   */
  function typeTagline() {
    const currentTagline = taglines[taglineIndex];

    if (!isDeleting) {
      if (charIndex <= fullTitle.length + currentTagline.length) {
        const tagCharIndex = charIndex - fullTitle.length - 1;
        if (tagCharIndex >= 0 && tagCharIndex <= currentTagline.length) {
          taglineEl.textContent = currentTagline.substring(0, tagCharIndex);
        }
        charIndex++;
        setTimeout(typeTagline, 40);
      } else {
        isDeleting = true;
        setTimeout(typeTagline, 2000);
      }
    } else {
      if (charIndex > fullTitle.length + 1) {
        const tagCharIndex = charIndex - fullTitle.length - 2;
        if (tagCharIndex >= 0) {
          taglineEl.textContent = currentTagline.substring(0, tagCharIndex);
        }
        charIndex--;
        setTimeout(typeTagline, 20);
      } else {
        isDeleting = false;
        taglineIndex = (taglineIndex + 1) % taglines.length;
        setTimeout(typeTagline, 500);
      }
    }
  }

  /**
   * Show the Continue button after 3 seconds
   */
  function showContinueButton() {
    setTimeout(function() {
      enterBtn.classList.add('visible');
    }, 3000);
  }

  /**
   * Transition from welcome screen to homepage
   */
  function enterSite() {
    welcomeScreen.classList.add('fade-out');
    setTimeout(function() {
      welcomeScreen.style.display = 'none';
      mainContent.classList.remove('d-none');
      mainContent.classList.add('fade-in');
      document.body.style.overflow = 'auto';

      // Initialize AOS after transition
      if (typeof AOS !== 'undefined') {
        AOS.init({
          duration: 800,
          offset: 100,
          once: true,
          easing: 'ease-out-cubic'
        });
      }
    }, 800);
  }

  // Initialize
  document.body.style.overflow = 'hidden';
  typeTitle();
  showContinueButton();

  if (enterBtn) {
    enterBtn.addEventListener('click', enterSite);
  }
})();
