import { useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import PagePasswordGate from '../../components/common/PagePasswordGate';
import { DOC_CATEGORIES, DOC_ITEMS } from './docData';

function matchesQuery(item, q) {
  if (!q) return true;
  const hay = [
    item.title,
    item.summary,
    ...(item.tags || []),
    item.category,
    ...flattenBodyText(item.body),
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function flattenBodyText(body = []) {
  const out = [];
  body.forEach((block) => {
    if (block.content) out.push(String(block.content));
    if (block.items) {
      block.items.forEach((it) => {
        if (typeof it === 'string') out.push(it);
        else out.push([it.label, it.path, it.note, it.role, it.email].filter(Boolean).join(' '));
      });
    }
  });
  return out;
}

function BodyBlock({ block }) {
  if (block.type === 'text' || block.type === 'route' || block.type === 'api' || block.type === 'next') {
    return (
      <p className={`yulo-doc-block yulo-doc-block--${block.type}`}>
        {block.type === 'api' && <i className="bi bi-braces me-2" />}
        {block.type === 'route' && <i className="bi bi-link-45deg me-2" />}
        {block.type === 'next' && <i className="bi bi-arrow-right-circle me-2" />}
        {block.content}
      </p>
    );
  }

  if (block.type === 'code') {
    return (
      <pre className="yulo-doc-code">
        <code>{block.content}</code>
      </pre>
    );
  }

  if (block.type === 'checklist') {
    return (
      <ul className="yulo-doc-checklist">
        {block.items.map((item) => (
          <li key={item}>
            <i className="bi bi-check2-square me-2" />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === 'creds') {
    return (
      <div className="yulo-doc-creds">
        {block.items.map((c) => (
          <div key={c.email} className="yulo-doc-cred">
            <strong>{c.role}</strong>
            <span>{c.email}</span>
            <code>{c.password}</code>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === 'files') {
    return (
      <div className="yulo-doc-files">
        {block.items.map((f) => (
          <div key={`${f.label}-${f.path}`} className="yulo-doc-file">
            <div className="yulo-doc-file__label">
              <i className="bi bi-folder2-open me-2" />
              {f.label}
            </div>
            <code className="yulo-doc-file__path">{f.path}</code>
            {f.note && <div className="yulo-doc-file__note">{f.note}</div>}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function DocCard({ item, open, onToggle }) {
  return (
    <article className={`yulo-doc-card ${open ? 'yulo-doc-card--open' : ''}`}>
      <button type="button" className="yulo-doc-card__head" onClick={onToggle}>
        <div>
          <div className="yulo-doc-card__meta">
            <span className="yulo-doc-chip">{item.category}</span>
            {(item.tags || []).slice(0, 4).map((t) => (
              <span key={t} className="yulo-doc-tag">
                {t}
              </span>
            ))}
          </div>
          <h3 className="yulo-doc-card__title">{item.title}</h3>
          <p className="yulo-doc-card__summary">{item.summary}</p>
        </div>
        <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} />
      </button>
      {open && (
        <div className="yulo-doc-card__body">
          {item.body.map((block, idx) => (
            <BodyBlock key={`${item.id}-${idx}`} block={block} />
          ))}
        </div>
      )}
    </article>
  );
}

export default function Doc() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DOC_ITEMS.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      return matchesQuery(item, q);
    });
  }, [query, category]);

  const counts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = { all: 0 };
    DOC_CATEGORIES.forEach((c) => {
      if (c.id !== 'all') map[c.id] = 0;
    });
    DOC_ITEMS.forEach((item) => {
      if (!matchesQuery(item, q)) return;
      map.all += 1;
      map[item.category] = (map[item.category] || 0) + 1;
    });
    return map;
  }, [query]);

  return (
    <PagePasswordGate
      id="doc"
      password="Hosur@1998"
      title="Project Doc locked"
      message="Enter the documentation password to view project guides and next steps."
    >
      <div className="yulo-doc">
        <PageHeader
          title="Project Doc"
          subtitle="Complete guide — pages, images, database files, APIs, and next steps"
        />

        <div className="yulo-doc-search">
          <i className="bi bi-search" />
          <input
            type="search"
            className="form-control"
            placeholder="Search pages, files, images, database, API, next steps…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button type="button" className="yulo-doc-search__clear" onClick={() => setQuery('')}>
              <i className="bi bi-x-lg" />
            </button>
          )}
        </div>

        <div className="yulo-doc-cats">
          {DOC_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`yulo-doc-cat ${category === c.id ? 'is-active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              <i className={`bi ${c.icon}`} />
              <span>{c.label}</span>
              <em>{counts[c.id] ?? 0}</em>
            </button>
          ))}
        </div>

        <div className="yulo-doc-toolbar">
          <span>
            Showing <strong>{filtered.length}</strong> of {DOC_ITEMS.length} topics
          </span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-dark"
              onClick={() => setOpenId(filtered[0]?.id || null)}
              disabled={!filtered.length}
            >
              Expand first
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setOpenId(null)}>
              Collapse
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="yulo-doc-empty">
            <i className="bi bi-search display-6 d-block mb-2" />
            No topics match “{query}”. Try “hero”, “seed.sql”, “checkout”, or “glasses”.
          </div>
        ) : (
          <div className="yulo-doc-list">
            {filtered.map((item) => (
              <DocCard
                key={item.id}
                item={item}
                open={openId === item.id}
                onToggle={() => setOpenId((id) => (id === item.id ? null : item.id))}
              />
            ))}
          </div>
        )}

        <div className="yulo-doc-footnote">
          Content source: <code>admin/src/pages/Doc/docData.js</code> — update this file as the project grows.
        </div>
      </div>
    </PagePasswordGate>
  );
}
