import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('MarkdownRenderer', () => {
  it('plain text passes through unchanged', () => {
    const out = renderMarkdown('hello world');
    expect(out).toContain('<p>hello world</p>');
  });

  it('bold renders correctly', () => {
    const out = renderMarkdown('**bold text**');
    expect(out).toContain('<strong>bold text</strong>');
  });

  it('italic renders correctly', () => {
    const out = renderMarkdown('*italic text*');
    expect(out).toContain('<em>italic text</em>');
  });

  it('headers have md-render wrapper and correct font-size via CSS', () => {
    const out = renderMarkdown('# Heading');
    expect(out.startsWith('<div class="md-render">')).toBe(true);
    // h1 gets .md-render context in CSS, font-size: 1em
    expect(out).toContain('<h1>Heading</h1>');
  });

  it('h2-h6 get correct tags', () => {
    const out = renderMarkdown('## H2\n### H3\n#### H4');
    expect(out).toContain('<h2>H2</h2>');
    expect(out).toContain('<h3>H3</h3>');
    expect(out).toContain('<h4>H4</h4>');
  });

  it('fenced code block with language gets syntax highlighting', () => {
    const out = renderMarkdown('```js\nconst x = 1;\n```');
    // highlight.js produces <span class="hljs-keyword">const</span> etc.
    expect(out).toContain('hljs-keyword');
    expect(out).toContain('hljs');
  });

  it('fenced code block without language auto-detects', () => {
    const out = renderMarkdown('```\nfunction foo() { return 1; }\n```');
    // auto-detection works, should still have hljs classes
    expect(out).toContain('hljs');
  });

  it('inline code wrapped in code tags', () => {
    const out = renderMarkdown('use `const` here');
    expect(out).toContain('<code>const</code>');
  });

  it('single quotes render as plain text, not mangled', () => {
    const out = renderMarkdown("it's working");
    // no span.md-quote-str wrapping (&#39; is normal HTML escaping, rendered as ' in browser)
    expect(out).not.toContain('md-quote-str');
    expect(out).toContain('&#39;');
  });

  it('double quotes render as plain text, not mangled', () => {
    const out = renderMarkdown('she said "hello"');
    expect(out).not.toContain('md-quote-str');
    expect(out).toContain('&quot;');
  });

  it('links render with target="_blank"', () => {
    const out = renderMarkdown('[click](https://example.com)');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('href="https://example.com"');
  });

  it('empty string returns wrapper with empty paragraph', () => {
    expect(() => renderMarkdown('')).not.toThrow();
  });

  it('code blocks with python get correct highlighting', () => {
    const out = renderMarkdown('```python\ndef foo():\n    pass\n```');
    expect(out).toContain('hljs-keyword');
    expect(out).toContain('def');
  });

  it('bullet list renders correctly', () => {
    const out = renderMarkdown('- item 1\n- item 2');
    expect(out).toContain('<ul>');
    expect(out).toContain('<li>item 1</li>');
  });
});
