/* ==========================================================================
   CauseConnect - auth.js
   Authentication, session management, and user profiles.
   Connect People. Fund Causes. Create Impact.
   ========================================================================== */

const Auth = {
  SESSION_KEY: "cc_session",

  getSession() {
    const raw = localStorage.getItem(this.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  setSession(user) {
    const sessionData = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
  },

  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  isAdmin() {
    const session = this.getSession();
    return session && session.role === "admin";
  },

  requireLogin(redirectUrl = "login.html") {
    const session = this.getSession();
    if (!session) {
      window.location.href = redirectUrl;
      return null;
    }
    return session;
  },

  requireAdmin(redirectUrl = "admin-login.html") {
    const session = this.getSession();
    if (!session || session.role !== "admin") {
      window.location.href = redirectUrl;
      return null;
    }
    return session;
  },

  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (res.ok && data) {
        this.setSession(data);
        return { success: true, user: data };
      }
      return { success: false, error: data.error || "Invalid email or password." };
    } catch (e) {
      return { success: false, error: "Cannot connect to backend server. Make sure the Java backend is running." };
    }
  },

  async register({ name, email, password, role = "contributor" }) {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role: role.toUpperCase() })
      });
      const data = await res.json();
      if (res.ok && data) {
        this.setSession(data);
        return { success: true, user: data };
      }
      return { success: false, error: data.error || "Registration failed." };
    } catch (e) {
      return { success: false, error: "Cannot connect to backend server. Make sure the Java backend is running." };
    }
  },

  async adminLogin(email, password) {
    const result = await this.login(email, password);
    if (result.success) {
      if ((result.user.role || '').toLowerCase() !== "admin") {
        this.clearSession();
        return { success: false, error: "Access denied. Administrator privileges required." };
      }
      return { success: true, user: result.user };
    }
    return result;
  },

  async updateProfile({ name, email, password }) {
    const session = this.getSession();
    if (!session) return { success: false, error: "Not logged in" };

    try {
      const payload = {};
      if (name) payload.name = name.trim();
      if (email) payload.email = email.trim();
      if (password) payload.password = password;

      const updated = await API.updateUser(session.user_id, payload);
      if (updated && !updated.error) {
        this.setSession(updated);
        return { success: true, user: updated };
      }
      return { success: false, error: (updated && updated.error) ? updated.error : "Failed to update profile" };
    } catch (e) {
      return { success: false, error: e.message || "Failed to update profile" };
    }
  }
};

/* Compatibility Bridge */
function getSession() { return Auth.getSession(); }
function setSession(u) { Auth.setSession(u); }
function clearSession() { Auth.clearSession(); }
function requireLogin() { return Auth.requireLogin(); }
function requireAdmin() { return Auth.requireAdmin(); }
function findUserByEmail(email) {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === String(email).trim().toLowerCase());
}

/* =========================================================================
   Page Initializers
   ========================================================================= */

function initLoginPage() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    const errorBox = document.getElementById("login-error");
    if (errorBox) errorBox.classList.add("hidden");

    if (!email || !password) {
      if (errorBox) {
        errorBox.textContent = "Please enter both email and password.";
        errorBox.classList.remove("hidden");
      }
      return;
    }

    const res = await Auth.login(email, password);
    if (res.success) {
      if (res.user.role === "admin") {
        if (errorBox) {
          errorBox.textContent = "Admin accounts should log in from the Admin Portal.";
          errorBox.classList.remove("hidden");
        }
        return;
      }
      showToast("Welcome back to CauseConnect, " + res.user.name.split(" ")[0] + "!");
      setTimeout(() => {
        window.location.href = res.user.role === "contributor" ? "contributor-dashboard.html" : "creator-dashboard.html";
      }, 500);
    } else {
      if (errorBox) {
        errorBox.textContent = res.error || "Invalid email or password.";
        errorBox.classList.remove("hidden");
      }
    }
  });

  window.quickFillLogin = function(email, pass) {
    if (form.email) form.email.value = email;
    if (form.password) form.password.value = pass;
    showToast(`Filled credentials for ${email}`);
  };
}

function initRegisterPage() {
  const form = document.getElementById("register-form");
  if (!form) return;

  let selectedRole = "creator";
  const roleButtons = document.querySelectorAll(".role-toggle button");
  roleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      roleButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedRole = btn.dataset.role || "creator";
    });
  });

  function fieldError(field, message) {
    const errorEl = form.querySelector(`[data-error-for="${field}"]`);
    const inputEl = form.elements[field];
    if (!errorEl) return;
    if (message) {
      errorEl.textContent = message;
      errorEl.classList.add("show");
      if (inputEl) inputEl.classList.add("error");
    } else {
      errorEl.classList.remove("show");
      if (inputEl) inputEl.classList.remove("error");
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    let valid = true;

    const name = form.name.value.trim();
    if (!name) { fieldError("name", "Full name is required."); valid = false; }
    else fieldError("name", "");

    const email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fieldError("email", "Enter a valid email address."); valid = false; }
    else fieldError("email", "");

    const password = form.password.value;
    if (password.length < 6) { fieldError("password", "Password must be at least 6 characters."); valid = false; }
    else fieldError("password", "");

    if (form.confirm_password && form.confirm_password.value !== password) {
      fieldError("confirm_password", "Passwords do not match."); valid = false;
    } else if (form.confirm_password) {
      fieldError("confirm_password", "");
    }

    if (!valid) return;

    const res = await Auth.register({ name, email, password, role: selectedRole });
    if (res.success) {
      showToast("Account created! Welcome to CauseConnect, " + res.user.name.split(" ")[0] + "!");
      setTimeout(() => {
        window.location.href = selectedRole === "contributor" ? "contributor-dashboard.html" : "creator-dashboard.html";
      }, 500);
    } else {
      fieldError("email", res.error);
    }
  });
}

function initAdminLoginPage() {
  const form = document.getElementById("admin-login-form");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const errorBox = document.getElementById("admin-login-error");
    if (errorBox) errorBox.classList.add("hidden");

    const email = form.email.value.trim();
    const password = form.password.value;

    const res = await Auth.adminLogin(email, password);
    if (res.success) {
      showToast("Welcome back, Administrator!");
      setTimeout(() => window.location.href = "admin-dashboard.html", 500);
    } else {
      if (errorBox) {
        errorBox.textContent = res.error || "Invalid admin credentials. Try admin@causeconnect.com / admin123.";
        errorBox.classList.remove("hidden");
      }
    }
  });
}

async function initProfilePage() {
  const session = Auth.requireLogin();
  if (!session) return;

  const nameEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");
  const avatarEl = document.getElementById("profile-avatar");
  const roleEl = document.getElementById("profile-role");

  if (nameEl) nameEl.textContent = session.name;
  if (emailEl) emailEl.textContent = session.email;
  if (avatarEl) avatarEl.textContent = initials(session.name);
  if (roleEl) roleEl.textContent = (session.role || '').toLowerCase() === "admin" ? "Platform Administrator" : "Cause Changemaker / Contributor";

  try {
    const myCampaigns = await API.getCampaigns({ creator_id: session.user_id });
    const myContributions = await API.getContributions(null, session.user_id);

    const campCountEl = document.getElementById("profile-campaign-count");
    const contribCountEl = document.getElementById("profile-contribution-count");
    const contribTotalEl = document.getElementById("profile-contribution-total");

    if (campCountEl) campCountEl.textContent = myCampaigns.length;
    if (contribCountEl) contribCountEl.textContent = myContributions.length;
    if (contribTotalEl) contribTotalEl.textContent = formatCurrency(myContributions.reduce((s, c) => s + Number(c.amount), 0));
  } catch (err) {
    console.warn("Could not load user profile counts:", err);
  }

  const form = document.getElementById("profile-form");
  if (form) {
    if (form.name) form.name.value = session.name;
    if (form.email) form.email.value = session.email;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const newName = form.name ? form.name.value.trim() : session.name;
      const newEmail = form.email ? form.email.value.trim() : session.email;
      const newPassword = form.password && form.password.value ? form.password.value : null;

      const res = await Auth.updateProfile({ name: newName, email: newEmail, password: newPassword });
      if (res.success) {
        showToast("Profile updated successfully!");
        if (nameEl) nameEl.textContent = res.user.name;
        if (emailEl) emailEl.textContent = res.user.email;
        if (avatarEl) avatarEl.textContent = initials(res.user.name);
      } else {
        showToast(res.error || "Failed to update profile", "danger");
      }
    });
  }

  const logoutBtn = document.getElementById("profile-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      Auth.clearSession();
      window.location.href = "index.html";
    });
  }
}
