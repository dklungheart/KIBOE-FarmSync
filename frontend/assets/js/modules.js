/* ===================================================================
   KIBOE FarmSync - Modules: Marketplace, Agrovet Knowledge Centre,
   Events, Contractors Directory, Admin Panel
   Depends on globals from dashboard.html inline script:
   API, $, toast, showConfirm, showLoader, hideLoader, escHtml,
   openModal, closeModal, setBtnLoading, API_URL
   =================================================================== */
(function () {
  'use strict';

  if (typeof $ === 'undefined') return;

  /* ---------------- Constants ---------------- */
  var COUNTIES = ['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa',"Murang'a",'Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot'];

  var CATEGORIES = ['Produce (Crops)','Livestock','Poultry','Dairy','Seeds & Seedlings','Fertilizers & Agrochemicals','Farm Machinery & Equipment','Farm Tools','Animal Feeds','Veterinary Supplies','Greenhouses & Irrigation','Honey & Bee Products','Other'];

  /* ---------------- State ---------------- */
  var currentUser = { id: null, role: 'user' };
  var mpEditId = null, evEditId = null, ctEditId = null;
  var adminEdit = { type: null, id: null };
  var mpPendingFiles = [], ctPendingFiles = [];
  var mpPage = 1, evPage = 1, ctPage = 1;
  var agvTab = 'articles';
  var admTab = 'review';

  /* ---------------- Role helpers ---------------- */
  function isStaff() { return currentUser.role === 'admin' || currentUser.role === 'contractor'; }
  function canManageEventItem(e) {
    if (currentUser.role === 'admin') return true;
    return currentUser.role === 'contractor' && currentUser.id && String(e.created_by) === String(currentUser.id);
  }
  function canManageContractorItem(c) {
    if (currentUser.role === 'admin') return true;
    return currentUser.role === 'contractor' && currentUser.id && String(c.user_id) === String(currentUser.id);
  }

  /* ---------------- Helpers ---------------- */
  function debounce(fn, wait) {
    var t;
    return function () { var c = this, a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, wait || 400); };
  }

  function upload(method, path, formData) {
    var h = {};
    var t = API.getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return fetch(API_URL + path, { method: method, headers: h, body: formData })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.message || d.error || 'Request failed'); return d; }); });
  }

  function digitsOnly(s) { return String(s || '').replace(/[^0-9]/g, ''); }

  function fillCountySelects() {
    [['mpCounty'], ['mpCountySel'], ['evCounty'], ['ctCounty'], ['ctCountySel']].forEach(function (pair) {
      var el = $(pair[0]);
      if (!el) return;
      var current = el.value;
      el.innerHTML = '<option value="">All Counties</option>';
      if (el.id === 'mpCountySel' || el.id === 'evCounty' || el.id === 'ctCountySel') el.innerHTML = '<option value="">Select County</option>';
      COUNTIES.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c; o.textContent = c;
        if (c === current) o.selected = true;
        el.appendChild(o);
      });
    });
  }

  function fillCategorySelects() {
    [['mpCategory'], ['mpCategorySel']].forEach(function (pair) {
      var el = $(pair[0]);
      if (!el) return;
      var isToolbar = el.id === 'mpCategory';
      var current = el.value;
      el.innerHTML = isToolbar ? '<option value="">All Categories</option>' : '<option value="">-- Select --</option>';
      CATEGORIES.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c; o.textContent = c;
        if (c === current) o.selected = true;
        el.appendChild(o);
      });
    });
  }

  function renderFilePreviews(previewId, files) {
    var box = $(previewId);
    if (!box) return;
    box.innerHTML = '';
    files.forEach(function (f, i) {
      var url = URL.createObjectURL(f);
      var div = document.createElement('div');
      div.className = 'img-thumb';
      div.innerHTML = '<img src="' + url + '" alt="preview"><button type="button" class="img-remove" data-idx="' + i + '" title="Remove">&times;</button>';
      box.appendChild(div);
    });
  }

  function setupFileInput(inputId, previewId, store) {
    var inp = $(inputId);
    if (!inp) return;
    inp.onchange = function () {
      var arr = Array.prototype.slice.call(inp.files || []).slice(0, 6);
      store.length = 0;
      arr.forEach(function (f) { store.push(f); });
      renderFilePreviews(previewId, store);
    };
  }

  function bindPreviewRemoval(previewId, store) {
    var box = $(previewId);
    if (!box) return;
    box.addEventListener('click', function (e) {
      var rm = e.target.closest('.img-remove');
      if (!rm) return;
      var idx = parseInt(rm.dataset.idx, 10);
      store.splice(idx, 1);
      renderFilePreviews(previewId, store);
    });
  }

  /* ===================================================================
     MARKETPLACE
     =================================================================== */
  function loadMarketplacePage() {
    showLoader('Loading marketplace...');
    var search = $('mpSearch') ? $('mpSearch').value : '';
    var category = $('mpCategory') ? $('mpCategory').value : '';
    var county = $('mpCounty') ? $('mpCounty').value : '';
    var sort = $('mpSort') ? $('mpSort').value : 'latest';
    var q = new URLSearchParams({ search: search, category: category, county: county, sort: sort, page: mpPage, limit: 12 });
    var p = API.request('GET', '/api/marketplace?' + q);
    var mine = API.getToken() ? API.request('GET', '/api/marketplace/mine/listings') : Promise.resolve({ data: { products: [], stats: {} } });
    Promise.all([p, mine]).then(function (res) {
      var data = (res[0].data || {});
      var products = data.products || [];
      var pag = data.pagination || { total: 0 };
      var stats = (res[1].data || {}).stats || {};
      $('mpCount').textContent = pag.total + ' listings';
      $('mpMyTotal').textContent = stats.total || 0;
      $('mpMyApproved').textContent = stats.approved || 0;
      $('mpMyPending').textContent = stats.pending || 0;
      $('mpMySold').textContent = stats.sold || 0;
      renderMarketplaceGrid(products);
      renderMpPagination(pag.total);
    }).catch(function (err) {
      toast(err.message, 'error');
    }).finally(function () { hideLoader(); });
  }

  function renderMarketplaceGrid(products) {
    var grid = $('mpGrid');
    if (!grid) return;
    if (!products.length) {
      grid.innerHTML = '<div class="empty-state"><i class="fas fa-store"></i><p>No listings found. Be the first to post!</p><button class="btn-glow btn-sm-glow" onclick="openProductModal()"><i class="fas fa-plus"></i> <span>Post Listing</span></button></div>';
      return;
    }
    grid.innerHTML = '';
    products.forEach(function (p) {
      var img = p.images && p.images.length ? API_URL + p.images[0].image_url : 'https://via.placeholder.com/400x300/1A1D24/7BC300?text=FarmSync';
      var statusBadge = p.status === 'approved' ? '<span class="badge bg-success">Available</span>' : p.status === 'sold' ? '<span class="badge bg-secondary">Sold</span>' : p.status === 'pending' ? '<span class="badge bg-warning">Pending</span>' : '<span class="badge bg-danger">Rejected</span>';
      var isMine = currentUser.id && String(p.user_id) === String(currentUser.id);
      var actions = '<div class="card-actions">';
      actions += '<button class="btn-view" onclick="openProductDetail(' + p.id + ')"><i class="fas fa-eye"></i> View</button>';
      if (isMine) {
        actions += '<button class="btn-edit" onclick="editProduct(' + p.id + ')"><i class="fas fa-edit"></i></button>';
        if (p.status !== 'sold') actions += '<button class="btn-success-mini" onclick="markSold(' + p.id + ')" title="Mark as sold"><i class="fas fa-check"></i></button>';
        actions += '<button class="btn-delete" onclick="deleteProduct(' + p.id + ')"><i class="fas fa-trash"></i></button>';
      }
      actions += '</div>';
      var card = document.createElement('div');
      card.className = 'card-item';
      card.innerHTML =
        '<div class="card-img" style="background-image:url(\'' + img + '\');"><span class="card-badge">' + escHtml(p.category) + '</span>' + statusBadge + '</div>' +
        '<div class="card-body">' +
        '<h5 class="card-title">' + escHtml(p.title) + '</h5>' +
        '<div class="card-price">KSh ' + (+p.price || 0).toLocaleString() + '</div>' +
        '<div class="card-meta"><i class="fas fa-map-marker-alt"></i> ' + escHtml(p.county || 'Kenya') + (p.quantity ? ' &middot; ' + p.quantity + ' ' + escHtml(p.quantity_unit || 'units') : '') + '</div>' +
        '</div>' + actions;
      grid.appendChild(card);
    });
  }

  function renderMpPagination(total) {
    var el = $('mpPagination');
    if (!el) return;
    var totalPages = Math.ceil(total / 12) || 1;
    if (mpPage > totalPages) mpPage = totalPages;
    if (total <= 12) { el.innerHTML = ''; return; }
    var html = '<div class="page-info">Page ' + mpPage + ' of ' + totalPages + '</div><div class="page-btns">';
    html += '<button ' + (mpPage <= 1 ? 'disabled' : '') + ' onclick="mpGoPage(' + (mpPage - 1) + ')"><i class="fas fa-angle-left"></i></button>';
    for (var i = Math.max(1, mpPage - 2); i <= Math.min(totalPages, mpPage + 2); i++) {
      html += '<button class="' + (i === mpPage ? 'active' : '') + '" onclick="mpGoPage(' + i + ')">' + i + '</button>';
    }
    html += '<button ' + (mpPage >= totalPages ? 'disabled' : '') + ' onclick="mpGoPage(' + (mpPage + 1) + ')"><i class="fas fa-angle-right"></i></button>';
    html += '</div>';
    el.innerHTML = html;
  }

  function openProductModal() {
    mpEditId = null;
    mpPendingFiles = [];
    $('productModalTitle').textContent = 'Post Listing';
    var form = $('productForm');
    if (form) form.reset();
    renderFilePreviews('mpImagePreview', []);
    openModal('productModal');
  }

  function editProduct(id) {
    API.request('GET', '/api/marketplace/' + id).then(function (res) {
      var p = (res.data || {}).product;
      if (!p) { toast('Listing not found', 'error'); return; }
      mpEditId = id;
      $('productModalTitle').textContent = 'Edit Listing';
      var form = $('productForm');
      if (form) form.reset();
      mpPendingFiles = [];
      renderFilePreviews('mpImagePreview', []);
      $('mpTitle').value = p.title || '';
      $('mpCategorySel').value = p.category || '';
      $('mpCondition').value = p.condition_type || 'new';
      $('mpPrice').value = p.price || '';
      $('mpQty').value = p.quantity || 1;
      $('mpQtyUnit').value = p.quantity_unit || 'units';
      $('mpCountySel').value = p.county || '';
      $('mpLocation').value = p.location || '';
      $('mpSellerName').value = p.seller_name || '';
      $('mpPhone').value = p.phone || '';
      $('mpWhatsapp').value = p.whatsapp || '';
      $('mpEmail').value = p.email || '';
      $('mpDesc').value = p.description || '';
      if (p.images && p.images.length) {
        var box = $('mpImagePreview');
        box.innerHTML = '';
        p.images.forEach(function (im) {
          var d = document.createElement('div');
          d.className = 'img-thumb';
          d.innerHTML = '<img src="' + API_URL + im.image_url + '" alt="">';
          box.appendChild(d);
        });
      }
      openModal('productModal');
    }).catch(function (err) { toast(err.message, 'error'); });
  }

  function closeProductModal() { closeModal('productModal'); }

  function deleteProduct(id) {
    showConfirm('Delete listing?', 'This listing will be permanently removed.', true).then(function (ok) {
      if (!ok) return;
      showLoader('Deleting...');
      API.request('DELETE', '/api/marketplace/' + id).then(function () {
        toast('Listing deleted');
        loadMarketplacePage();
      }).catch(function (err) { toast(err.message, 'error'); }).finally(function () { hideLoader(); });
    });
  }

  function markSold(id) {
    showConfirm('Mark as sold?', 'This listing will be marked as sold.', false).then(function (ok) {
      if (!ok) return;
      API.request('POST', '/api/marketplace/' + id + '/sold').then(function () {
        toast('Listing marked as sold');
        loadMarketplacePage();
      }).catch(function (err) { toast(err.message, 'error'); });
    });
  }

  function openProductDetail(id) {
    API.request('GET', '/api/marketplace/' + id).then(function (res) {
      var p = (res.data || {}).product;
      if (!p) { toast('Listing not found', 'error'); return; }
      var images = p.images && p.images.length ? p.images : [];
      var mainImg = images.length ? API_URL + images[0].image_url : 'https://via.placeholder.com/600x400/1A1D24/7BC300?text=FarmSync';
      var thumbs = images.map(function (im, i) {
        return '<img src="' + API_URL + im.image_url + '" class="pd-thumb' + (i === 0 ? ' active' : '') + '" data-img="' + API_URL + im.image_url + '" onclick="pdSetImage(this)" alt="">';
      }).join('');
      var wa = 'https://wa.me/' + digitsOnly(p.whatsapp || p.phone);
      var call = 'tel:' + p.phone;
      var mail = p.email ? 'mailto:' + p.email : '#';
      var isMine = currentUser.id && String(p.user_id) === String(currentUser.id);
      var statusBadge = p.status === 'approved' ? '<span class="badge bg-success">Available</span>' : p.status === 'sold' ? '<span class="badge bg-secondary">Sold</span>' : p.status === 'pending' ? '<span class="badge bg-warning">Pending Review</span>' : '<span class="badge bg-danger">Rejected</span>';
      var ownerActions = '';
      if (isMine) {
        ownerActions = '<div class="pd-owner-actions">' +
          '<button class="btn-glow btn-sm-glow" onclick="closeModal(\'productDetailModal\'); editProduct(' + p.id + ')"><i class="fas fa-edit"></i> <span>Edit</span></button>' +
          (p.status !== 'sold' ? '<button class="btn-glow btn-sm-glow" onclick="closeModal(\'productDetailModal\'); markSold(' + p.id + ')"><i class="fas fa-check"></i> <span>Mark Sold</span></button>' : '') +
          '<button class="btn-glow btn-sm-glow btn-danger-ghost" onclick="closeModal(\'productDetailModal\'); deleteProduct(' + p.id + ')"><i class="fas fa-trash"></i> <span>Delete</span></button>' +
          '</div>';
      }
      $('pdTitle').textContent = p.title;
      $('pdBody').innerHTML =
        '<div class="pd-gallery"><img src="' + mainImg + '" class="pd-main" id="pdMain" alt="">' + (thumbs ? '<div class="pd-thumbs">' + thumbs + '</div>' : '') + '</div>' +
        '<div class="pd-info">' +
        '<div class="pd-head"><div><span class="badge bg-info">' + escHtml(p.category) + '</span> ' + statusBadge + '</div><div class="pd-views"><i class="fas fa-eye"></i> ' + (+p.views || 0) + '</div></div>' +
        '<h4>' + escHtml(p.title) + '</h4>' +
        '<div class="pd-price">KSh ' + (+p.price || 0).toLocaleString() + '</div>' +
        '<div class="pd-meta"><p><i class="fas fa-cubes"></i> Quantity: ' + (+p.quantity || 1) + ' ' + escHtml(p.quantity_unit || 'units') + '</p>' +
        '<p><i class="fas fa-tag"></i> Condition: ' + escHtml(p.condition_type || 'new') + '</p>' +
        '<p><i class="fas fa-map-marker-alt"></i> ' + escHtml(p.county || 'Kenya') + (p.location ? ' &middot; ' + escHtml(p.location) : '') + '</p></div>' +
        '<p class="pd-desc">' + escHtml(p.description || 'No description provided.') + '</p>' +
        '<div class="pd-seller"><strong>' + escHtml(p.seller_name || 'KIBOE Seller') + '</strong><span>' + escHtml(p.phone) + '</span></div>' +
        '<div class="pd-contact">' +
        '<a class="btn-glow btn-sm-glow" href="' + wa + '" target="_blank"><i class="fab fa-whatsapp"></i> <span>WhatsApp</span></a>' +
        '<a class="btn-glow btn-sm-glow btn-blue-ghost" href="' + call + '"><i class="fas fa-phone"></i> <span>Call</span></a>' +
        (p.email ? '<a class="btn-glow btn-sm-glow btn-gray-ghost" href="' + mail + '"><i class="fas fa-envelope"></i> <span>Email</span></a>' : '') +
        '</div>' + ownerActions +
        '</div>';
      openModal('productDetailModal');
    }).catch(function (err) { toast(err.message, 'error'); });
  }

  /* ===================================================================
     AGROVET KNOWLEDGE CENTRE
     =================================================================== */
  function loadAgrovetPage() {
    var q = $('agvSearch') ? $('agvSearch').value : '';
    var params = new URLSearchParams({ search: q, limit: 100 });
    var url = '/api/agrovet/' + (agvTab === 'articles' ? 'articles' : agvTab === 'crops' ? 'crop-diseases' : agvTab === 'livestock' ? 'livestock-diseases' : 'guides') + '?' + params;
    showLoader('Loading knowledge base...');
    API.request('GET', url).then(function (res) {
      var data = res.data || {};
      var items = data.articles || data.diseases || data.guides || [];
      $('agvCount').textContent = items.length + ' resources';
      renderAgvItems(items);
    }).catch(function (err) {
      toast(err.message, 'error');
    }).finally(function () { hideLoader(); });
  }

  function renderAgvItems(items) {
    var box = $('agvContent');
    if (!box) return;
    if (!items.length) {
      box.innerHTML = '<div class="empty-state"><i class="fas fa-book-open"></i><p>No resources found in this section yet.</p></div>';
      return;
    }
    box.innerHTML = '';
    items.forEach(function (it) {
      var card = document.createElement('div');
      card.className = 'card-item agv-card';
      var img = it.image_url ? API_URL + it.image_url : null;
      var head = '';
      if (img) head = '<div class="card-img" style="background-image:url(\'' + img + '\');height:150px;"></div>';
      var title, sub, body, detail;
      if (agvTab === 'articles') {
        title = it.title;
        sub = it.category || 'general';
        body = it.content || '';
        detail = '<div class="agv-full">' + escHtml(body) + '</div>';
      } else if (agvTab === 'crops') {
        title = it.name;
        sub = it.affected_crop || '';
        body = it.symptoms || '';
        detail = '<div class="agv-full"><h6><i class="fas fa-seedling"></i> Affected Crops</h6><p>' + escHtml(it.affected_crop || '-') + '</p>' +
          '<h6><i class="fas fa-exclamation-triangle"></i> Symptoms</h6><p>' + escHtml(it.symptoms || '-') + '</p>' +
          '<h6><i class="fas fa-biohazard"></i> Causes</h6><p>' + escHtml(it.causes || '-') + '</p>' +
          '<h6><i class="fas fa-shield-alt"></i> Prevention</h6><p>' + escHtml(it.prevention || '-') + '</p>' +
          '<h6><i class="fas fa-pills"></i> Medication</h6><p>' + escHtml(it.medication || '-') + '</p>' +
          '<h6><i class="fas fa-list-ol"></i> Application Instructions</h6><p>' + escHtml(it.application_instructions || '-') + '</p></div>';
      } else if (agvTab === 'livestock') {
        title = it.name;
        sub = it.animal_affected || '';
        body = it.symptoms || '';
        detail = '<div class="agv-full"><h6><i class="fas fa-horse-head"></i> Animal Affected</h6><p>' + escHtml(it.animal_affected || '-') + '</p>' +
          '<h6><i class="fas fa-exclamation-triangle"></i> Symptoms</h6><p>' + escHtml(it.symptoms || '-') + '</p>' +
          '<h6><i class="fas fa-shield-alt"></i> Prevention</h6><p>' + escHtml(it.prevention || '-') + '</p>' +
          '<h6><i class="fas fa-syringe"></i> Vaccination Schedule</h6><p>' + escHtml(it.vaccination_schedule || '-') + '</p>' +
          '<h6><i class="fas fa-pills"></i> Medication</h6><p>' + escHtml(it.medication || '-') + '</p>' +
          '<h6><i class="fas fa-weight"></i> Dosage</h6><p>' + escHtml(it.dosage || '-') + '</p>' +
          '<h6><i class="fas fa-user-md"></i> Veterinary Advice</h6><p>' + escHtml(it.veterinary_advice || '-') + '</p></div>';
      } else {
        title = it.title;
        sub = it.category || 'general';
        body = it.content || '';
        detail = '<div class="agv-full">' + escHtml(body) + '</div>';
      }
      var excerpt = body.length > 220 ? body.substring(0, 220) + '...' : body;
      card.innerHTML = head +
        '<div class="card-body">' +
        '<div class="card-meta"><span class="badge bg-info">' + escHtml(sub) + '</span></div>' +
        '<h5 class="card-title">' + escHtml(title) + '</h5>' +
        '<p class="card-text">' + escHtml(excerpt) + '</p>' +
        '<div class="agv-detail" id="agvDetail_' + it.id + '" style="display:none;">' + detail + '</div>' +
        '</div>' +
        '<div class="card-actions"><button class="btn-view" onclick="toggleAgvDetail(' + it.id + ')"><i class="fas fa-chevron-circle-down"></i> <span>Details</span></button></div>';
      box.appendChild(card);
    });
  }

  function toggleAgvDetail(id) {
    var el = $('agvDetail_' + id);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  /* ===================================================================
     EVENTS
     =================================================================== */
  function loadEventsPage() {
    var search = $('evSearch') ? $('evSearch').value : '';
    var filter = $('evFilter') ? $('evFilter').value : 'upcoming';
    var q = new URLSearchParams({ search: search, date: filter === 'all' ? '' : filter, sort: 'soonest', page: evPage, limit: 12 });
    showLoader('Loading events...');
    API.request('GET', '/api/events?' + q).then(function (res) {
      var data = res.data || {};
      var events = data.events || [];
      var pag = data.pagination || { total: 0 };
      renderEventGrid(events);
      renderEvPagination(pag.total);
    }).catch(function (err) { toast(err.message, 'error'); })
      .finally(function () { hideLoader(); });
  }

  function renderEventGrid(events) {
    var grid = $('evGrid');
    if (!grid) return;
    if (!events.length) {
      grid.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No events found.</p></div>';
      return;
    }
    grid.innerHTML = '';
    events.forEach(function (e) {
      var img = e.poster_url ? API_URL + e.poster_url : 'https://via.placeholder.com/400x200/1A1D24/7BC300?text=Event';
      var isPast = new Date(e.event_date) < new Date(new Date().toISOString().slice(0, 10));
      var card = document.createElement('div');
      card.className = 'card-item ev-card';
      card.innerHTML =
        '<div class="card-img" style="background-image:url(\'' + img + '\');height:160px;"><span class="card-badge">' + escHtml(e.county || 'Kenya') + '</span>' + (isPast ? '<span class="badge bg-secondary">Past</span>' : '') + '</div>' +
        '<div class="card-body">' +
        '<div class="ev-date"><i class="far fa-calendar-alt"></i> ' + escHtml(e.event_date) + (e.event_time ? ' &middot; ' + escHtml(e.event_time) : '') + '</div>' +
        '<h5 class="card-title">' + escHtml(e.title) + '</h5>' +
        (e.min_people ? '<div class="card-meta"><i class="fas fa-users"></i> Minimum ' + (+e.min_people) + ' people</div>' : '') +
        '<div class="card-meta"><i class="fas fa-map-marker-alt"></i> ' + escHtml(e.venue || 'Venue TBA') + '</div>' +
        '<div class="card-meta"><i class="fas fa-user-tie"></i> ' + escHtml(e.organizer || 'Organizer') + '</div>' +
        (e.description ? '<p class="card-text">' + escHtml(e.description.length > 120 ? e.description.substring(0, 120) + '...' : e.description) + '</p>' : '') +
        '</div>' +
        '<div class="card-actions">' +
        (e.registration_link ? '<a class="btn-view" href="' + escHtml(e.registration_link) + '" target="_blank"><i class="fas fa-external-link-alt"></i> Register</a>' : '') +
        (canManageEventItem(e) ? '<button class="btn-edit" onclick="editEvent(' + e.id + ')"><i class="fas fa-edit"></i></button><button class="btn-delete" onclick="deleteEvent(' + e.id + ')"><i class="fas fa-trash"></i></button>' : '') +
        '</div>';
      grid.appendChild(card);
    });
  }

  function renderEvPagination(total) {
    var el = $('evPagination');
    if (!el) return;
    var totalPages = Math.ceil(total / 12) || 1;
    if (evPage > totalPages) evPage = totalPages;
    if (total <= 12) { el.innerHTML = ''; return; }
    var html = '<div class="page-info">Page ' + evPage + ' of ' + totalPages + '</div><div class="page-btns">';
    html += '<button ' + (evPage <= 1 ? 'disabled' : '') + ' onclick="evGoPage(' + (evPage - 1) + ')"><i class="fas fa-angle-left"></i></button>';
    for (var i = Math.max(1, evPage - 2); i <= Math.min(totalPages, evPage + 2); i++) {
      html += '<button class="' + (i === evPage ? 'active' : '') + '" onclick="evGoPage(' + i + ')">' + i + '</button>';
    }
    html += '<button ' + (evPage >= totalPages ? 'disabled' : '') + ' onclick="evGoPage(' + (evPage + 1) + ')"><i class="fas fa-angle-right"></i></button></div>';
    el.innerHTML = html;
  }

  function openEventModal(id) {
    evEditId = id || null;
    $('eventModalTitle').textContent = id ? 'Edit Event' : 'Create Event';
    var form = $('eventForm');
    if (form) form.reset();
    if (id) {
      API.request('GET', '/api/events/' + id).then(function (res) {
        var e = (res.data || {}).event;
        if (!e) return;
        $('evTitle').value = e.title || '';
        $('evOrganizer').value = e.organizer || '';
        $('evCounty').value = e.county || '';
        $('evVenue').value = e.venue || '';
        $('evDate').value = e.event_date || '';
        $('evTime').value = e.event_time || '';
        $('evRegLink').value = e.registration_link || '';
        $('evContact').value = e.contact_person || '';
        $('evPhone').value = e.phone || '';
        $('evMinPeople').value = e.min_people || 5;
        $('evDesc').value = e.description || '';
      }).catch(function (err) { toast(err.message, 'error'); });
    }
    openModal('eventModal');
  }

  function editEvent(id) { openEventModal(id); }

  function deleteEvent(id) {
    showConfirm('Delete event?', 'This event will be permanently removed.', true).then(function (ok) {
      if (!ok) return;
      API.request('DELETE', '/api/events/' + id).then(function () {
        toast('Event deleted');
        loadEventsPage();
        if ($('page-admin').classList.contains('active')) loadAdminPage();
      }).catch(function (err) { toast(err.message, 'error'); });
    });
  }

  /* ===================================================================
     CONTRACTORS
     =================================================================== */
  function loadContractorsPage() {
    var search = $('ctSearch') ? $('ctSearch').value : '';
    var county = $('ctCounty') ? $('ctCounty').value : '';
    var q = new URLSearchParams({ search: search, county: county, sort: 'experience', page: ctPage, limit: 12 });
    showLoader('Loading contractors...');
    API.request('GET', '/api/contractors?' + q).then(function (res) {
      var data = res.data || {};
      var contractors = data.contractors || [];
      var pag = data.pagination || { total: 0 };
      renderContractorGrid(contractors);
      renderCtPagination(pag.total);
    }).catch(function (err) { toast(err.message, 'error'); })
      .finally(function () { hideLoader(); });
  }

  function renderContractorGrid(contractors) {
    var grid = $('ctGrid');
    if (!grid) return;
    if (!contractors.length) {
      grid.innerHTML = '<div class="empty-state"><i class="fas fa-user-tie"></i><p>No contractors found.</p></div>';
      return;
    }
    grid.innerHTML = '';
    contractors.forEach(function (c) {
      var img = c.images && c.images.length ? API_URL + c.images[0].image_url : 'https://via.placeholder.com/400x200/1A1D24/7BC300?text=Service';
      var services = String(c.services || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var serviceTags = services.slice(0, 3).map(function (s) { return '<span class="service-tag">' + escHtml(s) + '</span>'; }).join('');
      var wa = 'https://wa.me/' + digitsOnly(c.whatsapp || c.phone);
      var card = document.createElement('div');
      card.className = 'card-item ct-card';
      card.innerHTML =
        '<div class="card-img" style="background-image:url(\'' + img + '\');height:140px;"><span class="card-badge">' + escHtml(c.county || 'Kenya') + '</span></div>' +
        '<div class="card-body">' +
        '<h5 class="card-title">' + escHtml(c.business_name) + '</h5>' +
        '<div class="ct-services">' + (serviceTags || '<span class="service-tag">General</span>') + '</div>' +
        '<div class="card-meta"><i class="fas fa-map-marker-alt"></i> ' + escHtml(c.location || c.county || 'Kenya') + '</div>' +
        '<div class="card-meta"><i class="fas fa-medal"></i> ' + (+c.years_experience || 0) + ' yrs experience</div>' +
        (c.description ? '<p class="card-text">' + escHtml(c.description.length > 110 ? c.description.substring(0, 110) + '...' : c.description) + '</p>' : '') +
        '</div>' +
        '<div class="card-actions">' +
        '<a class="btn-view" href="' + wa + '" target="_blank"><i class="fab fa-whatsapp"></i> Contact</a>' +
        '<a class="btn-call" href="tel:' + escHtml(c.phone) + '"><i class="fas fa-phone"></i></a>' +
        (canManageContractorItem(c) ? '<button class="btn-edit" onclick="editContractor(' + c.id + ')"><i class="fas fa-edit"></i></button><button class="btn-delete" onclick="deleteContractor(' + c.id + ')"><i class="fas fa-trash"></i></button>' : '') +
        '</div>';
      grid.appendChild(card);
    });
  }

  function renderCtPagination(total) {
    var el = $('ctPagination');
    if (!el) return;
    var totalPages = Math.ceil(total / 12) || 1;
    if (ctPage > totalPages) ctPage = totalPages;
    if (total <= 12) { el.innerHTML = ''; return; }
    var html = '<div class="page-info">Page ' + ctPage + ' of ' + totalPages + '</div><div class="page-btns">';
    html += '<button ' + (ctPage <= 1 ? 'disabled' : '') + ' onclick="ctGoPage(' + (ctPage - 1) + ')"><i class="fas fa-angle-left"></i></button>';
    for (var i = Math.max(1, ctPage - 2); i <= Math.min(totalPages, ctPage + 2); i++) {
      html += '<button class="' + (i === ctPage ? 'active' : '') + '" onclick="ctGoPage(' + i + ')">' + i + '</button>';
    }
    html += '<button ' + (ctPage >= totalPages ? 'disabled' : '') + ' onclick="ctGoPage(' + (ctPage + 1) + ')"><i class="fas fa-angle-right"></i></button></div>';
    el.innerHTML = html;
  }

  function openContractorModal(id) {
    ctEditId = id || null;
    ctPendingFiles = [];
    $('contractorModalTitle').textContent = id ? 'Edit Contractor' : 'Add Contractor';
    var form = $('contractorForm');
    if (form) form.reset();
    renderFilePreviews('ctImagePreview', []);
    if (id) {
      API.request('GET', '/api/contractors/' + id).then(function (res) {
        var c = (res.data || {}).contractor;
        if (!c) return;
        $('ctName').value = c.business_name || '';
        $('ctServices').value = c.services || '';
        $('ctDesc').value = c.description || '';
        $('ctOwner').value = c.owner_name || '';
        $('ctCountySel').value = c.county || '';
        $('ctLocation').value = c.location || '';
        $('ctPhone').value = c.phone || '';
        $('ctWhatsapp').value = c.whatsapp || '';
        $('ctEmail').value = c.email || '';
        $('ctYears').value = c.years_experience || 0;
        $('ctHours').value = c.operating_hours || '';
        if (c.images && c.images.length) {
          var box = $('ctImagePreview');
          box.innerHTML = '';
          c.images.forEach(function (im) {
            var d = document.createElement('div');
            d.className = 'img-thumb';
            d.innerHTML = '<img src="' + API_URL + im.image_url + '" alt="">';
            box.appendChild(d);
          });
        }
      }).catch(function (err) { toast(err.message, 'error'); });
    }
    openModal('contractorModal');
  }

  function editContractor(id) { openContractorModal(id); }

  function deleteContractor(id) {
    showConfirm('Delete contractor?', 'This contractor will be permanently removed.', true).then(function (ok) {
      if (!ok) return;
      API.request('DELETE', '/api/contractors/' + id).then(function () {
        toast('Contractor deleted');
        loadContractorsPage();
        if ($('page-admin').classList.contains('active')) loadAdminPage();
      }).catch(function (err) { toast(err.message, 'error'); });
    });
  }

  function becomeContractor() {
    showConfirm('Become a contractor?', 'You will be able to post your own business listing and create events. This can be changed anytime by an admin.', false).then(function (ok) {
      if (!ok) return;
      setBtnLoading($('becomeContractorBtn'), true);
      API.request('POST', '/api/auth/become-contractor').then(function (res) {
        toast(res.message || 'You are now a contractor');
        return API.getProfile();
      }).then(function (res) {
        var u = (res.data || {}).user || {};
        currentUser.id = u.id;
        currentUser.role = u.role || 'user';
        refreshRoleButtons();
        loadContractorsPage();
      }).catch(function (err) { toast(err.message, 'error'); })
        .finally(function () { setBtnLoading($('becomeContractorBtn'), false); });
    });
  }

  function refreshRoleButtons() {
    var isAdmin = currentUser.role === 'admin';
    var isContractor = currentUser.role === 'contractor';
    var an = $('adminNavLink'); if (an) an.style.display = isAdmin ? '' : 'none';
    var eb = $('eventCreateBtn'); if (eb) eb.style.display = isStaff() ? '' : 'none';
    var cb = $('contractorCreateBtn'); if (cb) cb.style.display = isAdmin ? '' : 'none';
    var bc = $('becomeContractorBtn'); if (bc) bc.style.display = (isAdmin || isContractor) ? 'none' : '';
    var ml = $('myContractorBtn'); if (ml) ml.style.display = isContractor ? '' : 'none';
  }

  function openMyContractor() {
    showLoader('Loading your listing...');
    API.request('GET', '/api/contractors/mine').then(function (res) {
      var c = (res.data || {}).contractor;
      if (c && c.id) {
        openContractorModal(c.id);
      } else {
        toast('Create your business listing below');
        openContractorModal();
      }
    }).catch(function (err) { toast(err.message, 'error'); })
      .finally(function () { hideLoader(); });
  }

  /* ===================================================================
     ADMIN PANEL
     =================================================================== */
  function loadAdminPage() {
    if (currentUser.role !== 'admin') {
      toast('Admin access required', 'error');
      showPage('dashboard');
      return;
    }
    setAdminTab(admTab);
  }

  function setAdminTab(tab) {
    admTab = tab;
    document.querySelectorAll('.agv-tab[data-adm]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.adm === tab);
    });
    var box = $('adminContent');
    if (!box) return;
    if (tab === 'review') renderAdminReview(box);
    else if (tab === 'articles') renderAdminContentList(box, 'articles', '/api/agrovet/articles');
    else if (tab === 'crops') renderAdminContentList(box, 'crops', '/api/agrovet/crop-diseases');
    else if (tab === 'livestock') renderAdminContentList(box, 'livestock', '/api/agrovet/livestock-diseases');
    else if (tab === 'guides') renderAdminContentList(box, 'guides', '/api/agrovet/guides');
    else if (tab === 'events') renderAdminEvents(box);
    else if (tab === 'contractors') renderAdminContractors(box);
  }

  function renderAdminReview(box) {
    var status = $('admStatusFilter') ? $('admStatusFilter').value : 'pending';
    box.innerHTML = '<div class="dash-card"><div class="card-head"><h4><i class="fas fa-clipboard-check"></i> Marketplace Moderation</h4><div class="filter-group"><select id="admStatusFilter" onchange="setAdminTab(\'review\')"><option value="pending"' + (status === 'pending' ? ' selected' : '') + '>Pending</option><option value="approved"' + (status === 'approved' ? ' selected' : '') + '>Approved</option><option value="rejected"' + (status === 'rejected' ? ' selected' : '') + '>Rejected</option><option value="sold"' + (status === 'sold' ? ' selected' : '') + '>Sold</option><option value="all"' + (status === 'all' ? ' selected' : '') + '>All</option></select></div></div><div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Product</th><th>Seller</th><th>Price</th><th>County</th><th>Status</th><th>Actions</th></tr></thead><tbody id="admReviewBody"><tr class="empty-row"><td colspan="6"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr></tbody></table></div></div>';
    API.request('GET', '/api/marketplace/admin/all?status=' + status + '&limit=100').then(function (res) {
      var data = res.data || {};
      var products = data.products || [];
      var body = $('admReviewBody');
      if (!body) return;
      if (!products.length) {
        body.innerHTML = '<tr class="empty-row"><td colspan="6"><i class="fas fa-inbox"></i> No listings in this status</td></tr>';
        return;
      }
      body.innerHTML = '';
      products.forEach(function (p) {
        var stBadge = p.status === 'approved' ? '<span class="badge bg-success">Approved</span>' : p.status === 'pending' ? '<span class="badge bg-warning">Pending</span>' : p.status === 'rejected' ? '<span class="badge bg-danger">Rejected</span>' : '<span class="badge bg-secondary">Sold</span>';
        var actions = '<div class="action-btns">' +
          '<button class="btn-view" onclick="openProductDetail(' + p.id + ')"><i class="fas fa-eye"></i></button>' +
          (p.status === 'pending' ? '<button class="btn-edit" onclick="approveProduct(' + p.id + ')"><i class="fas fa-check"></i></button><button class="btn-delete" onclick="rejectProduct(' + p.id + ')"><i class="fas fa-times"></i></button>' : '') +
          '</div>';
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + escHtml(p.title) + '</td><td>' + escHtml(p.seller_name || 'Seller') + '<br><small>' + escHtml(p.phone) + '</small></td><td>KSh ' + (+p.price || 0).toLocaleString() + '</td><td>' + escHtml(p.county || '-') + '</td><td>' + stBadge + '</td><td>' + actions + '</td>';
        body.appendChild(tr);
      });
    }).catch(function (err) { toast(err.message, 'error'); });
  }

  function approveProduct(id) {
    API.request('POST', '/api/marketplace/' + id + '/approve').then(function () {
      toast('Listing approved');
      setAdminTab('review');
    }).catch(function (err) { toast(err.message, 'error'); });
  }

  function rejectProduct(id) {
    showConfirm('Reject listing?', 'The seller will be notified that the listing was rejected.', true).then(function (ok) {
      if (!ok) return;
      API.request('POST', '/api/marketplace/' + id + '/reject').then(function () {
        toast('Listing rejected');
        setAdminTab('review');
      }).catch(function (err) { toast(err.message, 'error'); });
    });
  }

  function renderAdminContentList(box, type, url) {
    var labels = { articles: 'Articles', crops: 'Crop Diseases', livestock: 'Livestock Diseases', guides: 'Farming Guides' };
    var addFns = { articles: 'openArticleModal()', crops: 'openCropDiseaseModal()', livestock: 'openLivestockDiseaseModal()', guides: 'openGuideModal()' };
    var detailFns = { articles: 'viewAgvAdmin(\'articles\',', crops: 'viewAgvAdmin(\'crops\',', livestock: 'viewAgvAdmin(\'livestock\',', guides: 'viewAgvAdmin(\'guides\',' };
    var deleteFns = { articles: 'deleteAgvItem(\'articles\',', crops: 'deleteAgvItem(\'crops\',', livestock: 'deleteAgvItem(\'livestock\',', guides: 'deleteAgvItem(\'guides\',' };
    var editFns = { articles: 'openArticleModal(', crops: 'openCropDiseaseModal(', livestock: 'openLivestockDiseaseModal(', guides: 'openGuideModal(' };
    box.innerHTML = '<div class="dash-card"><div class="card-head"><h4><i class="fas fa-book-open"></i> Manage ' + labels[type] + '</h4><button class="btn-glow btn-sm-glow" onclick="' + addFns[type] + '"><i class="fas fa-plus"></i> <span>Add New</span></button></div><div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Title</th><th>Category</th><th>Actions</th></tr></thead><tbody id="admListBody_' + type + '"><tr class="empty-row"><td colspan="3"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr></tbody></table></div></div>';
    API.request('GET', url + '?limit=200').then(function (res) {
      var data = res.data || {};
      var items = data.articles || data.diseases || data.guides || [];
      var body = $('admListBody_' + type);
      if (!body) return;
      if (!items.length) {
        body.innerHTML = '<tr class="empty-row"><td colspan="3"><i class="fas fa-inbox"></i> Nothing here yet</td></tr>';
        return;
      }
      body.innerHTML = '';
      items.forEach(function (it) {
        var name = it.title || it.name;
        var cat = it.category || it.affected_crop || it.animal_affected || 'general';
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + escHtml(name) + '</td><td><span class="badge bg-info">' + escHtml(cat) + '</span></td><td><div class="action-btns"><button class="btn-edit" onclick="' + editFns[type] + it.id + ')"><i class="fas fa-edit"></i></button><button class="btn-delete" onclick="' + deleteFns[type] + it.id + ')"><i class="fas fa-trash"></i></button></div></td>';
        body.appendChild(tr);
      });
    }).catch(function (err) { toast(err.message, 'error'); });
  }

  function renderAdminEvents(box) {
    box.innerHTML = '<div class="dash-card"><div class="card-head"><h4><i class="fas fa-calendar-check"></i> Manage Events</h4><button class="btn-glow btn-sm-glow" onclick="openEventModal()"><i class="fas fa-plus"></i> <span>Add New</span></button></div><div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Event</th><th>Date</th><th>County</th><th>Actions</th></tr></thead><tbody id="admEventsBody"><tr class="empty-row"><td colspan="4"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr></tbody></table></div></div>';
    API.request('GET', '/api/events?limit=200&date=').then(function (res) {
      var events = ((res.data || {}).events) || [];
      var body = $('admEventsBody');
      if (!body) return;
      if (!events.length) { body.innerHTML = '<tr class="empty-row"><td colspan="4"><i class="fas fa-inbox"></i> No events</td></tr>'; return; }
      body.innerHTML = '';
      events.forEach(function (e) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + escHtml(e.title) + '</td><td>' + escHtml(e.event_date) + '</td><td>' + escHtml(e.county || '-') + '</td><td><div class="action-btns"><button class="btn-edit" onclick="editEvent(' + e.id + ')"><i class="fas fa-edit"></i></button><button class="btn-delete" onclick="deleteEvent(' + e.id + ')"><i class="fas fa-trash"></i></button></div></td>';
        body.appendChild(tr);
      });
    }).catch(function (err) { toast(err.message, 'error'); });
  }

  function renderAdminContractors(box) {
    box.innerHTML = '<div class="dash-card"><div class="card-head"><h4><i class="fas fa-user-tie"></i> Manage Contractors</h4><button class="btn-glow btn-sm-glow" onclick="openContractorModal()"><i class="fas fa-plus"></i> <span>Add New</span></button></div><div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Business</th><th>Services</th><th>County</th><th>Actions</th></tr></thead><tbody id="admCtBody"><tr class="empty-row"><td colspan="4"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr></tbody></table></div></div>';
    API.request('GET', '/api/contractors?limit=200').then(function (res) {
      var contractors = ((res.data || {}).contractors) || [];
      var body = $('admCtBody');
      if (!body) return;
      if (!contractors.length) { body.innerHTML = '<tr class="empty-row"><td colspan="4"><i class="fas fa-inbox"></i> No contractors</td></tr>'; return; }
      body.innerHTML = '';
      contractors.forEach(function (c) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + escHtml(c.business_name) + '</td><td>' + escHtml((c.services || '').split(',').slice(0, 2).join(', ')) + '</td><td>' + escHtml(c.county || '-') + '</td><td><div class="action-btns"><button class="btn-edit" onclick="editContractor(' + c.id + ')"><i class="fas fa-edit"></i></button><button class="btn-delete" onclick="deleteContractor(' + c.id + ')"><i class="fas fa-trash"></i></button></div></td>';
        body.appendChild(tr);
      });
    }).catch(function (err) { toast(err.message, 'error'); });
  }

  /* ---------------- Admin Agrovet CRUD modals ---------------- */
  function openArticleModal(id) {
    adminEdit = { type: 'articles', id: id || null };
    $('articleModalTitle').textContent = id ? 'Edit Article' : 'New Article';
    var form = $('articleForm'); if (form) form.reset();
    if (id) {
      API.request('GET', '/api/agrovet/articles/' + id).then(function (res) {
        var a = (res.data || {}).article;
        if (!a) return;
        $('arTitle').value = a.title || '';
        $('arCategory').value = a.category || '';
        $('arContent').value = a.content || '';
      }).catch(function (err) { toast(err.message, 'error'); });
    }
    openModal('articleModal');
  }

  function openCropDiseaseModal(id) {
    adminEdit = { type: 'crops', id: id || null };
    $('cropDiseaseModalTitle').textContent = id ? 'Edit Crop Disease' : 'New Crop Disease';
    var form = $('cropDiseaseForm'); if (form) form.reset();
    if (id) {
      API.request('GET', '/api/agrovet/crop-diseases/' + id).then(function (res) {
        var d = (res.data || {}).disease;
        if (!d) return;
        $('cdName').value = d.name || '';
        $('cdCrop').value = d.affected_crop || '';
        $('cdSymptoms').value = d.symptoms || '';
        $('cdCauses').value = d.causes || '';
        $('cdPrevention').value = d.prevention || '';
        $('cdMedication').value = d.medication || '';
        $('cdApplication').value = d.application_instructions || '';
      }).catch(function (err) { toast(err.message, 'error'); });
    }
    openModal('cropDiseaseModal');
  }

  function openLivestockDiseaseModal(id) {
    adminEdit = { type: 'livestock', id: id || null };
    $('livestockDiseaseModalTitle').textContent = id ? 'Edit Livestock Disease' : 'New Livestock Disease';
    var form = $('livestockDiseaseForm'); if (form) form.reset();
    if (id) {
      API.request('GET', '/api/agrovet/livestock-diseases/' + id).then(function (res) {
        var d = (res.data || {}).disease;
        if (!d) return;
        $('ldName').value = d.name || '';
        $('ldAnimal').value = d.animal_affected || '';
        $('ldSymptoms').value = d.symptoms || '';
        $('ldPrevention').value = d.prevention || '';
        $('ldVaccine').value = d.vaccination_schedule || '';
        $('ldMedication').value = d.medication || '';
        $('ldDosage').value = d.dosage || '';
        $('ldVet').value = d.veterinary_advice || '';
      }).catch(function (err) { toast(err.message, 'error'); });
    }
    openModal('livestockDiseaseModal');
  }

  function openGuideModal(id) {
    adminEdit = { type: 'guides', id: id || null };
    $('guideModalTitle').textContent = id ? 'Edit Farming Guide' : 'New Farming Guide';
    var form = $('guideForm'); if (form) form.reset();
    if (id) {
      API.request('GET', '/api/agrovet/guides/' + id).then(function (res) {
        var g = (res.data || {}).guide;
        if (!g) return;
        $('fgTitle').value = g.title || '';
        $('fgCategory').value = g.category || '';
        $('fgContent').value = g.content || '';
      }).catch(function (err) { toast(err.message, 'error'); });
    }
    openModal('guideModal');
  }

  function deleteAgvItem(type, id) {
    var labels = { articles: 'article', crops: 'disease', livestock: 'disease', guides: 'guide' };
    showConfirm('Delete ' + labels[type] + '?', 'This item will be permanently removed.', true).then(function (ok) {
      if (!ok) return;
      var url = '/api/agrovet/' + (type === 'articles' ? 'articles/' : type === 'crops' ? 'crop-diseases/' : type === 'livestock' ? 'livestock-diseases/' : 'guides/') + id;
      API.request('DELETE', url).then(function () {
        toast(labels[type] + ' deleted');
        setAdminTab(type);
        if ($('page-agrovet').classList.contains('active')) loadAgrovetPage();
      }).catch(function (err) { toast(err.message, 'error'); });
    });
  }

  /* ===================================================================
     PAGINATION NAV
     =================================================================== */
  function mpGoPage(p) { mpPage = p; loadMarketplacePage(); }
  function evGoPage(p) { evPage = p; loadEventsPage(); }
  function ctGoPage(p) { ctPage = p; loadContractorsPage(); }

  function pdSetImage(el) {
    var main = $('pdMain');
    if (main) main.src = el.dataset.img;
    document.querySelectorAll('.pd-thumb').forEach(function (t) { t.classList.remove('active'); });
    el.classList.add('active');
  }

  /* ===================================================================
     FORM SUBMISSIONS + INIT
     =================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    fillCountySelects();
    fillCategorySelects();

    setupFileInput('mpImageInput', 'mpImagePreview', mpPendingFiles);
    bindPreviewRemoval('mpImagePreview', mpPendingFiles);
    setupFileInput('ctImageInput', 'ctImagePreview', ctPendingFiles);
    bindPreviewRemoval('ctImagePreview', ctPendingFiles);

    /* Load current user */
    if (API.getToken()) {
      API.getProfile().then(function (res) {
        var u = (res.data || {}).user || {};
        currentUser.id = u.id;
        currentUser.role = u.role || 'user';
        var isAdmin = currentUser.role === 'admin';
        var isContractor = currentUser.role === 'contractor';
        var an = $('adminNavLink'); if (an) an.style.display = isAdmin ? '' : 'none';
        var eb = $('eventCreateBtn'); if (eb) eb.style.display = isStaff() ? '' : 'none';
        var cb = $('contractorCreateBtn'); if (cb) cb.style.display = isAdmin ? '' : 'none';
        var bc = $('becomeContractorBtn'); if (bc) bc.style.display = (isAdmin || isContractor) ? 'none' : '';
        var ml = $('myContractorBtn'); if (ml) ml.style.display = isContractor ? '' : 'none';
        if (isAdmin && $('page-admin').classList.contains('active')) loadAdminPage();
      }).catch(function (err) { if (err.message && err.message.indexOf('Unauthorized') !== -1) logout(); });
    }

    /* Debounced search */
    if ($('mpSearch')) $('mpSearch').addEventListener('input', debounce(function () { mpPage = 1; loadMarketplacePage(); }, 500));
    if ($('agvSearch')) $('agvSearch').addEventListener('input', debounce(function () { loadAgrovetPage(); }, 400));
    if ($('evSearch')) $('evSearch').addEventListener('input', debounce(function () { evPage = 1; loadEventsPage(); }, 500));
    if ($('ctSearch')) $('ctSearch').addEventListener('input', debounce(function () { ctPage = 1; loadContractorsPage(); }, 500));

    /* ---- Marketplace product form ---- */
    var pf = $('productForm');
    if (pf) pf.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('mpSubmit'); setBtnLoading(btn, true);
      var fd = new FormData();
      fd.append('title', $('mpTitle').value);
      fd.append('category', $('mpCategorySel').value);
      fd.append('condition_type', $('mpCondition').value);
      fd.append('price', $('mpPrice').value);
      fd.append('quantity', $('mpQty').value || 1);
      fd.append('quantity_unit', $('mpQtyUnit').value || 'units');
      fd.append('county', $('mpCountySel').value);
      fd.append('location', $('mpLocation').value);
      fd.append('seller_name', $('mpSellerName').value);
      fd.append('phone', $('mpPhone').value);
      fd.append('whatsapp', $('mpWhatsapp').value);
      fd.append('email', $('mpEmail').value);
      fd.append('description', $('mpDesc').value);
      mpPendingFiles.forEach(function (f) { fd.append('marketplace_images', f); });
      var p = mpEditId ? upload('PUT', '/api/marketplace/' + mpEditId, fd) : upload('POST', '/api/marketplace', fd);
      p.then(function () {
        toast(mpEditId ? 'Listing updated (pending re-review)' : 'Listing submitted for review');
        closeProductModal();
        mpEditId = null; mpPendingFiles = [];
        loadMarketplacePage();
      }).catch(function (err) { toast(err.message, 'error'); })
        .finally(function () { setBtnLoading(btn, false); });
    });

    /* ---- Event form ---- */
    var ef = $('eventForm');
    if (ef) ef.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('evSubmit'); setBtnLoading(btn, true);
      var fd = new FormData();
      fd.append('title', $('evTitle').value);
      fd.append('organizer', $('evOrganizer').value);
      fd.append('county', $('evCounty').value);
      fd.append('venue', $('evVenue').value);
      fd.append('event_date', $('evDate').value);
      fd.append('event_time', $('evTime').value);
      fd.append('registration_link', $('evRegLink').value);
      fd.append('contact_person', $('evContact').value);
      fd.append('phone', $('evPhone').value);
      fd.append('min_people', $('evMinPeople').value || 5);
      fd.append('description', $('evDesc').value);
      var poster = $('evPoster').files[0];
      if (poster) fd.append('event_poster', poster);
      var p = evEditId ? upload('PUT', '/api/events/' + evEditId, fd) : upload('POST', '/api/events', fd);
      p.then(function () {
        toast('Event saved');
        closeModal('eventModal');
        evEditId = null;
        loadEventsPage();
        if ($('page-admin').classList.contains('active')) loadAdminPage();
      }).catch(function (err) { toast(err.message, 'error'); })
        .finally(function () { setBtnLoading(btn, false); });
    });

    /* ---- Contractor form ---- */
    var cf = $('contractorForm');
    if (cf) cf.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('ctSubmit'); setBtnLoading(btn, true);
      var fd = new FormData();
      fd.append('business_name', $('ctName').value);
      fd.append('services', $('ctServices').value);
      fd.append('description', $('ctDesc').value);
      fd.append('owner_name', $('ctOwner').value);
      fd.append('county', $('ctCountySel').value);
      fd.append('location', $('ctLocation').value);
      fd.append('phone', $('ctPhone').value);
      fd.append('whatsapp', $('ctWhatsapp').value);
      fd.append('email', $('ctEmail').value);
      fd.append('years_experience', $('ctYears').value || 0);
      fd.append('operating_hours', $('ctHours').value);
      ctPendingFiles.forEach(function (f) { fd.append('contractor_images', f); });
      var p = ctEditId ? upload('PUT', '/api/contractors/' + ctEditId, fd) : upload('POST', '/api/contractors', fd);
      p.then(function () {
        toast('Contractor saved');
        closeModal('contractorModal');
        ctEditId = null; ctPendingFiles = [];
        loadContractorsPage();
        if ($('page-admin').classList.contains('active')) loadAdminPage();
      }).catch(function (err) { toast(err.message, 'error'); })
        .finally(function () { setBtnLoading(btn, false); });
    });

    /* ---- Article form ---- */
    var arf = $('articleForm');
    if (arf) arf.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('arSubmit'); setBtnLoading(btn, true);
      var fd = new FormData();
      fd.append('title', $('arTitle').value);
      fd.append('category', $('arCategory').value);
      fd.append('content', $('arContent').value);
      var img = $('arImage').files[0];
      if (img) fd.append('agrovet_image', img);
      var p = adminEdit.id ? upload('PUT', '/api/agrovet/articles/' + adminEdit.id, fd) : upload('POST', '/api/agrovet/articles', fd);
      p.then(function () {
        toast('Article saved');
        closeModal('articleModal');
        adminEdit = { type: null, id: null };
        setAdminTab('articles');
        if ($('page-agrovet').classList.contains('active')) loadAgrovetPage();
      }).catch(function (err) { toast(err.message, 'error'); })
        .finally(function () { setBtnLoading(btn, false); });
    });

    /* ---- Crop disease form ---- */
    var cdf = $('cropDiseaseForm');
    if (cdf) cdf.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('cdSubmit'); setBtnLoading(btn, true);
      var fd = new FormData();
      fd.append('name', $('cdName').value);
      fd.append('affected_crop', $('cdCrop').value);
      fd.append('symptoms', $('cdSymptoms').value);
      fd.append('causes', $('cdCauses').value);
      fd.append('prevention', $('cdPrevention').value);
      fd.append('medication', $('cdMedication').value);
      fd.append('application_instructions', $('cdApplication').value);
      var img = $('cdImage').files[0];
      if (img) fd.append('agrovet_image', img);
      var p = adminEdit.id ? upload('PUT', '/api/agrovet/crop-diseases/' + adminEdit.id, fd) : upload('POST', '/api/agrovet/crop-diseases', fd);
      p.then(function () {
        toast('Disease saved');
        closeModal('cropDiseaseModal');
        adminEdit = { type: null, id: null };
        setAdminTab('crops');
        if ($('page-agrovet').classList.contains('active')) loadAgrovetPage();
      }).catch(function (err) { toast(err.message, 'error'); })
        .finally(function () { setBtnLoading(btn, false); });
    });

    /* ---- Livestock disease form ---- */
    var ldf = $('livestockDiseaseForm');
    if (ldf) ldf.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('ldSubmit'); setBtnLoading(btn, true);
      var fd = new FormData();
      fd.append('name', $('ldName').value);
      fd.append('animal_affected', $('ldAnimal').value);
      fd.append('symptoms', $('ldSymptoms').value);
      fd.append('prevention', $('ldPrevention').value);
      fd.append('vaccination_schedule', $('ldVaccine').value);
      fd.append('medication', $('ldMedication').value);
      fd.append('dosage', $('ldDosage').value);
      fd.append('veterinary_advice', $('ldVet').value);
      var img = $('ldImage').files[0];
      if (img) fd.append('agrovet_image', img);
      var p = adminEdit.id ? upload('PUT', '/api/agrovet/livestock-diseases/' + adminEdit.id, fd) : upload('POST', '/api/agrovet/livestock-diseases', fd);
      p.then(function () {
        toast('Disease saved');
        closeModal('livestockDiseaseModal');
        adminEdit = { type: null, id: null };
        setAdminTab('livestock');
        if ($('page-agrovet').classList.contains('active')) loadAgrovetPage();
      }).catch(function (err) { toast(err.message, 'error'); })
        .finally(function () { setBtnLoading(btn, false); });
    });

    /* ---- Guide form ---- */
    var gf = $('guideForm');
    if (gf) gf.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('fgSubmit'); setBtnLoading(btn, true);
      var fd = new FormData();
      fd.append('title', $('fgTitle').value);
      fd.append('category', $('fgCategory').value);
      fd.append('content', $('fgContent').value);
      var img = $('fgImage').files[0];
      if (img) fd.append('agrovet_image', img);
      var p = adminEdit.id ? upload('PUT', '/api/agrovet/guides/' + adminEdit.id, fd) : upload('POST', '/api/agrovet/guides', fd);
      p.then(function () {
        toast('Guide saved');
        closeModal('guideModal');
        adminEdit = { type: null, id: null };
        setAdminTab('guides');
        if ($('page-agrovet').classList.contains('active')) loadAgrovetPage();
      }).catch(function (err) { toast(err.message, 'error'); })
        .finally(function () { setBtnLoading(btn, false); });
    });
  });

  /* ===================================================================
     EXPOSE GLOBALS (for inline onclick handlers)
     =================================================================== */
  window.loadMarketplacePage = loadMarketplacePage;
  window.openProductModal = openProductModal;
  window.closeProductModal = closeProductModal;
  window.editProduct = editProduct;
  window.deleteProduct = deleteProduct;
  window.markSold = markSold;
  window.openProductDetail = openProductDetail;
  window.pdSetImage = pdSetImage;
  window.mpGoPage = mpGoPage;

  window.loadAgrovetPage = loadAgrovetPage;
  window.setAgvTab = function (t) {
    agvTab = t;
    document.querySelectorAll('.agv-tab[data-agv]').forEach(function (b) { b.classList.toggle('active', b.dataset.agv === t); });
    loadAgrovetPage();
  };
  window.toggleAgvDetail = toggleAgvDetail;

  window.loadEventsPage = loadEventsPage;
  window.openEventModal = openEventModal;
  window.editEvent = editEvent;
  window.deleteEvent = deleteEvent;
  window.evGoPage = evGoPage;

  window.loadContractorsPage = loadContractorsPage;
  window.openContractorModal = openContractorModal;
  window.editContractor = editContractor;
  window.deleteContractor = deleteContractor;
  window.becomeContractor = becomeContractor;
  window.openMyContractor = openMyContractor;
  window.ctGoPage = ctGoPage;

  window.loadAdminPage = loadAdminPage;
  window.setAdminTab = setAdminTab;
  window.approveProduct = approveProduct;
  window.rejectProduct = rejectProduct;
  window.openArticleModal = openArticleModal;
  window.openCropDiseaseModal = openCropDiseaseModal;
  window.openLivestockDiseaseModal = openLivestockDiseaseModal;
  window.openGuideModal = openGuideModal;
  window.deleteAgvItem = deleteAgvItem;
})();
