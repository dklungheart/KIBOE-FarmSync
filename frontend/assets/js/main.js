/**
 * KIBOE FarmSync - Main Application Entry
 * Initializes all modules and handles form submissions.
 */

(function() {
  'use strict';

  /**
   * Handle contact form submission
   */
  function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

       form.addEventListener('submit', async function(e) {
      e.preventDefault();

      const btn = form.querySelector('.contact-btn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>Sending...</span>';
      btn.disabled = true;


      try {
      const inputs = form.querySelectorAll('input, textarea');
      const msg = {
        name: inputs[0].value,
        email: inputs[1].value,
        phone: inputs[2].value,
        message: inputs[3].value
      };
      await API.sendContact(msg);
        btn.innerHTML = '<span>Message Sent!</span>';
        form.reset();
    } catch (err) {
      btn.innerHTML = '<span>Failed - Try Again</span>';
      btn.style.background = 'linear-gradient(135deg, #ff4757, #ff6b81)';
    }
        btn.style.background = 'linear-gradient(135deg, #49D43F, #7BC300)';

        setTimeout(function() {
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.style.background = '';
    }, 2000);
  });
  }

  /**
   * Handle newsletter form submission
   */
  function initNewsletterForm() {
    const form = document.querySelector('.newsletter-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const input = form.querySelector('input');
      const btn = form.querySelector('.newsletter-btn');

      if (input && input.value.trim()) {
        btn.innerHTML = '<span>Subscribed!</span>';
        setTimeout(function() {
          btn.innerHTML = '<span>Subscribe</span>';
          input.value = '';
        }, 2000);
      }
    });
  }

  /**
   * Swap the navbar Sign In button for a Dashboard + Sign Out when signed in.
   */
  function initAuthNav() {
    const signInLi = document.querySelector('#navMenu li .nav-btn');
    if (!signInLi) return;
    const li = signInLi.closest('li');
    if (!li) return;

    const signedIn = !!localStorage.getItem('kiboe_token');
    if (!signedIn) return;

    li.innerHTML = '<a href="dashboard.html" class="nav-btn"><i class="fas fa-th-large"></i> Dashboard</a>';

    const signOutLi = document.createElement('li');
    signOutLi.className = 'nav-item';
    signOutLi.innerHTML = '<a href="#" id="navSignOut" class="nav-link"><i class="fas fa-sign-out-alt"></i> Sign Out</a>';
    li.after(signOutLi);

    signOutLi.querySelector('#navSignOut').addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.removeItem('kiboe_token');
      window.location.href = 'index.html';
    });
  }

  /**
   * Add fade-in animation class
   */
  function initPageTransitions() {
    const style = document.createElement('style');
    style.textContent = `
      .fade-in {
        animation: pageFadeIn 0.8s ease forwards;
      }
      @keyframes pageFadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize on DOM ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initContactForm();
    initNewsletterForm();
    initAuthNav();
    initPageTransitions();
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      initContactForm();
      initNewsletterForm();
      initAuthNav();
      initPageTransitions();
    });
  }
})();
