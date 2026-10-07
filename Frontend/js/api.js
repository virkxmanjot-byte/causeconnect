/* ==========================================================================
   CauseConnect - api.js
   Backend API client for Java/JDBC MySQL Backend.
   Connect People. Fund Causes. Create Impact.
   ========================================================================== */

const API_BASE = window.CAUSECONNECT_API_BASE || 'http://localhost:8080/api';

/* ---------- Asynchronous Backend API Layer ---------- */
const API = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const contentType = response.headers.get("content-type") || "";
      let data = null;
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = text;
        }
      }

      if (!response.ok) {
        const errorMsg = (data && data.error) ? data.error : `HTTP error ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${options.method || 'GET'} ${endpoint}:`, err);
      throw err;
    }
  },

  /* Campaign Endpoints */
  async getCampaigns(params = {}) {
    let query = "";
    const searchParams = new URLSearchParams();
    if (params.status && params.status !== "All") {
      searchParams.set("status", params.status);
    }
    if (params.creator_id) {
      searchParams.set("creator_id", params.creator_id);
    }
    const qs = searchParams.toString();
    if (qs) query = `?${qs}`;

    try {
      let list = await this.request(`/campaigns${query}`, { method: 'GET' });
      if (!Array.isArray(list)) list = [];

      // Optional in-memory category filter if requested
      if (params.category && params.category !== 'All') {
        list = list.filter(c => (c.category || '').toLowerCase() === params.category.toLowerCase());
      }
      return list;
    } catch (e) {
      console.error("Failed to load campaigns from backend:", e);
      return [];
    }
  },

  async getCampaignById(id) {
    try {
      return await this.request(`/campaigns/${id}`, { method: 'GET' });
    } catch (e) {
      console.error(`Failed to load campaign ${id}:`, e);
      return null;
    }
  },

  async createCampaign(data) {
    return await this.request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateCampaign(id, data) {
    return await this.request(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteCampaign(id) {
    return await this.request(`/campaigns/${id}`, {
      method: 'DELETE'
    });
  },

  async updateCampaignStatus(id, status) {
    return await this.request(`/campaigns/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: status.toUpperCase() })
    });
  },

  /* Contribution Endpoints */
  async getContributions(campaignId = null, userId = null) {
    let endpoint = '/contributions';
    const params = new URLSearchParams();
    if (campaignId) params.set("campaign_id", campaignId);
    if (userId) params.set("user_id", userId);
    const qs = params.toString();
    if (qs) endpoint += `?${qs}`;

    try {
      const res = await this.request(endpoint, { method: 'GET' });
      return Array.isArray(res) ? res : [];
    } catch (e) {
      console.error("Failed to load contributions:", e);
      return [];
    }
  },

  async createContribution(data) {
    return await this.request('/contributions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteContribution(id) {
    return await this.request(`/contributions/${id}`, {
      method: 'DELETE'
    });
  },

  /* Campaign Update Endpoints */
  async getUpdates(campaignId = null) {
    let endpoint = '/updates';
    if (campaignId) endpoint += `?campaign_id=${campaignId}`;

    try {
      const res = await this.request(endpoint, { method: 'GET' });
      return Array.isArray(res) ? res : [];
    } catch (e) {
      console.error("Failed to load campaign updates:", e);
      return [];
    }
  },

  async createUpdate(data) {
    return await this.request('/updates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteUpdate(id) {
    return await this.request(`/updates/${id}`, {
      method: 'DELETE'
    });
  },

  /* User Endpoints */
  async getUsers() {
    try {
      const res = await this.request('/users', { method: 'GET' });
      return Array.isArray(res) ? res : [];
    } catch (e) {
      console.error("Failed to load users:", e);
      return [];
    }
  },

  async getUserById(id) {
    try {
      return await this.request(`/users/${id}`, { method: 'GET' });
    } catch (e) {
      return null;
    }
  },

  async updateUser(id, data) {
    return await this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteUser(id) {
    return await this.request(`/users/${id}`, {
      method: 'DELETE'
    });
  },

  /* Platform Statistics */
  async getStats() {
    try {
      return await this.request('/stats', { method: 'GET' });
    } catch (e) {
      console.error("Failed to load stats from backend:", e);
      return {
        totalRaised: 0,
        totalCampaigns: 0,
        activeCampaigns: 0,
        pendingCampaigns: 0,
        contributionsCount: 0,
        usersCount: 0
      };
    }
  }
};

/* Compatibility functions for any synchronous references */
async function getCampaignsByCreator(creatorId) {
  return await API.getCampaigns({ creator_id: creatorId });
}

async function getContributionsByUser(userId) {
  return await API.getContributions(null, userId);
}
