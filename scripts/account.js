(function () {
  const COMMENTS_KEY = "blog_comments";
  const DELETION_LOG_KEY = "blog_deleted_comment_log";

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
    return window.BlogUserSystem.escapeHTML(value);
  }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function ownsEntry(entry, user) {
    return entry.userId === user.id || (!entry.userId && entry.username === user.username);
  }

  async function loadPostLookup() {
    try {
      const response = await fetch("categories.json");
      const data = await response.json();
      const lookup = {};

      for (const category of data.categories || []) {
        for (const post of category.posts || []) {
          const postKey = `${category.slug}/${post.slug}`;
          lookup[postKey] = {
            title: post.title,
            category: category.name,
            url: `post.html?category=${encodeURIComponent(category.slug)}&post=${encodeURIComponent(post.slug)}`
          };
        }
      }

      return lookup;
    } catch (_) {
      return {};
    }
  }

  function collectAccountData(user, postLookup) {
    const commentsByPost = loadJSON(COMMENTS_KEY, {});
    const history = [];
    const notifications = [];

    Object.entries(commentsByPost).forEach(([postKey, comments]) => {
      const post = postLookup[postKey] || {
        title: postKey,
        category: "Post",
        url: `post.html?category=${encodeURIComponent(postKey.split("/")[0])}&post=${encodeURIComponent(postKey.split("/")[1] || "")}`
      };

      (comments || []).forEach(comment => {
        if (ownsEntry(comment, user)) {
          history.push({ ...comment, kind: "Comment", postKey, post });

          (comment.replies || []).forEach(reply => {
            if (!ownsEntry(reply, user) && !reply.deleted) {
              notifications.push({ ...reply, parent: comment, postKey, post });
            }
          });
        }

        (comment.replies || []).forEach(reply => {
          if (ownsEntry(reply, user)) {
            history.push({ ...reply, kind: "Reply", parent: comment, postKey, post });
          }
        });
      });
    });

    history.sort((a, b) => b.createdAt - a.createdAt);
    notifications.sort((a, b) => b.createdAt - a.createdAt);
    return { history, notifications };
  }

  function renderSignedOut(root) {
    root.innerHTML = `
      <h1>Account</h1>
      <p class="comments-note">Sign in to see your comment history, replies, and account tools.</p>
      <button type="button" class="primary-action" data-action="open-auth">Sign in or register</button>
    `;
  }

  function renderAccount(root, user, data) {
    root.innerHTML = `
      <div class="account-heading">
        <div>
          <h1>Account</h1>
          <p class="comments-note">Signed in as <strong>${escapeHTML(user.username)}</strong></p>
        </div>
        <button type="button" class="text-button" data-action="sign-out">Sign out</button>
      </div>

      <section class="account-panel">
        <h2>Replies to Your Comments</h2>
        ${data.notifications.length ? data.notifications.map(renderNotification).join("") : '<p class="comments-note">No replies yet.</p>'}
      </section>

      <section class="account-panel">
        <h2>Comment History</h2>
        ${data.history.length ? data.history.map(renderHistoryItem).join("") : '<p class="comments-note">You have not commented yet.</p>'}
      </section>
    `;
  }

  function renderNotification(reply) {
    return `
      <article class="account-item">
        <header>
          <strong>${escapeHTML(reply.username)}</strong>
          <time>${new Date(reply.createdAt).toLocaleString()}</time>
        </header>
        <p>${escapeHTML(reply.body)}</p>
        <a href="${reply.post.url}">${escapeHTML(reply.post.title)}</a>
      </article>
    `;
  }

  function renderHistoryItem(item) {
    const deleted = Boolean(item.deleted);
    const deleteButton = deleted
      ? '<span class="deleted-comment">Deleted</span>'
      : `<button type="button" class="text-button danger" data-action="delete-comment" data-post-key="${escapeHTML(item.postKey)}" data-comment-id="${escapeHTML(item.id)}" data-kind="${item.kind.toLowerCase()}">Delete</button>`;

    return `
      <article class="account-item">
        <header>
          <strong>${escapeHTML(item.kind)}</strong>
          <time>${new Date(item.createdAt).toLocaleString()}</time>
        </header>
        <p class="${deleted ? "deleted-comment" : ""}">${deleted ? "Deleted by you." : escapeHTML(item.body)}</p>
        <div class="account-item-actions">
          <a href="${item.post.url}">${escapeHTML(item.post.title)}</a>
          ${deleteButton}
        </div>
      </article>
    `;
  }

  function logDeletion(entry, postKey, kind, user) {
    const log = loadJSON(DELETION_LOG_KEY, []);
    log.push({
      id: makeId(),
      deletedAt: Date.now(),
      deletedBy: { id: user.id, username: user.username, email: user.email || "" },
      postKey,
      kind,
      original: {
        id: entry.id,
        userId: entry.userId || "",
        username: entry.username,
        body: entry.body,
        createdAt: entry.createdAt
      }
    });
    saveJSON(DELETION_LOG_KEY, log);
  }

  function deleteComment(postKey, commentId, kind, user) {
    const commentsByPost = loadJSON(COMMENTS_KEY, {});
    const comments = commentsByPost[postKey] || [];
    let target = null;

    if (kind === "comment") {
      target = comments.find(comment => comment.id === commentId);
    } else {
      for (const comment of comments) {
        target = (comment.replies || []).find(reply => reply.id === commentId);
        if (target) break;
      }
    }

    if (!target || target.deleted || !ownsEntry(target, user)) return false;

    logDeletion(target, postKey, kind, user);
    target.deleted = true;
    target.deletedAt = Date.now();
    target.deletedBy = user.id;
    target.body = "";
    commentsByPost[postKey] = comments;
    saveJSON(COMMENTS_KEY, commentsByPost);
    return true;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const root = document.getElementById("account-root");
    if (!root || !window.BlogUserSystem) return;

    const postLookup = await loadPostLookup();

    function render() {
      const user = window.BlogUserSystem.currentUser();
      if (!user) {
        renderSignedOut(root);
        return;
      }

      renderAccount(root, user, collectAccountData(user, postLookup));
    }

    render();
    document.addEventListener("blog-auth-change", render);

    root.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;

      if (button.dataset.action === "open-auth") {
        window.BlogUserSystem.openAuthModal("Please sign in to view your account.", "Stay connnected");
      }

      if (button.dataset.action === "sign-out") {
        window.BlogUserSystem.signOut();
      }

      if (button.dataset.action === "delete-comment") {
        const user = window.BlogUserSystem.currentUser();
        if (!user) return;
        deleteComment(button.dataset.postKey, button.dataset.commentId, button.dataset.kind, user);
        render();
      }
    });
  });
})();
