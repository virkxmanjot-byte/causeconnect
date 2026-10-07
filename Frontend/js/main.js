/* ==========================================================================
   CauseConnect - main.js
   Common UI, layouts, navigation, animations, and page controllers.
   Connect People. Fund Causes. Create Impact.
   ========================================================================== */

/* ---------- Helpers & Formatters ---------- */

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return "₹" + num.toLocaleString("en-IN");
}

function formatDate(dateStr) {
  if (!dateStr) return "Recent";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function progressPercent(raised, goal) {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round(((Number(raised) || 0) / Number(goal)) * 100));
}

function statusBadgeClass(status) {
  const s = String(status).toLowerCase();
  if (s === "approved") return "badge-success";
  if (s === "pending") return "badge-warning";
  if (s === "rejected") return "badge-danger";
  return "badge-info";
}

function initials(name) {
  if (!name) return "CC";
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

const CATEGORY_ICONS = {
  Education: "📚",
  Medical: "🏥",
  Emergency: "🚨",
  Community: "🏘️",
  Other: "🐾",
  Environment: "🌱"
};

/* ---------- Toast Notification System ---------- */

function showToast(message, type = "success", duration = 3200) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const icons = {
    success: "✨",
    danger: "⚠️",
    error: "⚠️",
    warning: "⚡",
    info: "ℹ️"
  };

  const toast = document.createElement("div");
  const normalizedType = (type === "danger" || type === "error") ? "danger" : (type === "info" ? "info" : (type === "warning" ? "warning" : "success"));
  toast.className = `toast toast-${normalizedType}`;
  toast.innerHTML = `
    <span style="font-size:1.2rem; flex-shrink:0;">${icons[normalizedType] || "✨"}</span>
    <span style="flex:1; line-height:1.4;">${message}</span>
    <span class="toast-progress" style="animation-duration:${duration}ms;"></span>
  `;

  container.appendChild(toast);

  // Trigger smooth entrance
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });
  });

  const dismissTimer = setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 320);
  }, duration);

  toast.addEventListener("click", () => {
    clearTimeout(dismissTimer);
    toast.classList.remove("show");
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 320);
  });
}

/* ---------- Number Count-Up Animation ---------- */

function animateCounter(el, target, isCurrency = false, duration = 1200) {
  if (!el) return;
  const targetNum = Number(target) || 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Smooth ease-out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(targetNum * ease);

    el.textContent = isCurrency ? formatCurrency(current) : current.toLocaleString("en-IN");

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = isCurrency ? formatCurrency(targetNum) : targetNum.toLocaleString("en-IN");
    }
  }

  requestAnimationFrame(update);
}

/* ---------- Campaign Progress Animation ---------- */

function animateProgressBars(root = document) {
  const bars = root.querySelectorAll(".progress-fill");
  requestAnimationFrame(() => {
    bars.forEach(bar => {
      const target = bar.getAttribute("data-pct") || (bar.style.width ? parseFloat(bar.style.width) : 0);
      bar.style.width = "0%";
      setTimeout(() => {
        bar.style.width = Math.min(100, Math.max(0, target)) + "%";
      }, 60);
    });
  });
}

/* ---------- Scroll Reveal Engine ---------- */

function initScrollReveal(root = document) {
  const revealElements = root.querySelectorAll(".reveal, .reveal-up, .reveal-fade, .reveal-scale, .reveal-left, .reveal-right");
  if (!revealElements.length) return;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          // Trigger progress bars inside revealed element
          animateProgressBars(entry.target);
          // Trigger any animated counters inside with data-counter-target
          entry.target.querySelectorAll("[data-counter-target]").forEach(cnt => {
            const val = parseFloat(cnt.getAttribute("data-counter-target"));
            const isCurr = cnt.getAttribute("data-counter-currency") === "true";
            animateCounter(cnt, val, isCurr);
          });
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: "0px 0px -20px 0px"
    });

    revealElements.forEach(el => observer.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add("revealed"));
    animateProgressBars(root);
  }
}

/* ---------- Navbar Scroll Animation ---------- */

function initNavbarAnimation() {
  const navbar = document.getElementById("site-navbar");
  if (!navbar) return;

  const handleScroll = () => {
    if (window.scrollY > 15) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
}

/* ---------- Shared Navbar Component ---------- */

function renderNavbar(activePage = "") {
  const mount = document.getElementById("navbar-mount");
  if (!mount) return;
  const session = Auth.getSession();

  const links = [
    { href: "index.html", label: "Home", key: "home" },
    { href: "campaigns.html", label: "Browse Causes", key: "campaigns" },
    { href: "create-campaign.html", label: "Start a Cause", key: "create" },
    { href: "campaign-updates.html", label: "Updates", key: "updates" },
    { href: session ? (session.role === "admin" ? "admin-dashboard.html" : "creator-dashboard.html") : "login.html", label: "Dashboard", key: "dashboard" }
  ];

  const linksHtml = links.map(l =>
    `<a href="${l.href}" class="${activePage === l.key ? "active" : ""}">${l.label}</a>`
  ).join("");

  const authHtml = session
    ? `<div class="navbar-user-wrap">
         <a href="${session.role === 'admin' ? 'admin-dashboard.html' : 'profile.html'}" class="navbar-user">
           <span class="avatar">${initials(session.name)}</span>
           <span class="user-name">${session.name.split(" ")[0]}</span>
         </a>
         <button class="btn btn-secondary btn-sm" id="logout-btn">Log Out</button>
       </div>`
    : `<div class="navbar-actions-group">
         <a href="login.html" class="btn btn-secondary btn-sm">Log In</a>
         <a href="register.html" class="btn btn-primary btn-sm">Sign Up</a>
       </div>`;

  mount.innerHTML = `
    <nav class="navbar" id="site-navbar">
      <div class="container">
        <a href="index.html" class="navbar-logo" title="CauseConnect - Connect People. Fund Causes. Create Impact.">
          <img src="assets/images/logo.png" alt="CauseConnect Logo" class="navbar-logo-img" onerror="this.style.display='none'; document.getElementById('logo-fallback').style.display='flex';">
          <div id="logo-fallback" class="navbar-logo-fallback" style="display:none;">🌱</div>
          <div class="navbar-logo-text">
            <span class="brand">Cause<span>Connect</span></span>
            <span class="tagline">Connect People · Fund Causes · Create Impact</span>
          </div>
        </a>
        <div class="navbar-links">${linksHtml}</div>
        <div class="navbar-actions">${authHtml}</div>
        <button class="navbar-toggle" id="navbar-toggle" aria-label="Toggle navigation menu">
          <span></span><span></span><span></span>
        </button>
      </div>
      <div class="navbar-mobile-panel" id="navbar-mobile-panel">
        ${linksHtml}
        <div class="mobile-auth-row">${authHtml}</div>
      </div>
    </nav>
  `;

  const toggleBtn = document.getElementById("navbar-toggle");
  const panel = document.getElementById("navbar-mobile-panel");
  if (toggleBtn && panel) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.classList.toggle("open");
      toggleBtn.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (!toggleBtn.contains(e.target) && !panel.contains(e.target)) {
        panel.classList.remove("open");
        toggleBtn.classList.remove("open");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        panel.classList.remove("open");
        toggleBtn.classList.remove("open");
      }
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      Auth.clearSession();
      showToast("Logged out successfully");
      setTimeout(() => window.location.href = "index.html", 400);
    });
  }

  initNavbarAnimation();
}

/* ---------- Shared Footer Component ---------- */

function renderFooter() {
  const mount = document.getElementById("footer-mount");
  if (!mount) return;

  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand">
              <img src="assets/images/logo.png" alt="CauseConnect" class="footer-logo-img">
              <div class="footer-brand-text">
                <span class="footer-brand-title">CauseConnect</span>
                <span class="footer-tagline">Connect People. Fund Causes. Create Impact.</span>
              </div>
            </div>
            <p class="footer-desc mt-16">
              A transparent social crowdfunding ecosystem uniting compassionate donors with changemakers driving education, healthcare, disaster relief, and grassroots initiatives.
            </p>
          </div>
          <div>
            <h4>Explore Causes</h4>
            <ul>
              <li><a href="campaigns.html?category=Education">📚 Education</a></li>
              <li><a href="campaigns.html?category=Medical">🏥 Medical Relief</a></li>
              <li><a href="campaigns.html?category=Emergency">🚨 Emergency Aid</a></li>
              <li><a href="campaigns.html?category=Community">🏘️ Community Welfare</a></li>
              <li><a href="campaigns.html?category=Other">🐾 Animal Protection</a></li>
            </ul>
          </div>
          <div>
            <h4>Changemakers</h4>
            <ul>
              <li><a href="create-campaign.html">Start a Campaign</a></li>
              <li><a href="creator-dashboard.html">Creator Dashboard</a></li>
              <li><a href="my-campaigns.html">Manage Causes</a></li>
              <li><a href="campaign-updates.html">Post Cause Updates</a></li>
            </ul>
          </div>
          <div>
            <h4>Contributors</h4>
            <ul>
              <li><a href="contributor-dashboard.html">Contributor Dashboard</a></li>
              <li><a href="my-contributions.html">Donation History</a></li>
              <li><a href="campaign-updates.html">Track Cause Updates</a></li>
              <li><a href="admin-login.html">Admin Portal</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2026 CauseConnect. Connect People. Fund Causes. Create Impact. All rights reserved.</p>
        </div>
      </div>
    </footer>
  `;
}

/* ---------- Dashboard Sidebars ---------- */

function renderDashboardSidebar(activePage = "") {
  const session = Auth.getSession();
  if (session && session.role === "contributor") {
    renderContributorSidebar(activePage);
  } else {
    renderCreatorSidebar(activePage);
  }
}

function renderCreatorSidebar(activePage = "") {
  const mount = document.getElementById("dashboard-sidebar-mount");
  if (!mount) return;
  const session = Auth.requireLogin();
  if (!session) return;

  const items = [
    { href: "creator-dashboard.html", label: "Overview", key: "dashboard", icon: "📊" },
    { href: "my-campaigns.html", label: "My Causes", key: "my-campaigns", icon: "🌱" },
    { href: "create-campaign.html", label: "Start a Cause", key: "create-campaign", icon: "➕" },
    { href: "campaign-updates.html", label: "Cause Updates", key: "updates", icon: "📢" },
    { href: "contributor-dashboard.html", label: "Contributor View", key: "contributor-dashboard", icon: "🤝" },
    { href: "profile.html", label: "Profile", key: "profile", icon: "👤" }
  ];

  mount.innerHTML = `
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-user">
        <span class="avatar">${initials(session.name)}</span>
        <div>
          <div class="name">${session.name}</div>
          <div class="role">${session.role === "admin" ? "Platform Administrator" : "Cause Changemaker"}</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        <span class="nav-section-label">Creator Menu</span>
        ${items.map(i => `<a href="${i.href}" class="${activePage === i.key ? "active" : ""}">${i.icon} ${i.label}</a>`).join("")}
        <span class="nav-section-label">Quick Action</span>
        <a href="campaigns.html">🌍 Explore Public Causes</a>
        <a href="#" id="side-logout">🚪 Log Out</a>
      </nav>
    </aside>
  `;

  const logoutBtn = document.getElementById("side-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      Auth.clearSession();
      window.location.href = "index.html";
    });
  }
  initSidebarMobileToggle();
}

function renderContributorSidebar(activePage = "") {
  const mount = document.getElementById("dashboard-sidebar-mount");
  if (!mount) return;
  const session = Auth.requireLogin();
  if (!session) return;

  const items = [
    { href: "contributor-dashboard.html", label: "Overview", key: "dashboard", icon: "📊" },
    { href: "my-contributions.html", label: "My Donations", key: "my-contributions", icon: "🤝" },
    { href: "campaign-updates.html", label: "Cause Updates", key: "updates", icon: "📢" },
    { href: "campaigns.html", label: "Explore Causes", key: "campaigns", icon: "🌍" },
    { href: "creator-dashboard.html", label: "Creator View", key: "creator-dashboard", icon: "🌱" },
    { href: "profile.html", label: "Profile", key: "profile", icon: "👤" }
  ];

  mount.innerHTML = `
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-user">
        <span class="avatar">${initials(session.name)}</span>
        <div>
          <div class="name">${session.name}</div>
          <div class="role">${session.role === "admin" ? "Platform Administrator" : "Impact Contributor"}</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        <span class="nav-section-label">Contributor Menu</span>
        ${items.map(i => `<a href="${i.href}" class="${activePage === i.key ? "active" : ""}">${i.icon} ${i.label}</a>`).join("")}
        <span class="nav-section-label">Quick Action</span>
        <a href="create-campaign.html">➕ Start a Cause</a>
        <a href="#" id="side-logout">🚪 Log Out</a>
      </nav>
    </aside>
  `;

  const logoutBtn = document.getElementById("side-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      Auth.clearSession();
      window.location.href = "index.html";
    });
  }
  initSidebarMobileToggle();
}

function renderAdminSidebar(activePage = "") {
  const mount = document.getElementById("admin-sidebar-mount");
  if (!mount) return;
  const session = Auth.requireAdmin();
  if (!session) return;

  const items = [
    { href: "admin-dashboard.html", label: "Dashboard", key: "dashboard", icon: "⚡" },
    { href: "admin-campaigns.html", label: "Campaigns", key: "campaigns", icon: "📢" },
    { href: "admin-users.html", label: "Users", key: "users", icon: "👥" },
    { href: "admin-contributions.html", label: "Contributions", key: "contributions", icon: "💰" },
    { href: "admin-reports.html", label: "Analytics", key: "reports", icon: "📈" },
    { href: "admin-settings.html", label: "Settings", key: "settings", icon: "⚙️" }
  ];

  mount.innerHTML = `
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-user">
        <span class="avatar">${initials(session.name)}</span>
        <div>
          <div class="name">${session.name}</div>
          <div class="role">Platform Admin</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        <span class="nav-section-label">Administration</span>
        ${items.map(i => `<a href="${i.href}" class="${activePage === i.key ? "active" : ""}">${i.icon} ${i.label}</a>`).join("")}
        <span class="nav-section-label">System</span>
        <a href="index.html">🌐 View Public Portal</a>
        <a href="#" id="admin-logout">🚪 Log Out</a>
      </nav>
    </aside>
  `;

  const logoutBtn = document.getElementById("admin-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      Auth.clearSession();
      window.location.href = "admin-login.html";
    });
  }
  initSidebarMobileToggle();
}

function initSidebarMobileToggle() {
  const toggleBtn = document.querySelector(".sidebar-mobile-toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      if (overlay) overlay.classList.toggle("active");
    });
  }
  if (overlay && sidebar) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    });
  }
}

/* ---------- Reusable Component Renderers ---------- */

function renderCampaignCard(c) {
  const pct = progressPercent(c.raised_amount, c.goal_amount);
  const icon = CATEGORY_ICONS[c.category] || "🌱";
  return `
    <div class="campaign-card reveal" data-id="${c.campaign_id}">
      <div class="campaign-card-media">
        <span class="card-media-icon">${icon}</span>
        <span class="card-cat-pill">${c.category}</span>
      </div>
      <div class="campaign-card-body">
        <a href="campaign-details.html?id=${c.campaign_id}" class="campaign-card-title">${c.title}</a>
        <p class="campaign-card-desc">${c.description.slice(0, 95)}${c.description.length > 95 ? "…" : ""}</p>
        <div class="progress-wrap">
          <div class="progress-track"><div class="progress-fill" data-pct="${pct}" style="width:0%"></div></div>
          <div class="progress-meta">
            <span><strong>${formatCurrency(c.raised_amount)}</strong> raised</span>
            <span class="pct-badge">${pct}%</span>
          </div>
          <div class="goal-subtext">of ${formatCurrency(c.goal_amount)} goal</div>
        </div>
        <div class="campaign-card-footer">
          <span class="badge ${statusBadgeClass(c.status)}">${c.status}</span>
          <a href="campaign-details.html?id=${c.campaign_id}" class="btn btn-primary btn-sm">View Cause</a>
        </div>
      </div>
    </div>
  `;
}

function renderCampaignRow(c, options = {}) {
  const pct = progressPercent(c.raised_amount, c.goal_amount);
  const actions = options.showManageActions
    ? `<td class="row-actions">
         <a href="create-campaign.html?edit=${c.campaign_id}" class="icon-btn" title="Edit Cause">✎</a>
         <a href="campaign-updates.html?campaign_id=${c.campaign_id}" class="icon-btn" title="Post Update">📢</a>
         <button class="icon-btn danger" title="Delete Cause" onclick="handleDeleteMyCampaign(${c.campaign_id})">🗑</button>
       </td>`
    : "";
  return `
    <tr>
      <td><a href="campaign-details.html?id=${c.campaign_id}" style="font-weight:600; color:var(--color-primary);">${c.title}</a></td>
      <td><span class="chip-sm">${c.category}</span></td>
      <td><strong>${formatCurrency(c.goal_amount)}</strong></td>
      <td>${formatCurrency(c.raised_amount)} <span class="text-gray" style="font-size:0.8rem;">(${pct}%)</span></td>
      <td><span class="badge ${statusBadgeClass(c.status)}">${c.status}</span></td>
      <td>${formatDate(c.created_date)}</td>
      ${actions}
    </tr>
  `;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* =========================================================================
   1. Homepage Controller (index.html)
   ========================================================================= */

async function initHomePage() {
  const campaigns = (await API.getCampaigns()).filter(c => c.status === "Approved");
  const contributions = await API.getContributions();
  const totalRaised = campaigns.reduce((sum, c) => sum + (Number(c.raised_amount) || 0), 0);

  const raisedEl = document.getElementById("stat-raised");
  const campEl = document.getElementById("stat-campaigns");
  const backersEl = document.getElementById("stat-backers");

  if (raisedEl) animateCounter(raisedEl, totalRaised, true, 1400);
  if (campEl) animateCounter(campEl, campaigns.length, false, 1100);
  if (backersEl) animateCounter(backersEl, contributions.length, false, 1300);

  const previewCardEl = document.getElementById("hero-preview-card");
  if (previewCardEl && campaigns.length) {
    const featured = campaigns.slice().sort((a, b) => (b.raised_amount / b.goal_amount) - (a.raised_amount / a.goal_amount))[0];
    previewCardEl.innerHTML = renderCampaignCard(featured);
  }

  const featGrid = document.getElementById("featured-campaigns");
  if (featGrid) {
    const top3 = campaigns
      .slice()
      .sort((a, b) => (b.raised_amount / b.goal_amount) - (a.raised_amount / a.goal_amount))
      .slice(0, 3);
    featGrid.innerHTML = top3.map(renderCampaignCard).join("");
  }

  animateProgressBars();
  initScrollReveal();
}

/* =========================================================================
   2. Explore Campaigns Controller (campaigns.html)
   ========================================================================= */

async function initCampaignsPage() {
  const grid = document.getElementById("campaigns-grid");
  if (!grid) return;

  const searchInput = document.getElementById("search-input");
  const categoryChips = document.querySelectorAll("#category-chips .chip");
  const sortSelect = document.getElementById("sort-select");
  const emptyState = document.getElementById("empty-state");
  const resultCount = document.getElementById("result-count");

  let activeCategory = getQueryParam("category") || "All";
  const allCampaigns = await API.getCampaigns();

  function applyFilters() {
    let list = allCampaigns.filter(c => c.status === "Approved");

    if (activeCategory && activeCategory !== "All") {
      list = list.filter(c => c.category.toLowerCase() === activeCategory.toLowerCase());
    }

    const query = (searchInput.value || "").trim().toLowerCase();
    if (query) {
      list = list.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query)
      );
    }

    const sortBy = sortSelect ? sortSelect.value : "newest";
    if (sortBy === "newest") list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    if (sortBy === "goal-high") list.sort((a, b) => b.goal_amount - a.goal_amount);
    if (sortBy === "goal-low") list.sort((a, b) => a.goal_amount - b.goal_amount);
    if (sortBy === "progress") list.sort((a, b) => (b.raised_amount / b.goal_amount) - (a.raised_amount / a.goal_amount));

    if (resultCount) {
      resultCount.textContent = `${list.length} cause${list.length === 1 ? "" : "s"} found`;
    }

    if (list.length === 0) {
      grid.innerHTML = "";
      if (emptyState) emptyState.classList.remove("hidden");
    } else {
      if (emptyState) emptyState.classList.add("hidden");
      grid.innerHTML = list.map(renderCampaignCard).join("");
      animateProgressBars(grid);
      initScrollReveal(grid);
    }

    categoryChips.forEach(chip => {
      chip.classList.toggle("active", chip.dataset.category === activeCategory);
    });
  }

  categoryChips.forEach(chip => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.category;
      applyFilters();
    });
  });

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (sortSelect) sortSelect.addEventListener("change", applyFilters);

  applyFilters();
}

/* =========================================================================
   3. Campaign Details Controller (campaign-details.html)
   ========================================================================= */

async function initCampaignDetailsPage() {
  const root = document.getElementById("details-root");
  if (!root) return;

  const id = getQueryParam("id");
  const campaign = await API.getCampaignById(id);

  if (!campaign) {
    root.innerHTML = `
      <div class="empty-state">
        <h3>Cause Not Found</h3>
        <p>The requested campaign may have been removed or does not exist.</p>
        <a href="campaigns.html" class="btn btn-primary mt-16">Browse All Causes</a>
      </div>
    `;
    return;
  }

  const pct = progressPercent(campaign.raised_amount, campaign.goal_amount);
  const contributions = await API.getContributions(campaign.campaign_id);
  const updates = await API.getUpdates(campaign.campaign_id);
  const users = await API.getUsers();
  const session = Auth.getSession();
  const isCreator = session && session.user_id === campaign.creator_id;

  document.title = `${campaign.title} - CauseConnect`;

  root.innerHTML = `
    <div class="details-layout">
      <div>
        <div class="details-media">
          <span style="font-size:4.5rem;">${CATEGORY_ICONS[campaign.category] || "🌱"}</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          <span class="badge ${statusBadgeClass(campaign.status)}">${campaign.status}</span>
          <span class="chip-sm">${campaign.category}</span>
          <span class="text-gray" style="font-size:0.85rem;">Created ${formatDate(campaign.created_date)}</span>
        </div>
        <h1 class="mb-16">${campaign.title}</h1>

        <div class="details-tabs">
          <button class="active" data-tab="story">Story</button>
          <button data-tab="contributors">Supporters (${contributions.length})</button>
          <button data-tab="updates">Updates (${updates.length})</button>
        </div>

        <div class="tab-panel active" data-panel="story">
          <div class="story-content" style="font-size:1.05rem; line-height:1.7; color:#334155;">
            ${campaign.description.split('\n').map(p => `<p class="mb-16">${p}</p>`).join('')}
          </div>
        </div>

        <div class="tab-panel" data-panel="contributors">
          ${contributions.length ? `
            <div class="contrib-list">
              ${contributions.map(ct => {
                const u = users.find(user => user.user_id === ct.user_id);
                return `
                  <div class="contrib-list-item">
                    <div style="display:flex; align-items:center; gap:12px;">
                      <div class="avatar" style="width:36px; height:36px; font-size:0.85rem;">${initials(u ? u.name : "Anonymous")}</div>
                      <div>
                        <div class="name">${u ? u.name : "Compassionate Supporter"}</div>
                        <div class="date">${formatDate(ct.contribution_date)}</div>
                      </div>
                    </div>
                    <span style="font-weight:700; color:var(--color-primary); font-size:1rem;">${formatCurrency(ct.amount)}</span>
                  </div>
                `;
              }).join("")}
            </div>
          ` : `<p class="text-gray py-24">Be the very first champion to back this cause!</p>`}
        </div>

        <div class="tab-panel" data-panel="updates">
          ${isCreator ? `
            <div class="post-update-card mb-24" style="background:#F8FAFC; border:1px solid #E2E8F0; padding:18px; border-radius:12px;">
              <h4 class="mb-8">📢 Post an Update to Supporters</h4>
              <form id="post-update-form">
                <input type="text" name="update_title" class="input mb-8" placeholder="Update Headline (e.g. Relief Kits Delivered)" required>
                <textarea name="update_message" class="input mb-8" placeholder="Share progress photos description or milestone reached..." required style="min-height:80px;"></textarea>
                <button type="submit" class="btn btn-primary btn-sm">Publish Update</button>
              </form>
            </div>
          ` : ""}

          <div id="updates-feed">
            ${updates.length ? updates.map(up => `
              <div class="update-feed-card mb-16" style="background:#fff; border:1px solid var(--color-border); border-radius:12px; padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <h4 style="color:var(--color-dark);">${up.title}</h4>
                  <span class="text-gray" style="font-size:0.8rem;">${formatDate(up.update_date)}</span>
                </div>
                <p style="color:#475569; font-size:0.95rem;">${up.message}</p>
              </div>
            `).join("") : `<p class="text-gray py-24">No progress updates published yet for this cause.</p>`}
          </div>
        </div>
      </div>

      <div class="sticky-card">
        <div class="form-card">
          <div class="progress-track mb-12"><div class="progress-fill" data-pct="${pct}" style="width:0%"></div></div>
          <div class="progress-meta mb-8">
            <span style="font-size:1.3rem;"><strong>${formatCurrency(campaign.raised_amount)}</strong></span>
            <span style="font-size:1.1rem; font-weight:700; color:var(--color-primary);">${pct}%</span>
          </div>
          <p class="text-gray mb-24">pledged of ${formatCurrency(campaign.goal_amount)} goal</p>

          ${campaign.status === "Approved"
            ? `<a href="contribute.html?id=${campaign.campaign_id}" class="btn btn-primary btn-block mb-12" style="font-size:1.05rem; padding:14px;">Contribute to Cause</a>`
            : `<button class="btn btn-secondary btn-block mb-12" disabled>This cause is currently ${campaign.status}</button>`
          }

          <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--color-gray); padding-top:16px; border-top:1px solid var(--color-border);">
            <span>🔒 Verified & Secure</span>
            <span>⚡ Instant Receipt</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  root.querySelectorAll(".details-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".details-tabs button").forEach(b => b.classList.remove("active"));
      root.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPanel = root.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });

  // Handle post update
  const updateForm = document.getElementById("post-update-form");
  if (updateForm) {
    updateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newUp = await API.createUpdate({
        campaign_id: campaign.campaign_id,
        creator_id: session.user_id,
        title: updateForm.update_title.value.trim(),
        message: updateForm.update_message.value.trim()
      });
      showToast("Progress update posted!");
      initCampaignDetailsPage();
    });
  }

  animateProgressBars(root);
  initScrollReveal(root);
}

/* =========================================================================
   4. Contribute Controller (contribute.html)
   ========================================================================= */

async function initContributePage() {
  const root = document.getElementById("contribute-root");
  if (!root) return;
  const session = Auth.requireLogin();
  if (!session) return;

  const id = getQueryParam("id");
  const campaign = await API.getCampaignById(id);

  if (!campaign) {
    root.innerHTML = `<div class="empty-state"><h3>Cause Not Found</h3><a href="campaigns.html" class="btn btn-primary mt-16">Explore Causes</a></div>`;
    return;
  }

  const titleEl = document.getElementById("contribute-campaign-title");
  const catEl = document.getElementById("contribute-campaign-category");
  const fillEl = document.getElementById("contribute-progress-fill");
  const raisedEl = document.getElementById("contribute-raised");
  const goalEl = document.getElementById("contribute-goal");

  if (titleEl) titleEl.textContent = campaign.title;
  if (catEl) catEl.textContent = campaign.category;
  const pct = progressPercent(campaign.raised_amount, campaign.goal_amount);
  if (fillEl) fillEl.style.width = pct + "%";
  if (raisedEl) raisedEl.textContent = formatCurrency(campaign.raised_amount);
  if (goalEl) goalEl.textContent = formatCurrency(campaign.goal_amount);

  const form = document.getElementById("contribute-form");
  if (!form) return;

  const amountInput = form.amount;
  const presetButtons = document.querySelectorAll(".amount-presets button");
  const errorBox = document.getElementById("amount-error");

  presetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      amountInput.value = btn.dataset.amount;
      presetButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (errorBox) errorBox.classList.remove("show");
    });
  });

  amountInput.addEventListener("input", () => {
    presetButtons.forEach(b => b.classList.remove("active"));
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const amount = Number(amountInput.value);

    if (!amount || amount <= 0) {
      if (errorBox) {
        errorBox.textContent = "Please enter an amount greater than 0.";
        errorBox.classList.add("show");
      }
      return;
    }
    if (amount < 10) {
      if (errorBox) {
        errorBox.textContent = "Minimum contribution amount is ₹10.";
        errorBox.classList.add("show");
      }
      return;
    }
    if (errorBox) errorBox.classList.remove("show");

    await API.createContribution({
      campaign_id: campaign.campaign_id,
      user_id: session.user_id,
      amount: amount
    });

    const formPanel = document.getElementById("contribute-form-panel");
    const confirmPanel = document.getElementById("contribute-confirm-panel");
    if (formPanel) formPanel.classList.add("hidden");
    if (confirmPanel) confirmPanel.classList.remove("hidden");

    const confAmt = document.getElementById("confirm-amount");
    const confTitle = document.getElementById("confirm-campaign-title");
    if (confAmt) confAmt.textContent = formatCurrency(amount);
    if (confTitle) confTitle.textContent = campaign.title;

    showToast(`Thank you! Your donation of ${formatCurrency(amount)} was recorded.`);
  });
}

/* =========================================================================
   5. Create / Edit Campaign Controller (create-campaign.html)
   ========================================================================= */

async function initCreateCampaignPage() {
  const form = document.getElementById("create-campaign-form");
  if (!form) return;
  const session = Auth.requireLogin();
  if (!session) return;

  const editId = getQueryParam("edit");
  const pageTitle = document.getElementById("create-page-title");
  const submitBtn = document.getElementById("create-submit-btn");

  if (editId) {
    const existing = await API.getCampaignById(editId);
    if (existing && existing.creator_id === session.user_id) {
      if (pageTitle) pageTitle.textContent = "Edit Cause";
      if (submitBtn) submitBtn.textContent = "Update Cause";
      form.title.value = existing.title;
      form.category.value = existing.category;
      form.goal_amount.value = existing.goal_amount;
      form.description.value = existing.description;
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const title = form.title.value.trim();
    const category = form.category.value;
    const goal_amount = Number(form.goal_amount.value);
    const description = form.description.value.trim();

    if (!title || !category || !goal_amount || !description) {
      showToast("Please fill in all campaign fields.", "danger");
      return;
    }

    if (editId) {
      await API.updateCampaign(editId, { title, category, goal_amount, description });
      showToast("Cause updated successfully!");
    } else {
      await API.createCampaign({
        creator_id: session.user_id,
        title,
        category,
        goal_amount,
        description,
        status: "Pending"
      });
      showToast("Cause submitted for review! Welcome aboard.");
    }
    setTimeout(() => window.location.href = "my-campaigns.html", 500);
  });
}

/* =========================================================================
   6. Creator Campaigns & History Controllers
   ========================================================================= */

async function initMyCampaignsPage() {
  const tbody = document.getElementById("my-campaigns-body");
  if (!tbody) return;
  const session = Auth.requireLogin();
  if (!session) return;

  async function loadData() {
    const all = await API.getCampaigns();
    const mine = all.filter(c => c.creator_id === session.user_id);
    const emptyState = document.getElementById("my-campaigns-empty");
    const table = document.getElementById("my-campaigns-table");

    if (mine.length === 0) {
      if (table) table.classList.add("hidden");
      if (emptyState) emptyState.classList.remove("hidden");
      return;
    }
    if (table) table.classList.remove("hidden");
    if (emptyState) emptyState.classList.add("hidden");
    tbody.innerHTML = mine.map(c => renderCampaignRow(c, { showManageActions: true })).join("");
  }

  window.handleDeleteMyCampaign = async function (campaignId) {
    if (!confirm("Are you sure you want to delete this cause?")) return;
    await API.deleteCampaign(campaignId);
    showToast("Cause deleted");
    loadData();
  };

  loadData();
}

async function initMyContributionsPage() {
  const tbody = document.getElementById("my-contributions-body");
  if (!tbody) return;
  const session = Auth.requireLogin();
  if (!session) return;

  const contributions = await API.getContributions(null, session.user_id);
  const campaigns = await API.getCampaigns();

  const table = document.getElementById("my-contributions-table");
  const emptyState = document.getElementById("my-contributions-empty");

  if (contributions.length === 0) {
    if (table) table.classList.add("hidden");
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  const totalContributed = contributions.reduce((s, c) => s + Number(c.amount), 0);
  const totalCauses = new Set(contributions.map(c => c.campaign_id)).size;

  const totalContributedEl = document.getElementById("total-contributed");
  const totalCausesEl = document.getElementById("total-campaigns-supported");
  if (totalContributedEl) animateCounter(totalContributedEl, totalContributed, true, 1300);
  if (totalCausesEl) animateCounter(totalCausesEl, totalCauses, false, 1100);

  tbody.innerHTML = contributions
    .slice()
    .sort((a, b) => new Date(b.contribution_date) - new Date(a.contribution_date))
    .map(ct => {
      const camp = campaigns.find(c => c.campaign_id === ct.campaign_id);
      return `
        <tr class="reveal">
          <td><a href="campaign-details.html?id=${ct.campaign_id}" style="font-weight:600; color:var(--color-primary);">${camp ? camp.title : "Cause #" + ct.campaign_id}</a></td>
          <td><span class="chip-sm">${camp ? camp.category : "General"}</span></td>
          <td><strong style="color:var(--color-dark);">${formatCurrency(ct.amount)}</strong></td>
          <td>${formatDate(ct.contribution_date)}</td>
          <td><span class="badge badge-success">Completed</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="downloadReceipt(${ct.contribution_id}, '${camp ? camp.title.replace(/'/g, "\\'") : "Cause"}', ${ct.amount}, '${ct.contribution_date}')">🧾 Receipt</button>
          </td>
        </tr>
      `;
    }).join("");

  initScrollReveal();
}

/* =========================================================================
   6. Creator & Contributor Dashboards
   ========================================================================= */

async function initCreatorDashboardPage() {
  const session = Auth.requireLogin();
  if (!session) return;

  const welcomeEl = document.getElementById("dash-user-name");
  if (welcomeEl) welcomeEl.textContent = session.name.split(" ")[0];

  const allCamps = await API.getCampaigns();
  const myCampaigns = allCamps.filter(c => c.creator_id === session.user_id);
  const myContributions = await API.getContributions(null, session.user_id);

  const totalRaisedByMe = myCampaigns.reduce((s, c) => s + (Number(c.raised_amount) || 0), 0);
  const totalDonatedByMe = myContributions.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const dashRaisedEl = document.getElementById("dash-total-raised");
  const dashDonatedEl = document.getElementById("dash-total-contributed");
  const dashCampsCountEl = document.getElementById("dash-campaign-count");
  const dashContribsCountEl = document.getElementById("dash-contribution-count");

  if (dashRaisedEl) animateCounter(dashRaisedEl, totalRaisedByMe, true, 1300);
  if (dashDonatedEl) animateCounter(dashDonatedEl, totalDonatedByMe, true, 1200);
  if (dashCampsCountEl) animateCounter(dashCampsCountEl, myCampaigns.length, false, 1000);
  if (dashContribsCountEl) animateCounter(dashContribsCountEl, myContributions.length, false, 1100);

  const recentBody = document.getElementById("dash-recent-campaigns");
  if (recentBody) {
    if (myCampaigns.length === 0) {
      recentBody.innerHTML = `<tr><td colspan="7" class="text-center text-gray" style="padding:32px;">You haven't launched a cause yet. <a href="create-campaign.html" style="color:var(--color-primary);font-weight:600;">Start your first cause</a>.</td></tr>`;
    } else {
      recentBody.innerHTML = myCampaigns.slice(0, 5).map(c => renderCampaignRow(c, { showManageActions: true })).join("");
    }
  }

  const recContainer = document.getElementById("dash-recommended-campaigns");
  if (recContainer) {
    const recommended = allCamps.filter(c => c.status === "Approved" && c.creator_id !== session.user_id).slice(0, 3);
    if (recommended.length) {
      recContainer.innerHTML = recommended.map(renderCampaignCard).join("");
    }
  }

  animateProgressBars();
  initScrollReveal();
}

const initDashboardPage = initCreatorDashboardPage;

async function initContributorDashboardPage() {
  const session = Auth.requireLogin();
  if (!session) return;

  const welcomeEl = document.getElementById("contrib-user-name");
  if (welcomeEl) welcomeEl.textContent = session.name.split(" ")[0];

  const contributions = await API.getContributions(null, session.user_id);
  const allCampaigns = await API.getCampaigns();
  const allUpdates = await API.getUpdates();

  const totalDonated = contributions.reduce((s, c) => s + Number(c.amount), 0);
  const supportedCampaignIds = [...new Set(contributions.map(c => c.campaign_id))];
  const supportedCampaigns = allCampaigns.filter(c => supportedCampaignIds.includes(c.campaign_id));

  const totalDonatedEl = document.getElementById("contrib-total-donated");
  const totalCausesEl = document.getElementById("contrib-causes-supported");
  const certificatesEl = document.getElementById("contrib-certificates");

  if (totalDonatedEl) animateCounter(totalDonatedEl, totalDonated, true, 1400);
  if (totalCausesEl) animateCounter(totalCausesEl, supportedCampaignIds.length, false, 1100);
  if (certificatesEl) animateCounter(certificatesEl, supportedCampaignIds.length, false, 1000);

  // Supported campaigns grid
  const grid = document.getElementById("contrib-supported-grid");
  if (grid) {
    if (supportedCampaigns.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div style="font-size:3rem; margin-bottom:12px;">🌱</div>
          <h3>No causes supported yet</h3>
          <p class="text-gray mb-16">Explore verified community causes and start creating real social impact.</p>
          <a href="campaigns.html" class="btn btn-primary">Browse Causes</a>
        </div>
      `;
    } else {
      grid.innerHTML = supportedCampaigns.map(renderCampaignCard).join("");
    }
  }

  // Recent contributions table
  const tbody = document.getElementById("contrib-history-body");
  if (tbody) {
    if (contributions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-gray" style="padding:28px;">No donation records yet. <a href="campaigns.html" style="color:var(--color-primary);font-weight:600;">Back a cause today</a>.</td></tr>`;
    } else {
      tbody.innerHTML = contributions
        .slice()
        .sort((a, b) => new Date(b.contribution_date) - new Date(a.contribution_date))
        .slice(0, 5)
        .map(ct => {
          const camp = allCampaigns.find(c => c.campaign_id === ct.campaign_id);
          return `
            <tr>
              <td><a href="campaign-details.html?id=${ct.campaign_id}" style="font-weight:600; color:var(--color-primary);">${camp ? camp.title : "Cause #" + ct.campaign_id}</a></td>
              <td><span class="chip-sm">${camp ? camp.category : "General"}</span></td>
              <td><strong style="color:var(--color-dark);">${formatCurrency(ct.amount)}</strong></td>
              <td>${formatDate(ct.contribution_date)}</td>
              <td><span class="badge badge-success">Verified</span></td>
              <td><button class="btn btn-secondary btn-sm" onclick="downloadReceipt(${ct.contribution_id}, '${camp ? camp.title.replace(/'/g, "\\'") : "Cause"}', ${ct.amount}, '${ct.contribution_date}')">🧾 Receipt</button></td>
            </tr>
          `;
        }).join("");
    }
  }

  // Updates from supported causes
  const updatesFeed = document.getElementById("contrib-updates-feed");
  if (updatesFeed) {
    const relevantUpdates = allUpdates.filter(u => supportedCampaignIds.includes(u.campaign_id));
    if (relevantUpdates.length === 0) {
      updatesFeed.innerHTML = `<p class="text-gray py-16">No progress updates yet from causes you have backed. Check back soon!</p>`;
    } else {
      updatesFeed.innerHTML = relevantUpdates.slice(0, 4).map(u => {
        const camp = allCampaigns.find(c => c.campaign_id === u.campaign_id);
        return `
          <div class="timeline-item reveal mb-16">
            <div class="timeline-marker">📢</div>
            <div class="timeline-card">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:8px;">
                <h4 style="color:var(--color-dark);">${u.title}</h4>
                <span class="text-gray" style="font-size:0.8rem;">${formatDate(u.update_date)}</span>
              </div>
              <p class="text-gray" style="font-size:0.85rem; margin-bottom:8px;">From cause: <a href="campaign-details.html?id=${u.campaign_id}" style="color:var(--color-primary); font-weight:600;">${camp ? camp.title : "View Cause"}</a></p>
              <p style="color:#334155; font-size:0.94rem; line-height:1.6;">${u.message}</p>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  animateProgressBars();
  initScrollReveal();
}

/* =========================================================================
   7. Campaign Updates Controller (campaign-updates.html)
   ========================================================================= */

async function initCampaignUpdatesPage() {
  const session = Auth.getSession();
  const allCampaigns = await API.getCampaigns();
  const allUpdates = await API.getUpdates();

  const filterSelect = document.getElementById("update-campaign-filter");
  const timelineEl = document.getElementById("campaign-updates-timeline");
  const creatorSection = document.getElementById("creator-post-update-section");
  const formCampaignSelect = document.getElementById("form-campaign-select");
  const updateForm = document.getElementById("campaign-update-form");

  // If user is creator, show post update form
  if (session && creatorSection && formCampaignSelect) {
    const myCamps = allCampaigns.filter(c => c.creator_id === session.user_id && c.status === "Approved");
    if (myCamps.length > 0) {
      creatorSection.classList.remove("hidden");
      formCampaignSelect.innerHTML = myCamps.map(c => `<option value="${c.campaign_id}">${c.title} (${c.category})</option>`).join("");
    }
  }

  // Pre-fill campaign filter dropdown
  if (filterSelect) {
    filterSelect.innerHTML = `<option value="All">All Cause Milestones (${allUpdates.length})</option>` +
      allCampaigns.map(c => `<option value="${c.campaign_id}">${c.title}</option>`).join("");

    const initialCampaign = getQueryParam("campaign_id");
    if (initialCampaign) {
      filterSelect.value = initialCampaign;
      if (formCampaignSelect) formCampaignSelect.value = initialCampaign;
    }
  }

  function renderTimeline() {
    if (!timelineEl) return;
    const selected = filterSelect ? filterSelect.value : "All";
    let list = allUpdates.slice();

    if (selected !== "All") {
      list = list.filter(u => u.campaign_id === Number(selected));
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.update_date) - new Date(a.update_date));

    if (list.length === 0) {
      timelineEl.innerHTML = `
        <div class="empty-state">
          <div style="font-size:3rem; margin-bottom:12px;">📢</div>
          <h3>No updates found</h3>
          <p class="text-gray">No progress milestones have been published yet for this selection.</p>
        </div>
      `;
      return;
    }

    timelineEl.innerHTML = list.map(u => {
      const camp = allCampaigns.find(c => c.campaign_id === u.campaign_id);
      const isAuthor = session && (session.user_id === u.creator_id || session.role === "admin");
      return `
        <div class="timeline-item reveal" data-update-id="${u.update_id}">
          <div class="timeline-marker">📢</div>
          <div class="timeline-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:12px; flex-wrap:wrap;">
              <div>
                <h3 style="font-size:1.18rem; color:var(--color-dark); margin-bottom:4px;">${u.title}</h3>
                <div style="font-size:0.86rem; color:var(--color-gray);">
                  Cause: <a href="campaign-details.html?id=${u.campaign_id}" style="color:var(--color-primary); font-weight:700;">${camp ? camp.title : "Cause #" + u.campaign_id}</a>
                  ${camp ? `<span class="chip-sm" style="margin-left:8px;">${camp.category}</span>` : ""}
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                <span class="text-gray" style="font-size:0.82rem;">${formatDate(u.update_date)}</span>
                ${isAuthor ? `<button class="icon-btn danger" title="Delete Update" onclick="handleDeleteUpdate(${u.update_id})">🗑</button>` : ""}
              </div>
            </div>
            <p style="color:#334155; font-size:0.96rem; line-height:1.65; margin-top:8px;">${u.message}</p>
          </div>
        </div>
      `;
    }).join("");

    initScrollReveal(timelineEl);
  }

  if (filterSelect) filterSelect.addEventListener("change", renderTimeline);

  if (updateForm) {
    updateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const campaign_id = Number(formCampaignSelect.value);
      const title = updateForm.update_title.value.trim();
      const message = updateForm.update_message.value.trim();

      if (!campaign_id || !title || !message) {
        showToast("Please fill in all update fields.", "danger");
        return;
      }

      await API.createUpdate({
        campaign_id,
        creator_id: session.user_id,
        title,
        message
      });

      showToast("Cause milestone update published!");
      updateForm.reset();
      initCampaignUpdatesPage();
    });
  }

  window.handleDeleteUpdate = async function(id) {
    if (!confirm("Are you sure you want to delete this milestone update?")) return;
    await API.deleteUpdate(id);
    showToast("Update removed");
    initCampaignUpdatesPage();
  };

  renderTimeline();
}

/* =========================================================================
   8. Admin Portal Controllers
   ========================================================================= */

async function initAdminDashboardPage() {
  const root = document.getElementById("admin-dashboard-root");
  if (!root) return;
  const session = Auth.requireAdmin();
  if (!session) return;

  const campaigns = await API.getCampaigns();
  const contributions = await API.getContributions();
  const users = (await API.getUsers()).filter(u => u.role !== "admin");

  const statCamp = document.getElementById("stat-total-campaigns");
  const statPending = document.getElementById("stat-pending-campaigns");
  const statUsers = document.getElementById("stat-total-users");
  const statRaised = document.getElementById("stat-total-raised");

  if (statCamp) animateCounter(statCamp, campaigns.length, false, 1100);
  if (statPending) animateCounter(statPending, campaigns.filter(c => c.status === "Pending").length, false, 1000);
  if (statUsers) animateCounter(statUsers, users.length, false, 1200);
  if (statRaised) animateCounter(statRaised, contributions.reduce((s, c) => s + Number(c.amount), 0), true, 1400);

  const pendingBody = document.getElementById("pending-campaigns-body");
  const pendingList = campaigns.filter(c => c.status === "Pending");
  if (pendingBody) {
    if (pendingList.length === 0) {
      pendingBody.innerHTML = `<tr><td colspan="6" class="text-center text-gray" style="padding:24px;">No causes currently pending verification. All caught up! ✨</td></tr>`;
    } else {
      pendingBody.innerHTML = pendingList.map(c => `
        <tr class="reveal">
          <td><strong>#${c.campaign_id}</strong></td>
          <td><a href="campaign-details.html?id=${c.campaign_id}" style="color:var(--color-primary); font-weight:600;">${c.title}</a></td>
          <td><span class="chip-sm">${c.category}</span></td>
          <td>${formatCurrency(c.goal_amount)}</td>
          <td>${formatDate(c.created_date)}</td>
          <td class="row-actions">
            <button class="btn btn-sm btn-primary" onclick="handleAdminStatus(${c.campaign_id}, 'Approved')">✓ Approve</button>
            <button class="btn btn-sm btn-danger" onclick="handleAdminStatus(${c.campaign_id}, 'Rejected')">✕ Reject</button>
          </td>
        </tr>
      `).join("");
    }
  }

  window.handleAdminStatus = async function (id, status) {
    await API.updateCampaignStatus(id, status);
    showToast(`Cause #${id} updated to ${status}`);
    initAdminDashboardPage();
  };

  const recentTbody = document.getElementById("recent-campaigns-body");
  if (recentTbody) {
    recentTbody.innerHTML = campaigns
      .slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 5)
      .map(c => renderCampaignRow(c)).join("");
  }

  initScrollReveal();
}

async function initAdminCampaignsPage() {
  const tbody = document.getElementById("admin-campaigns-body");
  if (!tbody) return;
  const session = Auth.requireAdmin();
  if (!session) return;

  let all = await API.getCampaigns();
  const filterSelect = document.getElementById("status-filter");
  const searchInput = document.getElementById("campaign-search");

  function renderList() {
    let list = all.slice();
    const filter = filterSelect ? filterSelect.value : "All";
    if (filter !== "All") list = list.filter(c => c.status.toLowerCase() === filter.toLowerCase());

    const q = (searchInput && searchInput.value || "").trim().toLowerCase();
    if (q) list = list.filter(c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));

    tbody.innerHTML = list.map(c => {
      const pct = progressPercent(c.raised_amount, c.goal_amount);
      return `
        <tr class="reveal">
          <td><strong>#${c.campaign_id}</strong></td>
          <td><a href="campaign-details.html?id=${c.campaign_id}" style="color:var(--color-primary); font-weight:600;">${c.title}</a></td>
          <td><span class="chip-sm">${c.category}</span></td>
          <td>${formatCurrency(c.goal_amount)}</td>
          <td>${formatCurrency(c.raised_amount)} <span class="text-gray" style="font-size:0.8rem;">(${pct}%)</span></td>
          <td><span class="badge ${statusBadgeClass(c.status)}">${c.status}</span></td>
          <td class="row-actions">
            ${String(c.status || "").toUpperCase() === "PENDING" ? `
              <button class="btn btn-sm btn-primary" onclick="handleAdminStatus(${c.campaign_id}, 'Approved')">Approve</button>
              <button class="btn btn-sm btn-danger" onclick="handleAdminStatus(${c.campaign_id}, 'Rejected')">Reject</button>
            ` : `
              <button class="icon-btn danger" title="Delete" onclick="handleAdminDelete(${c.campaign_id})">🗑</button>
            `}
          </td>
        </tr>
      `;
    }).join("");

    initScrollReveal(tbody);
  }

  window.handleAdminStatus = async function (id, status) {
    await API.updateCampaignStatus(id, status);
    all = await API.getCampaigns();
    showToast(`Cause #${id} updated to ${status}`);
    renderList();
  };

  window.handleAdminDelete = async function (id) {
    if (!confirm("Permanently delete this cause?")) return;
    await API.deleteCampaign(id);
    all = await API.getCampaigns();
    showToast("Cause deleted");
    renderList();
  };

  if (filterSelect) filterSelect.addEventListener("change", renderList);
  if (searchInput) searchInput.addEventListener("input", renderList);
  renderList();
}

async function initAdminUsersPage() {
  const tbody = document.getElementById("admin-users-body");
  if (!tbody) return;
  const session = Auth.requireAdmin();
  if (!session) return;

  let users = await API.getUsers();
  const searchInput = document.getElementById("user-search");

  function renderList() {
    let list = users.slice();
    const q = (searchInput && searchInput.value || "").trim().toLowerCase();
    if (q) list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));

    tbody.innerHTML = list.map(u => `
      <tr class="reveal">
        <td><strong>#${u.user_id}</strong></td>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-info' : 'badge-success'}">${u.role}</span></td>
        <td class="row-actions">
          ${u.role !== 'admin' ? `<button class="icon-btn danger" onclick="handleAdminDeleteUser(${u.user_id})" title="Remove User">🗑</button>` : `<span class="text-gray" style="font-size:0.8rem;">Protected Admin</span>`}
        </td>
      </tr>
    `).join("");

    initScrollReveal(tbody);
  }

  window.handleAdminDeleteUser = async function (id) {
    if (!confirm("Are you sure you want to remove this user?")) return;
    await API.deleteUser(id);
    users = await API.getUsers();
    showToast("User removed from platform");
    renderList();
  };

  if (searchInput) searchInput.addEventListener("input", renderList);
  renderList();
}

async function initAdminContributionsPage() {
  const tbody = document.getElementById("admin-contributions-body");
  if (!tbody) return;
  const session = Auth.requireAdmin();
  if (!session) return;

  const contribs = await API.getContributions();
  const camps = await API.getCampaigns();
  const users = await API.getUsers();

  const searchInput = document.getElementById("contrib-search");
  const totalAmountEl = document.getElementById("admin-contrib-total");
  const totalCountEl = document.getElementById("admin-contrib-count");

  const totalRaised = contribs.reduce((s, c) => s + Number(c.amount), 0);
  if (totalAmountEl) animateCounter(totalAmountEl, totalRaised, true, 1300);
  if (totalCountEl) animateCounter(totalCountEl, contribs.length, false, 1100);

  function renderList() {
    let list = contribs.slice().sort((a, b) => new Date(b.contribution_date) - new Date(a.contribution_date));
    const q = (searchInput && searchInput.value || "").trim().toLowerCase();
    if (q) {
      list = list.filter(c => {
        const camp = camps.find(cp => cp.campaign_id === c.campaign_id);
        const user = users.find(u => u.user_id === c.user_id);
        const campTitle = camp ? camp.title.toLowerCase() : "";
        const userName = user ? user.name.toLowerCase() : "";
        return campTitle.includes(q) || userName.includes(q) || String(c.contribution_id).includes(q);
      });
    }

    tbody.innerHTML = list.map(c => {
      const camp = camps.find(cp => cp.campaign_id === c.campaign_id);
      const user = users.find(u => u.user_id === c.user_id);
      return `
        <tr class="reveal">
          <td><strong>#${c.contribution_id}</strong></td>
          <td>${user ? user.name : "Supporter #" + c.user_id}</td>
          <td><a href="campaign-details.html?id=${c.campaign_id}" style="color:var(--color-primary); font-weight:600;">${camp ? camp.title : "Cause #" + c.campaign_id}</a></td>
          <td><strong style="color:var(--color-primary);">${formatCurrency(c.amount)}</strong></td>
          <td>${formatDate(c.contribution_date)}</td>
          <td><span class="badge badge-success">Verified</span></td>
        </tr>
      `;
    }).join("");

    initScrollReveal(tbody);
  }

  if (searchInput) searchInput.addEventListener("input", renderList);
  renderList();
}

async function initAdminReportsPage() {
  const session = Auth.requireAdmin();
  if (!session) return;
  const stats = await API.getStats();

  const totalRaisedEl = document.getElementById("report-total-raised");
  const totalCampsEl = document.getElementById("report-total-campaigns");
  const approvedCampsEl = document.getElementById("report-approved-campaigns");
  const totalContribsEl = document.getElementById("report-total-contributions");

  if (totalRaisedEl) animateCounter(totalRaisedEl, stats.totalRaised, true, 1300);
  if (totalCampsEl) animateCounter(totalCampsEl, stats.totalCampaigns, false, 1100);
  if (approvedCampsEl) animateCounter(approvedCampsEl, stats.activeCampaigns, false, 1000);
  if (totalContribsEl) animateCounter(totalContribsEl, stats.contributionsCount, false, 1200);

  // Breakdown by category
  const camps = await API.getCampaigns();
  const catMap = {};
  camps.forEach(c => {
    if (!catMap[c.category]) catMap[c.category] = { count: 0, raised: 0 };
    catMap[c.category].count++;
    catMap[c.category].raised += (Number(c.raised_amount) || 0);
  });

  const catBody = document.getElementById("category-report-body");
  if (catBody) {
    const total = stats.totalRaised || 1;
    catBody.innerHTML = Object.keys(catMap).map(cat => {
      const share = Math.round((catMap[cat].raised / total) * 100);
      return `
        <tr class="reveal">
          <td><span class="chip-sm">${cat}</span></td>
          <td><strong>${catMap[cat].count}</strong></td>
          <td>${share}%</td>
          <td><strong style="color:var(--color-primary);">${formatCurrency(catMap[cat].raised)}</strong></td>
        </tr>
      `;
    }).join("");
    initScrollReveal(catBody);
  }
}

async function initAdminSettingsPage() {
  const session = Auth.requireAdmin();
  if (!session) return;
  const form = document.getElementById("admin-settings-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Platform configuration settings saved!");
    });
  }
}

async function initProfilePage() {
  const session = Auth.requireLogin();
  if (!session) return;

  const form = document.getElementById("profile-form");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const avatarEl = document.getElementById("profile-avatar");
  const nameEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");
  const roleEl = document.getElementById("profile-role");
  const campCountEl = document.getElementById("profile-campaign-count");
  const contribCountEl = document.getElementById("profile-contribution-count");
  const contribTotalEl = document.getElementById("profile-contribution-total");
  const logoutBtn = document.getElementById("profile-logout");

  if (nameInput) nameInput.value = session.name;
  if (emailInput) emailInput.value = session.email;
  if (avatarEl) avatarEl.textContent = initials(session.name);
  if (nameEl) nameEl.textContent = session.name;
  if (emailEl) emailEl.textContent = session.email;
  if (roleEl) roleEl.textContent = session.role === "creator" ? "Cause Creator" : (session.role === "admin" ? "Administrator" : "Community Contributor");

  const campaigns = await API.getCampaigns();
  const myCampaigns = campaigns.filter(c => c.creator_id === session.user_id);
  const contributions = await API.getContributions(null, session.user_id);
  const totalImpact = contributions.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  if (campCountEl) animateCounter(campCountEl, myCampaigns.length, false, 1000);
  if (contribCountEl) animateCounter(contribCountEl, contributions.length, false, 1100);
  if (contribTotalEl) animateCounter(contribTotalEl, totalImpact, true, 1300);

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const updatedName = nameInput.value.trim();
      if (!updatedName) {
        showToast("Please enter your name.", "danger");
        return;
      }
      try {
        const updated = await API.updateUser(session.user_id, { name: updatedName });
        session.name = updatedName;
        Auth.setSession(session);
        if (avatarEl) avatarEl.textContent = initials(updatedName);
        if (nameEl) nameEl.textContent = updatedName;
        showToast("Profile updated successfully!");
      } catch (err) {
        showToast("Failed to update profile: " + err.message, "danger");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      Auth.clearSession();
      window.location.href = "index.html";
    });
  }

  initScrollReveal();
}

/* Global Receipt Download Helper */
window.downloadReceipt = function(contributionId, causeTitle, amount, date) {
  showToast(`Receipt #${contributionId} generated for ${formatCurrency(amount)} to "${causeTitle}"`);
};

// Global DOM Content Loaded Animation Init
document.addEventListener("DOMContentLoaded", () => {
  initNavbarAnimation();
  initScrollReveal();
  animateProgressBars();
});
