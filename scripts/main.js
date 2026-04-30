/*
 * Main JavaScript for the minimalist academic blog.
 *
 * Responsibilities:
 *  - Load category and post metadata from categories.json
 *  - Render navigation bar dynamically
 *  - Render recent posts, category pages and individual posts
 *  - Handle mobile menu toggling
 */

// Utility to fetch JSON files relative to the site root
async function fetchJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  }
  return await response.json();
}

// Utility to get query parameters
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function encodePath(path) {
  return path.split('/').map(part => encodeURIComponent(part)).join('/');
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isImageFile(file) {
  return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(file);
}

function parseObsidianImageOptions(label, fallbackAlt) {
  const cleanLabel = label.trim();
  const sizeMatch = cleanLabel.match(/^(\d+)(?:x(\d+))?$/i);

  if (!sizeMatch) {
    return {
      alt: cleanLabel || fallbackAlt,
      attributes: ""
    };
  }

  const width = Math.max(1, Number(sizeMatch[1]));
  const height = sizeMatch[2] ? Math.max(1, Number(sizeMatch[2])) : null;
  const style = `width: min(${width}px, 100%); height: ${height ? `${height}px` : "auto"};`;

  return {
    alt: fallbackAlt,
    attributes: ` style="${style}"`
  };
}

function preprocessPostMarkdown(markdown, postPath) {
  const attachmentsPath = `${postPath}/attachments`;

  return markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, rawFile, rawLabel) => {
    const file = rawFile.trim();
    const label = (rawLabel || "").trim();
    const url = encodePath(`${attachmentsPath}/${file}`);

    if (isImageFile(file)) {
      const options = parseObsidianImageOptions(label, file);
      return `<img src="${url}" alt="${escapeAttribute(options.alt)}" loading="lazy"${options.attributes} />`;
    }

    return `[${label || file}](${url})`;
  });
}

// Toggle navigation on mobile
function setupMenuToggle() {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }
}

// Build navigation bar
async function buildNavigation(categories) {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  // Clear existing
  nav.innerHTML = '';
  // Add category links
  categories.forEach(cat => {
    const link = document.createElement('a');
    link.href = `category.html?category=${encodeURIComponent(cat.slug)}`;
    link.textContent = cat.name;
    nav.appendChild(link);
  });
  // Add About link
  const about = document.createElement('a');
  about.href = 'about.html';
  about.textContent = 'About';
  nav.appendChild(about);
}

// Render recent posts on the homepage
function renderRecentPosts(categories) {
  const container = document.getElementById('recent-list');
  if (!container) return;
  // Flatten posts from all categories and sort by date descending
  const posts = [];
  categories.forEach(cat => {
    cat.posts.forEach(post => {
      posts.push({ ...post, category: cat.slug, categoryName: cat.name });
    });
  });
  posts.sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA;
  });
  // Show up to 5 recent posts
  const recent = posts.slice(0, 5);
  recent.forEach(post => {
    const card = document.createElement('div');
    card.className = 'post-card';
    const title = document.createElement('h2');
    const link = document.createElement('a');
    link.href = `post.html?category=${encodeURIComponent(post.category)}&post=${encodeURIComponent(post.slug)}`;
    link.textContent = post.title;
    title.appendChild(link);
    const meta = document.createElement('div');
    meta.className = 'meta';
    const dateStr = post.date ? new Date(post.date).toLocaleDateString() : '';
    meta.textContent = `${post.categoryName} • ${dateStr}`;
    const summary = document.createElement('p');
    summary.textContent = post.summary || '';
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(summary);
    container.appendChild(card);
  });
}

// Render posts list for a category page
function renderCategoryPage(category) {
  const titleEl = document.getElementById('category-title');
  const listEl = document.getElementById('posts-list');
  if (titleEl) {
    titleEl.textContent = category.name;
  }
  if (listEl) {
    listEl.innerHTML = '';
    category.posts.forEach(post => {
      const card = document.createElement('div');
      card.className = 'post-card';
      const title = document.createElement('h2');
      const link = document.createElement('a');
      link.href = `post.html?category=${encodeURIComponent(category.slug)}&post=${encodeURIComponent(post.slug)}`;
      link.textContent = post.title;
      title.appendChild(link);
      const meta = document.createElement('div');
      meta.className = 'meta';
      const dateStr = post.date ? new Date(post.date).toLocaleDateString() : '';
      meta.textContent = dateStr;
      const summary = document.createElement('p');
      summary.textContent = post.summary || '';
      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(summary);
      listEl.appendChild(card);
    });
  }
}

// Render a single post page
async function renderPostPage(categorySlug, postSlug) {
  const article = document.getElementById('post-content');
  if (!article) return;
  // Build path
  const path = `blogs/${decodeURIComponent(categorySlug)}/${decodeURIComponent(postSlug)}`;
  // Fetch metadata
  let meta = {};
  try {
    meta = await fetchJSON(`${path}/meta.json`);
  } catch (err) {
    console.warn('No meta.json found for post:', err);
  }
  // Determine content file
  let contentFile = 'content.md';
  try {
    // Attempt to fetch markdown first; fallback to tex
    const mdResp = await fetch(`${path}/content.md`);
    if (!mdResp.ok) throw new Error('No MD');
    var contentText = await mdResp.text();
    contentFile = 'md';
  } catch (e) {
    const texResp = await fetch(`${path}/content.tex`);
    contentText = await texResp.text();
    contentFile = 'tex';
  }
  // Render title
  if (meta.title) {
    const heading = document.createElement('h1');
    heading.textContent = meta.title;
    article.appendChild(heading);
  }
  // Render date and tags
  if (meta.date || (meta.tags && meta.tags.length)) {
    const metaDiv = document.createElement('div');
    metaDiv.className = 'meta';
    const parts = [];
    if (meta.date) {
      parts.push(new Date(meta.date).toLocaleDateString());
    }
    if (meta.tags && meta.tags.length) {
      parts.push(meta.tags.join(', '));
    }
    metaDiv.textContent = parts.join(' • ');
    article.appendChild(metaDiv);
  }
  // Render content
  const contentDiv = document.createElement('div');
  if (contentFile === 'md') {
    contentDiv.innerHTML = marked.parse(preprocessPostMarkdown(contentText, path), { breaks: true });
  } else {
    // For LaTeX we escape HTML and wrap in pre/code
    const pre = document.createElement('pre');
    pre.textContent = contentText;
    contentDiv.appendChild(pre);
  }
  article.appendChild(contentDiv);
}

// Entry point
document.addEventListener('DOMContentLoaded', async () => {
  setupMenuToggle();
  // Load categories from JSON
  let data;
  try {
    data = await fetchJSON('categories.json');
  } catch (err) {
    console.error('Could not load categories.json', err);
    return;
  }
  const categories = data.categories || [];
  await buildNavigation(categories);
  // Determine page by inspecting body classes or URL
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);
  if (page === 'index.html' || page === '' || page === '/') {
    renderRecentPosts(categories);
  } else if (page.startsWith('category')) {
    const slug = getQueryParam('category');
    if (!slug) return;
    const cat = categories.find(c => c.slug === decodeURIComponent(slug));
    if (cat) {
      renderCategoryPage(cat);
    } else {
      const titleEl = document.getElementById('category-title');
      if (titleEl) titleEl.textContent = 'Category Not Found';
    }
  } else if (page.startsWith('post')) {
    const catSlug = getQueryParam('category');
    const postSlug = getQueryParam('post');
    if (catSlug && postSlug) {
      await renderPostPage(catSlug, postSlug);
    }
  }
});
