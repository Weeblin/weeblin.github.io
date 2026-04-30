(function () {
  const GISCUS_CONFIG = {
    repo: "Weeblin/weeblin.github.io",
    repoId: "R_kgDOKccf_w",
    category: "General",
    categoryId: "PASTE_DISCUSSION_CATEGORY_ID_HERE",
    lang: "en"
  };

  function getPostTerm() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category") || "unknown-category";
    const post = params.get("post") || "unknown-post";
    return `post:${category}/${post}`;
  }

  function getTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function hasCompleteConfig() {
    return Boolean(
      GISCUS_CONFIG.repo &&
      GISCUS_CONFIG.repoId &&
      GISCUS_CONFIG.category &&
      GISCUS_CONFIG.categoryId &&
      !GISCUS_CONFIG.repoId.includes("PASTE_") &&
      !GISCUS_CONFIG.categoryId.includes("PASTE_")
    );
  }

  function renderSetupNotice(root) {
    root.innerHTML = `
      <h2>Comments</h2>
      <div class="giscus-setup-note">
        <p>Giscus is ready to use after you paste your Discussion category id into <code>scripts/giscus-comments.js</code>.</p>
        <p>Enable Discussions for <code>${GISCUS_CONFIG.repo}</code>, install the Giscus GitHub App, then use <a href="https://giscus.app/" target="_blank" rel="noopener">giscus.app</a> to generate that value.</p>
      </div>
    `;
  }

  function loadGiscus(root) {
    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", GISCUS_CONFIG.repo);
    script.setAttribute("data-repo-id", GISCUS_CONFIG.repoId);
    script.setAttribute("data-category", GISCUS_CONFIG.category);
    script.setAttribute("data-category-id", GISCUS_CONFIG.categoryId);
    script.setAttribute("data-mapping", "specific");
    script.setAttribute("data-term", getPostTerm());
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "bottom");
    script.setAttribute("data-theme", getTheme());
    script.setAttribute("data-lang", GISCUS_CONFIG.lang);
    script.setAttribute("data-loading", "lazy");

    root.innerHTML = "<h2>Comments</h2>";
    root.appendChild(script);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("comments-root");
    if (!root) return;

    if (!hasCompleteConfig()) {
      renderSetupNotice(root);
      return;
    }

    loadGiscus(root);

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      const iframe = document.querySelector("iframe.giscus-frame");
      if (!iframe) return;

      iframe.contentWindow.postMessage(
        { giscus: { setConfig: { theme: getTheme() } } },
        "https://giscus.app"
      );
    });
  });
})();
