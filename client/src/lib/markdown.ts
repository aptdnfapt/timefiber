import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import plaintext from 'highlight.js/lib/languages/plaintext';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('text', plaintext);

const knownLanguages = hljs.listLanguages();

const mdParser = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code: string, lang: string) {
      if (lang && knownLanguages.includes(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      const detected = hljs.highlightAuto(code).language;
      if (detected) {
        return hljs.highlight(code, { language: detected }).value;
      }
      return hljs.highlight(code, { language: 'plaintext' }).value;
    },
  }),
  { gfm: true, breaks: true }
);

mdParser.use({
  renderer: {
    link(token: any) {
      const href = token.href || '';
      const text = token.text || token.tokens?.map((t: any) => t.raw || '').join('') || '';
      return `<a href="${href}" target="_blank">${text}</a>`;
    },
    image(token: any) {
      const url = token.href || '';
      const alt = token.text || '';
      const uuid = url.split('/').pop() || url;
      return `<picture class="md-img-wrap">
        <source srcset="/uploads/${uuid}.avif" type="image/avif">
        <img src="/uploads/${uuid}.webp" loading="lazy" alt="${alt}" class="md-img-inline" onclick="event.stopPropagation();window.dispatchEvent(new CustomEvent('lightbox-open',{detail:'/uploads/${uuid}.avif'}))">
      </picture>`;
    },
  },
});

function processTextTokens(token: any, regex: RegExp) {
  if (token.type === 'text' && token.text && regex.test(token.text)) {
    regex.lastIndex = 0;
    const newTokens: any[] = [];
    let lastIdx = 0;
    for (const match of token.text.matchAll(regex)) {
      const idx = match.index!;
      if (idx > lastIdx) {
        newTokens.push({ type: 'text', raw: token.text.slice(lastIdx, idx), text: token.text.slice(lastIdx, idx) });
      }
      newTokens.push({
        type: 'html',
        raw: match[0],
        text: `<span class="md-quote-str">${match[2]}</span>`,
      });
      lastIdx = idx + match[0].length;
    }
    if (lastIdx < token.text.length) {
      newTokens.push({ type: 'text', raw: token.text.slice(lastIdx), text: token.text.slice(lastIdx) });
    }
    return newTokens;
  }
  if (token.tokens) {
    const newChildren: any[] = [];
    for (const child of token.tokens) {
      const processed = processTextTokens(child, regex);
      if (Array.isArray(processed)) {
        newChildren.push(...processed);
      } else {
        newChildren.push(child);
      }
    }
    token.tokens = newChildren;
  }
  return null; // signal: already modified in-place
}

mdParser.use({
  walkTokens(token: any) {
    const regex = /(['"])(.+?)\1(?=\s|[.,;:!?)"'/<\-]|$)/g;
    if (token.tokens) {
      processTextTokens(token, regex);
    }
  },
});

export function renderMarkdown(raw: string): string {
  const html = mdParser.parse(raw) as string;
  return `<div class="md-render">${html}</div>`;
}
