const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB = process.env.NOTION_DATABASE_ID;

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function blocksToHtml(blocks) {
  return blocks.map(b => {
    const text = b[b.type]?.rich_text?.map(t => t.plain_text).join('') || '';
    if (b.type === 'paragraph') return text ? `<p>${text}</p>` : '';
    if (b.type === 'heading_1') return `<h2>${text}</h2>`;
    if (b.type === 'heading_2') return `<h3>${text}</h3>`;
    if (b.type === 'heading_3') return `<h4>${text}</h4>`;
    if (b.type === 'bulleted_list_item') return `<li>${text}</li>`;
    if (b.type === 'numbered_list_item') return `<li>${text}</li>`;
    if (b.type === 'code') return `<pre><code>${text}</code></pre>`;
    if (b.type === 'quote') return `<blockquote>${text}</blockquote>`;
    return '';
  }).join('\n');
}

function postHtml(title, dateStr, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — milkdev</title>
    <link rel="icon" href="../../res/img/milkmandev-avatar.ico" />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Inconsolata:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../css/style.css">
</head>
<body>
    <div id="layout">
        <main id="content-resume">
            <div>
                <div class="box">
                    <div class="box-title">${title}</div>
                    <div class="content-wrapper">
                        <p class="post-meta">${dateStr}</p>
                        <div class="post-body">
                            ${body}
                        </div>
                        <a href="../blog-home.html" class="post-back">← back to milk archives</a>
                    </div>
                </div>
            </div>
            <aside>
                <div class="box">
                    <div class="box-title">Explore!</div>
                    <nav>
                        <a href="../../home.html" class="nav-button">Home</a>
                        <a href="../blog-home.html" class="nav-button">Milk Archives</a>
                    </nav>
                </div>
            </aside>
        </main>
        <footer>milkman ©2025 — made with ❤️ on neocities</footer>
    </div>
</body>
</html>`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

async function fetchBlocks(pageId) {
  const blocks = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor });
    blocks.push(...res.results);
    cursor = res.next_cursor;
  } while (cursor);
  return blocks;
}

async function main() {
  const res = await notion.databases.query({
    database_id: DB,
    filter: { property: 'Published', checkbox: { equals: true } },
    sorts: [{ property: 'Date', direction: 'descending' }],
  });

  const posts = [];

  for (const page of res.results) {
    const title = page.properties.Title.title[0]?.plain_text || 'Untitled';
    const dateIso = page.properties.Date?.date?.start;
    if (!dateIso) { console.warn(`Skipping "${title}": no date`); continue; }
    const slug = page.properties.Filename?.rich_text[0]?.plain_text || slugify(title);

    const blocks = await fetchBlocks(page.id);
    const body = blocksToHtml(blocks);
    const html = postHtml(title, formatDate(dateIso), body);

    const outPath = path.join('blog', 'posts', `${slug}.html`);
    fs.writeFileSync(outPath, html);
    console.log(`wrote ${outPath}`);

    posts.push({ title, slug, dateIso, year: new Date(dateIso).getFullYear(), short: shortDate(dateIso) });
  }

  // Rebuild blog-home.html archive section from Notion posts
  const byYear = posts.reduce((acc, p) => {
    (acc[p.year] = acc[p.year] || []).push(p);
    return acc;
  }, {});

  const archiveSections = Object.keys(byYear).sort((a, b) => b - a).map(year => `
            <div class="archive-section">
              <h2 class="archive-year-heading">${year}</h2>
              <ul class="archive-post-list">
                ${byYear[year].map(p => `<li class="archive-post-item">
                  <a href="./posts/${p.slug}.html" class="archive-post-title">${p.title}</a>
                  <span class="archive-post-date">${p.short}</span>
                </li>`).join('\n                ')}
              </ul>
            </div>`).join('\n');

  const blogHome = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milk Archives — Milk Space</title>
  <link rel="icon" href="../res/img/milkmandev-avatar.ico" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <div id="layout">
    <main id="content-resume">
      <div>
        <div class="box">
          <div class="box-title">Milk Archives</div>
          <div class="content-wrapper">
            ${archiveSections}
          </div>
        </div>
      </div>
      <aside>
        <div class="box">
          <div class="box-title">Explore!</div>
          <nav>
            <a href="../home.html" class="nav-button">Home</a>
            <a href="./blog-home.html" class="nav-button">Milk Archives</a>
          </nav>
        </div>
      </aside>
    </main>
    <footer>milkman ©2025 — made with ❤️ on neocities</footer>
  </div>
</body>
</html>`;

  fs.writeFileSync('blog/blog-home.html', blogHome);
  console.log('wrote blog/blog-home.html');
}

main().catch(e => { console.error(e); process.exit(1); });
