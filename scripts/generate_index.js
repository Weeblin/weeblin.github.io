#!/usr/bin/env node
/*
 * Script to scan the blogs directory and generate a categories.json file.
 *
 * The output JSON has the shape:
 *   { "categories": [ { name, slug, posts: [ { title, slug, date, summary, tags, path } ] } ] }
 *
 * This file drives the navigation and category pages on the client side.
 */

const fs = require('fs');
const path = require('path');

// Slugify a string for use in URLs
function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const blogsDir = path.join(__dirname, '..', 'blogs');
const outFile = path.join(__dirname, '..', 'categories.json');

function collect() {
  const categories = [];
  if (!fs.existsSync(blogsDir)) {
    console.error('blogs directory does not exist');
    return [];
  }
  const catDirs = fs.readdirSync(blogsDir).filter(f => fs.statSync(path.join(blogsDir, f)).isDirectory());
  catDirs.forEach(catDir => {
    const catPath = path.join(blogsDir, catDir);
    const catSlug = slugify(catDir);
    const posts = [];
    const postDirs = fs.readdirSync(catPath).filter(p => fs.statSync(path.join(catPath, p)).isDirectory());
    postDirs.forEach(postDir => {
      const postPath = path.join(catPath, postDir);
      const postSlug = slugify(postDir);
      const metaPath = path.join(postPath, 'meta.json');
      let meta = {};
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch (e) {
          console.warn(`Could not parse ${metaPath}:`, e.message);
        }
      }
      posts.push({
        title: meta.title || postDir,
        slug: postSlug,
        date: meta.date || null,
        summary: meta.summary || null,
        tags: meta.tags || [],
        path: `blogs/${catDir}/${postDir}`
      });
    });
    // Sort posts by date descending
    posts.sort((a, b) => {
      const da = a.date ? new Date(a.date) : new Date(0);
      const db = b.date ? new Date(b.date) : new Date(0);
      return db - da;
    });
    categories.push({ name: catDir, slug: catSlug, posts });
  });
  return categories;
}

function main() {
  const categories = collect();
  const data = { categories };
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
  console.log(`Written ${categories.length} categories to ${outFile}`);
}

main();