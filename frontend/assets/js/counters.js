/**
 * KIBOE FarmSync - Animated Counters Module
 * Animates number counters when they come into view.
 */

(function() {
  'use strict';

  const counters = document.querySelectorAll('.counter');
  let countersAnimated = false;

  /**
   * Animate a single counter from 0 to target
   */
  function animateCounter(counter) {
    const target = parseInt(counter.getAttribute('data-target'), 10);
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    function update() {
      step++;
      current = Math.min(current + increment, target);
      counter.textContent = Math.round(current);

      if (step < steps) {
        requestAnimationFrame(update);
      } else {
        counter.textContent = target;
      }
    }

    update();
  }

  /**
   * Check if counters section is in viewport and animate
   */
  function checkCounters() {
    if (countersAnimated) return;

    const statsSection = document.querySelector('.statistics-section');
    if (!statsSection) return;

    const rect = statsSection.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

    if (isVisible) {
      countersAnimated = true;
      counters.forEach(function(counter) {
        animateCounter(counter);
      });
    }
  }

  window.addEventListener('scroll', checkCounters);
  window.addEventListener('load', checkCounters);
})();
