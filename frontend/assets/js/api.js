const API = {
  BASE_URL: 'http://localhost:5000',

  getToken() {
    return localStorage.getItem('kiboe_token');
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(this.BASE_URL + path, options);
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error('Server returned an invalid response');
    }
    if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
    return data;
  },

  // ===== Auth =====
  register(user) { return this.request('POST', '/api/auth/register', user); },
  login(credentials) { return this.request('POST', '/api/auth/login', credentials); },
  getProfile() { return this.request('GET', '/api/auth/profile'); },
  updateProfile(data) { return this.request('PUT', '/api/auth/profile', data); },
  changePassword(data) { return this.request('PUT', '/api/auth/password', data); },
  forgotPassword(email) { return this.request('POST', '/api/auth/forgot', { email }); },
  resetPassword(token, new_password) { return this.request('POST', '/api/auth/reset', { token, new_password }); },
  async uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(this.BASE_URL + '/api/auth/profile-picture', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + this.getToken() }, body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },

  // ===== Crops =====
  getCrops(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/crops' + (q ? '?' + q : ''));
  },
  getCrop(id) { return this.request('GET', '/api/crops/' + id); },
  createCrop(data) { return this.request('POST', '/api/crops', data); },
  updateCrop(id, data) { return this.request('PUT', '/api/crops/' + id, data); },
  deleteCrop(id) { return this.request('DELETE', '/api/crops/' + id); },
  getCropSummary() { return this.request('GET', '/api/crops/summary'); },

  // ===== Livestock =====
  getLivestock(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/livestock' + (q ? '?' + q : ''));
  },
  getLivestockById(id) { return this.request('GET', '/api/livestock/' + id); },
  createLivestock(data) { return this.request('POST', '/api/livestock', data); },
  updateLivestock(id, data) { return this.request('PUT', '/api/livestock/' + id, data); },
  deleteLivestock(id) { return this.request('DELETE', '/api/livestock/' + id); },
  getVaccinations(id) { return this.request('GET', '/api/livestock/' + id + '/vaccinations'); },
  createVaccination(id, data) { return this.request('POST', '/api/livestock/' + id + '/vaccinations', data); },
  getMilkProduction(id) { return this.request('GET', '/api/livestock/' + id + '/milk'); },
  addMilk(id, data) { return this.request('POST', '/api/livestock/' + id + '/milk', data); },
  getLivestockSummary() { return this.request('GET', '/api/livestock/summary'); },
  getBreedingRecords(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/livestock/breeding' + (q ? '?' + q : ''));
  },
  getBreedingSummary() { return this.request('GET', '/api/livestock/breeding/summary'); },
  getLivestockBreeding(id) { return this.request('GET', '/api/livestock/' + id + '/breeding'); },
  createBreedingRecord(livestockId, data) { return this.request('POST', '/api/livestock/' + livestockId + '/breeding', data); },
  updateBreedingRecord(id, data) { return this.request('PUT', '/api/livestock/breeding/' + id, data); },
  deleteBreedingRecord(id) { return this.request('DELETE', '/api/livestock/breeding/' + id); },

  // ===== Transactions =====
  getTransactions(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/transactions' + (q ? '?' + q : ''));
  },
  getTransaction(id) { return this.request('GET', '/api/transactions/' + id); },
  createTransaction(data) { return this.request('POST', '/api/transactions', data); },
  updateTransaction(id, data) { return this.request('PUT', '/api/transactions/' + id, data); },
  deleteTransaction(id) { return this.request('DELETE', '/api/transactions/' + id); },
  getTransactionSummary(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/transactions/summary' + (q ? '?' + q : ''));
  },

  // ===== Farm Records =====
  getFarmRecords(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/farm-records' + (q ? '?' + q : ''));
  },
  getFarmRecord(id) { return this.request('GET', '/api/farm-records/' + id); },
  createFarmRecord(data) { return this.request('POST', '/api/farm-records', data); },
  updateFarmRecord(id, data) { return this.request('PUT', '/api/farm-records/' + id, data); },
  deleteFarmRecord(id) { return this.request('DELETE', '/api/farm-records/' + id); },

  // ===== Notifications =====
  getNotifications() { return this.request('GET', '/api/notifications'); },
  getUnreadCount() { return this.request('GET', '/api/notifications/unread-count'); },
  markAsRead(id) { return this.request('PUT', '/api/notifications/' + id + '/read'); },
  markAllAsRead() { return this.request('PUT', '/api/notifications/read-all'); },

  // ===== Predictions =====
  getPredictions() { return this.request('GET', '/api/predictions'); },
  getActivePredictions() { return this.request('GET', '/api/predictions/active'); },
  createPrediction(data) { return this.request('POST', '/api/predictions', data); },

  // ===== Reports =====
  getReportSummary() { return this.request('GET', '/api/reports/summary'); },

  // ===== Supplies =====
  getSupplies(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/supplies' + (q ? '?' + q : ''));
  },
  getSupply(id) { return this.request('GET', '/api/supplies/' + id); },
  createSupply(data) { return this.request('POST', '/api/supplies', data); },
  updateSupply(id, data) { return this.request('PUT', '/api/supplies/' + id, data); },
  deleteSupply(id) { return this.request('DELETE', '/api/supplies/' + id); },

  // ===== Tasks =====
  getTasks(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/tasks' + (q ? '?' + q : ''));
  },
  getTask(id) { return this.request('GET', '/api/tasks/' + id); },
  getUpcomingTasks() { return this.request('GET', '/api/tasks/upcoming'); },
  createTask(data) { return this.request('POST', '/api/tasks', data); },
  updateTask(id, data) { return this.request('PUT', '/api/tasks/' + id, data); },
  deleteTask(id) { return this.request('DELETE', '/api/tasks/' + id); },
  completeTask(id) { return this.request('POST', '/api/tasks/' + id + '/complete'); },

  // ===== Marketplace =====
  getListings(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/marketplace' + (q ? '?' + q : ''));
  },
  getListing(id) { return this.request('GET', '/api/marketplace/' + id); },
  getMyListings() { return this.request('GET', '/api/marketplace/mine/listings'); },
  createListing(formData) {
    return this.upload('/api/marketplace', formData);
  },
  updateListing(id, formData) {
    return this.upload('/api/marketplace/' + id, formData, 'PUT');
  },
  deleteListing(id) { return this.request('DELETE', '/api/marketplace/' + id); },
  markSold(id) { return this.request('POST', '/api/marketplace/' + id + '/sold'); },

  // ===== Agrovet (public knowledge centre) =====
  getAgrovetArticles(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/agrovet/articles' + (q ? '?' + q : ''));
  },
  getAgrovetArticle(id) { return this.request('GET', '/api/agrovet/articles/' + id); },
  getAgrovetCropDiseases(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/agrovet/crop-diseases' + (q ? '?' + q : ''));
  },
  getAgrovetLivestockDiseases(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/agrovet/livestock-diseases' + (q ? '?' + q : ''));
  },
  getAgrovetGuides(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/agrovet/guides' + (q ? '?' + q : ''));
  },

  // ===== Events =====
  getEvents(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/events' + (q ? '?' + q : ''));
  },
  getEvent(id) { return this.request('GET', '/api/events/' + id); },

  // ===== Contractors =====
  getContractors(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/api/contractors' + (q ? '?' + q : ''));
  },
  getContractor(id) { return this.request('GET', '/api/contractors/' + id); },
  getContractorServices() { return this.request('GET', '/api/contractors/services'); },

  // ===== Contact =====
  sendContact(msg) { return this.request('POST', '/api/contact', msg); },

  // ===== Upload helper (multipart) =====
  upload(path, formData, method) {
    const h = {};
    const t = this.getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return fetch(this.BASE_URL + path, { method: method || 'POST', headers: h, body: formData })
      .then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d.message || d.error || 'Request failed');
          return d;
        });
      });
  }
};

window.API = API;
