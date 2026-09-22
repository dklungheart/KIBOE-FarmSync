/**
 * KIBOE FarmSync - Dashboard Module
 * Handles sidebar toggle and dashboard-specific charts.
 */

(function() {
  'use strict';

  /**
   * Toggle sidebar on mobile
   */
  function initSidebar() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('dashSidebar');

    if (!toggleBtn || !sidebar) return;

    toggleBtn.addEventListener('click', function() {
      sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', function(e) {
      if (window.innerWidth <= 991) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });
  }

  /**
   * Dashboard profit chart
   */
  function initDashProfitChart() {
    const canvas = document.getElementById('dashProfitChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(123, 195, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(123, 195, 0, 0)');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Revenue',
          data: [450, 520, 480, 620, 580, 720, 680, 800, 750, 890, 840, 950],
          borderColor: '#7BC300',
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#7BC300',
          pointBorderColor: '#1A1D24',
          pointBorderWidth: 2,
          pointRadius: 4
        }, {
          label: 'Expenses',
          data: [300, 280, 310, 290, 270, 320, 300, 350, 310, 360, 340, 370],
          borderColor: '#FF6384',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          borderDash: [5, 5],
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#A8A8A8', font: { size: 11 }, usePointStyle: true }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#A8A8A8', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#A8A8A8', font: { size: 10 } }
          }
        }
      }
    });
  }

  /**
   * Dashboard crop distribution doughnut
   */
  function initDashCropChart() {
    const canvas = document.getElementById('dashCropChart');
    if (!canvas) return;

    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Maize', 'Wheat', 'Vegetables', 'Fruits', 'Coffee'],
        datasets: [{
          data: [35, 25, 20, 12, 8],
          backgroundColor: ['#7BC300', '#49D43F', '#36A2EB', '#FFCE56', '#FF6384'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#A8A8A8', font: { size: 11 }, padding: 16, usePointStyle: true }
          }
        }
      }
    });
  }

  // Initialize AOS on dashboard
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 600, once: true });
  }

  // Initialize all dashboard features
  initSidebar();
  initDashProfitChart();
  initDashCropChart();
})();
