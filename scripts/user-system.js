(function () {
  const USERS_KEY = "blog_users";
  const SESSION_KEY = "blog_current_user";
  const PENDING_KEY = "blog_pending_verification";

  function loadJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function makeVerificationCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function getUsers() {
    return loadJSON(USERS_KEY, []);
  }

  function saveUsers(users) {
    saveJSON(USERS_KEY, users);
  }

  function publicUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      provider: user.provider,
      verified: user.verified,
      createdAt: user.createdAt
    };
  }

  function currentUser() {
    return loadJSON(SESSION_KEY, null);
  }

  function setCurrentUser(user) {
    saveJSON(SESSION_KEY, publicUser(user));
    notifyAuthChange();
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    notifyAuthChange();
  }

  function notifyAuthChange() {
    document.dispatchEvent(new CustomEvent("blog-auth-change", { detail: currentUser() }));
  }

  function register(form) {
    const data = new FormData(form);
    const email = String(data.get("email")).trim().toLowerCase();
    const username = String(data.get("username")).trim();
    const password = String(data.get("password"));
    const users = getUsers();

    if (users.some(user => user.email === email || user.username.toLowerCase() === username.toLowerCase())) {
      return { ok: false, message: "That email or username is already registered." };
    }

    saveJSON(PENDING_KEY, {
      email,
      username,
      password,
      code: makeVerificationCode(),
      createdAt: Date.now()
    });

    return { ok: true, pending: loadJSON(PENDING_KEY, null) };
  }

  function signIn(form) {
    const data = new FormData(form);
    const email = String(data.get("email")).trim().toLowerCase();
    const password = String(data.get("password"));
    const user = getUsers().find(entry => entry.email === email && entry.password === password);

    if (!user) return { ok: false, message: "The email or password is not correct." };

    setCurrentUser(user);
    return { ok: true, user: publicUser(user) };
  }

  function verify(form) {
    const pending = loadJSON(PENDING_KEY, null);
    if (!pending) return { ok: false, message: "Please request a new verification code." };

    const code = String(new FormData(form).get("code")).trim();
    if (code !== pending.code) return { ok: false, message: "That code does not match. Please try again." };

    const users = getUsers();
    const user = {
      id: makeId(),
      email: pending.email,
      username: pending.username,
      password: pending.password,
      provider: "email",
      verified: true,
      createdAt: Date.now()
    };

    users.push(user);
    saveUsers(users);
    localStorage.removeItem(PENDING_KEY);
    setCurrentUser(user);
    return { ok: true, user: publicUser(user) };
  }

  function googleSignup(username) {
    const cleanName = String(username || "").trim();
    if (!cleanName) return { ok: false, message: "Please choose a username." };

    const users = getUsers();
    if (users.some(user => user.username.toLowerCase() === cleanName.toLowerCase())) {
      return { ok: false, message: "That username is already registered." };
    }

    const user = {
      id: makeId(),
      email: "",
      username: cleanName,
      provider: "google",
      verified: true,
      createdAt: Date.now()
    };

    users.push(user);
    saveUsers(users);
    setCurrentUser(user);
    return { ok: true, user: publicUser(user) };
  }

  function renderModal(message) {
    const pending = loadJSON(PENDING_KEY, null);

    return `
      <div class="auth-modal-backdrop" data-auth-close></div>
      <section class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" class="auth-close" aria-label="Close" data-auth-close>&times;</button>
        <h2 id="auth-title">Join the conversation</h2>
        <p class="comments-note">Sign in or create an account to publish your comment.</p>
        ${message ? `<p class="auth-message">${escapeHTML(message)}</p>` : ""}
        <div class="auth-grid compact">
          <form class="auth-form" data-auth-action="sign-in">
            <h3>Sign in</h3>
            <label>
              Email
              <input name="email" type="email" autocomplete="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autocomplete="current-password" required />
            </label>
            <button type="submit">Sign in</button>
          </form>
          <form class="auth-form" data-auth-action="register">
            <h3>Register</h3>
            <label>
              Email
              <input name="email" type="email" autocomplete="email" required />
            </label>
            <label>
              Username
              <input name="username" type="text" autocomplete="username" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autocomplete="new-password" required minlength="6" />
            </label>
            <button type="submit">Send code</button>
          </form>
        </div>
        <form class="auth-form google-form" data-auth-action="google-signup">
          <h3>Google account</h3>
          <label>
            Username
            <input name="username" type="text" autocomplete="username" placeholder="Choose a display name" required />
          </label>
          <button type="submit">Sign up with Google</button>
        </form>
        ${pending ? renderVerification(pending) : ""}
      </section>
    `;
  }

  function renderVerification(pending) {
    return `
      <form class="verify-form" data-auth-action="verify">
        <h3>Verify your email</h3>
        <p class="email-preview">
          Hello ${escapeHTML(pending.username)},<br />
          Thank you for registering. Your verification code is
          <strong>${escapeHTML(pending.code)}</strong>. Please enter it to complete your signup.
        </p>
        <label>
          Verification code
          <input name="code" type="text" inputmode="numeric" required />
        </label>
        <button type="submit">Verify account</button>
      </form>
    `;
  }

  function openAuthModal(message) {
    closeAuthModal();
    const wrapper = document.createElement("div");
    wrapper.className = "auth-modal-layer";
    wrapper.innerHTML = renderModal(message);
    document.body.appendChild(wrapper);
    document.body.classList.add("modal-open");
    wrapper.querySelector("input")?.focus();

    wrapper.addEventListener("click", event => {
      if (event.target.closest("[data-auth-close]")) closeAuthModal();
    });

    wrapper.addEventListener("submit", event => {
      event.preventDefault();
      const form = event.target;
      const action = form.dataset.authAction;
      let result = { ok: false };

      if (action === "register") result = register(form);
      if (action === "sign-in") result = signIn(form);
      if (action === "verify") result = verify(form);
      if (action === "google-signup") {
        result = googleSignup(new FormData(form).get("username"));
      }

      if (result.ok && action !== "register") {
        closeAuthModal();
        return;
      }

      wrapper.innerHTML = renderModal(result.message || "Verification code sent.");
      wrapper.querySelector("input")?.focus();
    });
  }

  function closeAuthModal() {
    document.querySelector(".auth-modal-layer")?.remove();
    document.body.classList.remove("modal-open");
  }

  window.BlogUserSystem = {
    currentUser,
    openAuthModal,
    closeAuthModal,
    signOut,
    escapeHTML
  };
})();
