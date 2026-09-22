/* ===================================================================
   KIBOE FarmSync - Homepage Module
   Navbar, scroll reveal, live stats, marketplace/agrovet/events/
   contractors previews, and contact form. Uses real API data only.
   =================================================================== */
(function () {
  'use strict';

  /* ---------------- Helpers ---------------- */
  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.substring(0, n - 1).trim() + '…' : s;
  }

  function imgUrl(p) {
    if (!p) return '';
    var path = p.image_url || p.poster_url || '';
    if (!path) return '';
    return (path.indexOf('http') === 0 ? path : API.BASE_URL + path);
  }

  /* ---------------- Navbar ---------------- */
  function initNav() {
    var nav = document.getElementById('siteNav');
    var toggle = document.getElementById('navToggle');
    var closeBtn = document.getElementById('navClose');
    var links = document.getElementById('navLinks');
    var backdrop = document.getElementById('navBackdrop');

    function onScroll() {
      if (window.scrollY > 40) nav.classList.add('navbar-scrolled');
      else nav.classList.remove('navbar-scrolled');
      updateActiveLink();
    }

    function openMenu() {
      if (!links) return;
      links.classList.add('open');
      if (backdrop) backdrop.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      if (!links) return;
      links.classList.remove('open');
      if (backdrop) backdrop.classList.remove('show');
      document.body.style.overflow = '';
    }

    if (toggle) toggle.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (backdrop) backdrop.addEventListener('click', closeMenu);

    var sections = document.querySelectorAll('section[id], header[id]');
    var navLinks = document.querySelectorAll('.nav-links > li > a.nav-link');
    function updateActiveLink() {
      var pos = window.scrollY + 140;
      var current = '';
      sections.forEach(function (s) {
        if (pos >= s.offsetTop && pos < s.offsetTop + s.offsetHeight) current = s.getAttribute('id');
      });
      navLinks.forEach(function (l) {
        l.classList.toggle('active', l.getAttribute('href') === '#' + current);
      });
    }

    navLinks.forEach(function (l) {
      l.addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (href && href.charAt(0) === '#') {
          e.preventDefault();
          closeMenu();
          var target = document.querySelector(href);
          if (target) {
            var top = target.getBoundingClientRect().top + window.scrollY - 70;
            window.scrollTo({ top: top, behavior: 'smooth' });
          }
        }
      });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    updateActiveLink();
  }

  /* ---------------- Auth-aware navbar ---------------- */
  function initAuthNav() {
    if (!API.isAuthenticated()) return;
    var login = document.getElementById('navLogin');
    if (login) {
      login.innerHTML = '<i class="fas fa-th-large"></i> Dashboard';
      login.href = 'dashboard.html';
    }
    var cta = document.getElementById('navCta');
    if (cta) {
      cta.innerHTML = '<i class="fas fa-plus-circle"></i> Manage My Farm';
      cta.href = 'dashboard.html';
    }
    document.querySelectorAll('[data-browse]').forEach(function (a) {
      a.href = 'dashboard.html';
    });
  }

  /* ---------------- Scroll reveal ---------------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Counters ---------------- */
  function animateNumber(el, target) {
    if (!el) return;
    var value = 0;
    var duration = 1200;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      el.textContent = Math.round(target * (0.2 + 0.8 * p)).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(step);
  }

  /* ---------------- Live stats ---------------- */
  function loadStats() {
    var tasks = [
      { id: 'statListings', fetch: function () {
        return API.getListings({ limit: 1 }).then(function (d) { return (d.data.pagination || {}).total || 0; });
      }},
      { id: 'statKnowledge', fetch: function () {
        return Promise.all([
          API.getAgrovetArticles({ limit: 1 }),
          API.getAgrovetCropDiseases({ limit: 1 }),
          API.getAgrovetLivestockDiseases({ limit: 1 }),
          API.getAgrovetGuides({ limit: 1 })
        ]).then(function (rs) {
          var sum = 0;
          rs.forEach(function (d) { sum += (d.data.total || 0); });
          return sum;
        });
      }},
      { id: 'statEvents', fetch: function () {
        return API.getEvents({ limit: 1 }).then(function (d) { return (d.data.pagination || {}).total || 0; });
      }},
      { id: 'statContractors', fetch: function () {
        return API.getContractors({ limit: 1 }).then(function (d) { return (d.data.pagination || {}).total || 0; });
      }}
    ];
    tasks.forEach(function (t) {
      t.fetch().then(function (n) {
        animateNumber(document.getElementById(t.id), n || 0);
      }).catch(function () {
        var el = document.getElementById(t.id);
        if (el) el.textContent = '0';
      });
    });
  }

  /* ---------------- Preview cards ---------------- */
  function emptyState(container, icon, text) {
    if (!container) return;
    container.innerHTML = '<div class="empty-box"><i class="fas ' + icon + '"></i><p>' + text + '</p><div class="eb-sub">New items appear here as they are published.</div></div>';
  }

  function renderMarketplace() {
    var grid = document.getElementById('mpPreview');
    if (!grid) return;
    API.getListings({ limit: 3, sort: 'latest' }).then(function (d) {
      var items = (d.data.products || []).slice(0, 3);
      if (!items.length) { emptyState(grid, 'fa-store', 'No marketplace listings yet.'); return; }
      grid.innerHTML = '';
      items.forEach(function (p) {
        var img = imgUrl((p.images || [])[0]) || 'https://via.placeholder.com/400x300/F0F9F0/1D7A42?text=Farm+Produce';
        var card = document.createElement('article');
        card.className = 'preview-card';
        card.innerHTML =
          '<div class="pc-img" style="background-image:url(\'' + img + '\');"><span class="pc-badge">' + esc(p.category) + '</span></div>' +
          '<div class="pc-body">' +
          '<h3 class="pc-title">' + esc(p.title) + '</h3>' +
          '<div class="pc-price">KSh ' + (+p.price || 0).toLocaleString() + '</div>' +
          '<div class="pc-meta"><i class="fas fa-map-marker-alt"></i> ' + esc(p.county || 'Kenya') + '</div>' +
          '<div class="pc-meta"><i class="fas fa-box"></i> ' + esc(p.quantity || 0) + ' ' + esc(p.quantity_unit || 'units') + '</div>' +
          '</div>' +
          '<a href="login.html" class="pc-link">View Listing <i class="fas fa-arrow-right"></i></a>';
        grid.appendChild(card);
      });
    }).catch(function () { emptyState(grid, 'fa-store', 'Marketplace is unavailable right now.'); });
  }

  function renderAgrovet() {
    var grid = document.getElementById('agvPreview');
    if (!grid) return;
    function drawArticles() {
      API.getAgrovetArticles({ limit: 3 }).then(function (d) {
        var items = (d.data.articles || []).slice(0, 3);
        if (!items.length) { drawGuides(); return; }
        draw(items, 'Article');
      }).catch(drawGuides);
    }
    function drawGuides() {
      API.getAgrovetGuides({ limit: 3 }).then(function (d) {
        var items = (d.data.guides || []).slice(0, 3);
        if (!items.length) { emptyState(grid, 'fa-book-open', 'No knowledge centre articles yet.'); return; }
        draw(items, 'Guide');
      }).catch(function () { emptyState(grid, 'fa-book-open', 'Knowledge centre is unavailable right now.'); });
    }
    function draw(items, kind) {
      grid.innerHTML = '';
      items.forEach(function (a) {
        var img = imgUrl(a) || 'https://via.placeholder.com/400x300/FBF0D8/C98A12?text=Agrovet';
        var card = document.createElement('article');
        card.className = 'preview-card';
        card.innerHTML =
          '<div class="pc-img" style="background-image:url(\'' + img + '\');"><span class="pc-badge">' + esc(kind) + '</span></div>' +
          '<div class="pc-body">' +
          '<h3 class="pc-title">' + esc(a.title) + '</h3>' +
          '<div class="pc-meta"><i class="fas fa-tag"></i> ' + esc(a.category || 'General') + '</div>' +
          '<p class="pc-snippet">' + esc(truncate(a.content, 110)) + '</p>' +
          '</div>' +
          '<a href="login.html" class="pc-link">Read More <i class="fas fa-arrow-right"></i></a>';
        grid.appendChild(card);
      });
    }
    drawArticles();
  }

  function renderEvents() {
    var grid = document.getElementById('evPreview');
    if (!grid) return;
    API.getEvents({ limit: 3, date: 'upcoming', sort: 'latest' }).then(function (d) {
      var items = (d.data.events || []).slice(0, 3);
      if (!items.length) { emptyState(grid, 'fa-calendar-check', 'No upcoming events yet.'); return; }
      grid.innerHTML = '';
      items.forEach(function (e) {
        var dt = e.event_date ? new Date(e.event_date + 'T00:00:00') : null;
        var day = dt ? dt.getDate() : '–';
        var mon = dt ? dt.toLocaleString('en', { month: 'short' }) : '';
        var img = imgUrl(e) || 'https://via.placeholder.com/400x300/F0F9F0/1D7A42?text=Farm+Event';
        var card = document.createElement('article');
        card.className = 'preview-card';
        card.innerHTML =
          '<div class="pc-img" style="background-image:url(\'' + img + '\');">' +
          '<div class="ev-date-block"><div class="evd-d">' + day + '</div><div class="evd-m">' + mon + '</div></div>' +
          '</div>' +
          '<div class="pc-body">' +
          '<h3 class="pc-title">' + esc(e.title) + '</h3>' +
          '<div class="pc-meta"><i class="fas fa-map-marker-alt"></i> ' + esc(e.venue || e.county || 'Kenya') + '</div>' +
          '<p class="pc-snippet">' + esc(truncate(e.description, 110)) + '</p>' +
          '</div>' +
          '<a href="login.html" class="pc-link">Event Details <i class="fas fa-arrow-right"></i></a>';
        grid.appendChild(card);
      });
    }).catch(function () { emptyState(grid, 'fa-calendar-check', 'Events are unavailable right now.'); });
  }

  function renderContractors() {
    var grid = document.getElementById('ctPreview');
    if (!grid) return;
    API.getContractors({ limit: 3, sort: 'latest' }).then(function (d) {
      var items = (d.data.contractors || []).slice(0, 3);
      if (!items.length) { emptyState(grid, 'fa-user-tie', 'No contractors listed yet.'); return; }
      grid.innerHTML = '';
      items.forEach(function (c) {
        var services = String(c.services || '').split(',').filter(Boolean).slice(0, 3);
        var card = document.createElement('article');
        card.className = 'preview-card';
        var tags = services.map(function (s) { return '<span class="service-tag">' + esc(s.trim()) + '</span>'; }).join('');
        card.innerHTML =
          '<div class="pc-body">' +
          '<h3 class="pc-title">' + esc(c.business_name) + '</h3>' +
          '<div class="pc-meta"><i class="fas fa-map-marker-alt"></i> ' + esc(c.county || 'Kenya') + (c.years_experience ? ' · ' + c.years_experience + ' yrs' : '') + '</div>' +
          '<p class="pc-snippet">' + esc(truncate(c.description, 110)) + '</p>' +
          '<div class="ct-services">' + tags + '</div>' +
          '</div>' +
          '<a href="login.html" class="pc-link">View Profile <i class="fas fa-arrow-right"></i></a>';
        grid.appendChild(card);
      });
    }).catch(function () { emptyState(grid, 'fa-user-tie', 'Contractors are unavailable right now.'); });
  }

  /* ---------------- Contact form ---------------- */
  function initContact() {
    var form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('contactBtn');
      var status = document.getElementById('contactStatus');
      var name = document.getElementById('cfName').value.trim();
      var email = document.getElementById('cfEmail').value.trim();
      var phone = document.getElementById('cfPhone').value.trim();
      var message = document.getElementById('cfMessage').value.trim();
      if (!name || !email || !message) { setStatus(status, 'Please fill in your name, email and message.', 'error'); return; }
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      setStatus(status, '', '');
      API.sendContact({ name: name, email: email, phone: phone, message: message })
        .then(function () {
          form.reset();
          btn.innerHTML = '<i class="fas fa-check"></i> Message Sent';
          setStatus(status, 'Thanks for reaching out — we will get back to you soon.', 'success');
        })
        .catch(function (err) {
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
          setStatus(status, err.message || 'Could not send your message. Please try again.', 'error');
        })
        .finally(function () {
          btn.disabled = false;
          setTimeout(function () { btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message'; }, 3000);
        });
    });
  }

  function setStatus(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = type === 'error' ? '#E0454F' : type === 'success' ? '#1D7A42' : 'var(--muted)';
  }

  /* ---------------- Init ---------------- */
  function init() {
    initNav();
    initAuthNav();
    initReveal();
    loadStats();
    renderMarketplace();
    renderAgrovet();
    renderEvents();
    renderContractors();
    initContact();
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
