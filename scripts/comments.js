(function () {
  const COMMENTS_KEY = "blog_comments";
  const INITIAL_VISIBLE_COMMENTS = 3;
  let expanded = false;

  function getPostKey() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category") || "unknown-category";
    const post = params.get("post") || "unknown-post";
    return `${category}/${post}`;
  }

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

  function currentUser() {
    return window.BlogUserSystem.currentUser();
  }

  function getComments() {
    return loadJSON(COMMENTS_KEY, {});
  }

  function saveComments(comments) {
    saveJSON(COMMENTS_KEY, comments);
  }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function render(root) {
    const user = currentUser();
    const postKey = getPostKey();
    const commentsByPost = getComments();
    const comments = (commentsByPost[postKey] || []).sort((a, b) => b.createdAt - a.createdAt);
    const visibleComments = expanded ? comments : comments.slice(0, INITIAL_VISIBLE_COMMENTS);

    root.innerHTML = `
      <div class="comments-header">
        <h2>Comments</h2>
        ${user ? renderSignedIn(user) : ""}
      </div>
      ${renderComposer()}
      <div class="comments-list">
        ${visibleComments.length ? visibleComments.map(renderComment).join("") : '<p class="comments-note">No comments yet.</p>'}
      </div>
      ${comments.length > INITIAL_VISIBLE_COMMENTS ? renderToggle(comments.length) : ""}
    `;
  }

  function renderSignedIn(user) {
    return `
      <div class="auth-status inline">
        <span>Signed in as <strong>${escapeHTML(user.username)}</strong></span>
        <button type="button" class="text-button" data-action="sign-out">Sign out</button>
      </div>
    `;
  }

  function renderComposer(parentId) {
    return `
      <form class="comment-form" data-action="comment"${parentId ? ` data-parent-id="${escapeHTML(parentId)}"` : ""}>
        <label>
          ${parentId ? "Reply" : "Leave a comment"}
          <textarea name="body" rows="${parentId ? "3" : "4"}" placeholder="${parentId ? "Write a reply..." : "Share your thoughts..."}" required></textarea>
        </label>
        <button type="submit">${parentId ? "Send reply" : "Send"}</button>
      </form>
    `;
  }

  function renderToggle(total) {
    return `
      <button type="button" class="comments-toggle" data-action="toggle-comments">
        ${expanded ? "Show fewer comments" : `Show all ${total} comments`}
      </button>
    `;
  }

  function renderComment(comment) {
    const replies = (comment.replies || []).sort((a, b) => a.createdAt - b.createdAt);

    return `
      <article class="comment" data-comment-id="${escapeHTML(comment.id)}">
        <header>
          <strong>${escapeHTML(comment.username)}</strong>
          <time>${new Date(comment.createdAt).toLocaleString()}</time>
        </header>
        <p>${escapeHTML(comment.body)}</p>
        <button type="button" class="text-button" data-action="show-reply" data-comment-id="${escapeHTML(comment.id)}">Reply</button>
        <div class="reply-slot"></div>
        ${replies.length ? `<div class="replies">${replies.map(renderReply).join("")}</div>` : ""}
      </article>
    `;
  }

  function renderReply(reply) {
    return `
      <article class="comment reply">
        <header>
          <strong>${escapeHTML(reply.username)}</strong>
          <time>${new Date(reply.createdAt).toLocaleString()}</time>
        </header>
        <p>${escapeHTML(reply.body)}</p>
      </article>
    `;
  }

  function addComment(form) {
    const user = currentUser();
    const body = String(new FormData(form).get("body")).trim();

    if (!body) return false;

    if (!user || !user.verified) {
      window.BlogUserSystem.openAuthModal("Please sign in to publish your comment.");
      return false;
    }

    const postKey = getPostKey();
    const commentsByPost = getComments();
    const comments = commentsByPost[postKey] || [];
    const parentId = form.dataset.parentId;
    const entry = {
      id: makeId(),
      username: user.username,
      body,
      createdAt: Date.now(),
      replies: []
    };

    if (parentId) {
      const parent = comments.find(comment => comment.id === parentId);
      if (parent) parent.replies.push(entry);
    } else {
      comments.push(entry);
    }

    commentsByPost[postKey] = comments;
    saveComments(commentsByPost);
    return true;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("comments-root");
    if (!root || !window.BlogUserSystem) return;

    render(root);

    document.addEventListener("blog-auth-change", () => render(root));

    root.addEventListener("submit", event => {
      event.preventDefault();
      const form = event.target;
      if (form.dataset.action !== "comment") return;

      if (addComment(form)) render(root);
    });

    root.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;

      if (button.dataset.action === "sign-out") {
        window.BlogUserSystem.signOut();
      }

      if (button.dataset.action === "toggle-comments") {
        expanded = !expanded;
        render(root);
      }

      if (button.dataset.action === "show-reply") {
        if (!currentUser()) {
          window.BlogUserSystem.openAuthModal("Please sign in to reply.");
          return;
        }

        const comment = button.closest(".comment");
        const slot = comment.querySelector(".reply-slot");
        slot.innerHTML = renderComposer(button.dataset.commentId);
        slot.querySelector("textarea")?.focus();
      }
    });
  });
})();
