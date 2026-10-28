import {test,expect} from 'bun:test';
import {renderStrategyMarkdown} from '../../src/lib/modules/strategy/server/document-markdown';

test('saved Strategy Markdown renders headings and paragraphs without changing source',()=>{
 const source='# Viability Check\n\nA **confirmed** finding.\n\n- One decision\n';
 const html=renderStrategyMarkdown(source);
 expect(html).toContain('<h1>Viability Check</h1>');
 expect(html).toContain('<strong>confirmed</strong>');
 expect(html).toContain('<li>One decision</li>');
 expect(source).toBe('# Viability Check\n\nA **confirmed** finding.\n\n- One decision\n');
});

test('stored HTML, event handlers and executable links cannot become active content',()=>{
 const html=renderStrategyMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[open](javascript:alert(1))\n\n![remote](https://example.test/tracker.png)');
 expect(html).not.toContain('<script>');
 expect(html).not.toContain('<img');
 expect(html).not.toMatch(/href=["']javascript:/i);
 expect(html).toContain('&lt;script&gt;');
 expect(html).toContain('&lt;img');
});
