(function () {
  const SEARCH_MIN_CHARS = 2;

  function stripMarkdown(text) {
    return text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
      .replace(/\[[^\]]*\]\([^)]+\)/g, " ")
      .replace(/[#>*_~`$\\{}[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function loadSearchIndex() {
    const res = await fetch("categories.json");
    const data = await res.json();

    const posts = [];

    for (const category of data.categories || []) {
      for (const post of category.posts || []) {
        let content = "";

        try {
          const md = await fetch(`${post.path}/content.md`);
          if (md.ok) content = await md.text();
        } catch (_) {}

        if (!content) {
          try {
            const tex = await fetch(`${post.path}/content.tex`);
            if (tex.ok) content = await tex.text();
          } catch (_) {}
        }

        posts.push({
          title: post.title || "",
          summary: post.summary || "",
          content: stripMarkdown(content),
          category: category.slug,
          categoryName: category.name,
          slug: post.slug,
          date: post.date,
          url: `post.html?category=${encodeURIComponent(category.slug)}&post=${encodeURIComponent(post.slug)}`
        });
      }
    }

    return posts;
  }

  function createSearchUI() {
    const header = document.querySelector("#search-slot") || document.querySelector(".site-header");
    if (!header || document.querySelector(".site-search")) return null;

    const wrapper = document.createElement("div");
    wrapper.className = "site-search";

    wrapper.innerHTML = `
      <button class="search-toggle" aria-label="Open search" type="button">&#128269;</button>
      <input
        id="site-search-input"
        class="search-input"
        type="search"
        placeholder="Search posts..."
        autocomplete="off"
      />
      <div id="site-search-results" class="search-results" hidden></div>
    `;

    header.appendChild(wrapper);

    return wrapper;
  }

  function renderResults(resultsEl, results, query) {
    if (!query || query.length < SEARCH_MIN_CHARS) {
      resultsEl.hidden = true;
      resultsEl.innerHTML = "";
      return;
    }

    if (!results.length) {
      resultsEl.hidden = false;
      resultsEl.innerHTML = `<div class="search-empty">No matching posts.</div>`;
      return;
    }

    resultsEl.hidden = false;
    resultsEl.innerHTML = results
      .slice(0, 8)
      .map(
        post => `
          <a class="search-result" href="${post.url}">
            <strong>${post.title}</strong>
            <span>${post.categoryName}${post.date ? " • " + post.date : ""}</span>
            <p>${post.summary || post.content.slice(0, 120) + "..."}</p>
          </a>
        `
      )
      .join("");
  }

  function searchPosts(index, query) {
    const q = query.toLowerCase().trim();
    if (q.length < SEARCH_MIN_CHARS) return [];

    return index
      .map(post => {
        const title = post.title.toLowerCase();
        const summary = post.summary.toLowerCase();
        const content = post.content.toLowerCase();

        let score = 0;
        if (title.includes(q)) score += 5;
        if (summary.includes(q)) score += 3;
        if (content.includes(q)) score += 1;

        return { ...post, score };
      })
      .filter(post => post.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const searchUI = createSearchUI();
    if (!searchUI) return;

    const input = searchUI.querySelector(".search-input");
    const button = searchUI.querySelector(".search-toggle");
    const resultsEl = searchUI.querySelector(".search-results");

    let index = [];

    try {
      index = await loadSearchIndex();
    } catch (err) {
      console.error("Search index failed to load:", err);
      return;
    }

    button.addEventListener("click", () => {
      searchUI.classList.toggle("open");
      input.focus();
    });

    input.addEventListener("focus", () => {
      searchUI.classList.add("open");
    });

    input.addEventListener("input", () => {
      const results = searchPosts(index, input.value);
      renderResults(resultsEl, results, input.value.trim());
    });

    document.addEventListener("click", event => {
      if (!searchUI.contains(event.target)) {
        resultsEl.hidden = true;
      }
    });
  });
})();
