/**
 * KIBOE FarmSync - Charts Module
 * Renders dashboard preview charts using Chart.js.
 */

(function() {
  'use strict';

  /**
   * Profit / Revenue Line Chart
   */
  function initProfitChart() {
    const canvas = document.getElementById('profitChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(123, 195, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(123, 195, 0, 0)');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Profit (KSh)',
          data: [120, 190, 170, 250, 220, 310, 280, 360, 340, 410, 380, 450],
          borderColor: '#7BC300',
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#7BC300',
          pointBorderColor: '#0F1115',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#A8A8A8', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#A8A8A8', font: { size: 10 } }
          }
        }
      }
    });
  }

  /**
   * Crop Distribution Doughnut Chart
   */
  function initCropChart() {
    const canvas = document.getElementById('cropChart');
    if (!canvas) return;

    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Maize', 'Wheat', 'Vegetables', 'Fruits', 'Others'],
        datasets: [{
          data: [35, 25, 20, 12, 8],
          backgroundColor: ['#7BC300', '#49D43F', '#36A2EB', '#FFCE56', '#FF6384'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#A8A8A8', font: { size: 10 }, padding: 12 }
          }
        }
      }
    });
  }

  /**
   * Livestock Pie Chart
   */
  function initLivestockChart() {
    const canvas = document.getElementById('livestockChart');
    if (!canvas) return;

    new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Cows', 'Goats', 'Sheep', 'Chicken', 'Others'],
        datasets: [{
          data: [40, 20, 15, 18, 7],
          backgroundColor: ['#7BC300', '#49D43F', '#36A2EB', '#FFCE56', '#FF6384'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#A8A8A8', font: { size: 10 }, padding: 12 }
          }
        }
      }
    });
  }

  // Initialize charts when DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initProfitChart();
    initCropChart();
    initLivestockChart();
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      initProfitChart();
      initCropChart();
      initLivestockChart();
    });
  }
})();
