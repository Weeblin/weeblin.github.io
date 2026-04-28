#!/usr/bin/env node
/*
 * Script to auto‑generate meta.json files for posts that don't have one.
 *
 * The script scans every post folder in blogs/<category>/<post>/ and, if
 * meta.json is missing, it creates one based on the folder name and content.
 * Title: Title‑cased folder name
 * Date: Current date (YYYY‑MM‑DD)
 * Tags: empty array
 * Summary: First 150 characters of the content with whitespace collapsed
 */

const fs = require('fs');
const path = require('path');

function titleCase(str) {
  return str.replace(/(^|[-_\s])(\w)/g, (_, p, c) => p === '-' || p === '_' || p === ' ' ? ' ' + c.toUpperCase() : c.toUpperCase());
}

function generateMetaForPost(postPath, postDir) {
  const metaPath = path.join(postPath, 'meta.json');
  if (fs.existsSync(metaPath)) return; // do nothing
  // Determine title from folder name
  const title = titleCase(postDir);
  // Determine date as today
  const today = new Date();
  const dateStr = today.toISOString().substring(0, 10);
  // Read content file
  const contentFile = ['content.md', 'content.tex'].find(name => fs.existsSync(path.join(postPath, name)));
  let summary = '';
  if (contentFile) {
    const raw = fs.readFileSync(path.join(postPath, contentFile), 'utf8');
    // Strip markdown/latex markup to get plain text summary
    summary = raw
      .replace(/```[\s\S]*?```/g, '') // remove code blocks
      .replace(/`[^`]*`/g, '') // remove inline code
      .replace(/\$[^$]*\$/g, '') // remove inline math
      .replace(/\{[^}]*\}/g, '') // remove braces in LaTeX
      .replace(/[#*_~>\[\]()]/g, '') // remove markdown syntax characters
      .replace(/\s+/g, ' ') // collapse whitespace
      .trim()
      .slice(0, 150);
  }
  const meta = {
    title,
    date: dateStr,
    tags: [],
    summary
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`Generated meta.json for ${postPath}`);
}

function main() {
  const blogsDir = path.join(__dirname, '..', 'blogs');
  const categories = fs.readdirSync(blogsDir).filter(f => fs.statSync(path.join(blogsDir, f)).isDirectory());
  categories.forEach(cat => {
    const catPath = path.join(blogsDir, cat);
    const posts = fs.readdirSync(catPath).filter(f => fs.statSync(path.join(catPath, f)).isDirectory());
    posts.forEach(post => {
      const postPath = path.join(catPath, post);
      generateMetaForPost(postPath, post);
    });
  });
}

main();