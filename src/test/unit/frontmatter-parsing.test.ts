import * as assert from 'assert';
import { parseFrontmatterValues } from '../../shortcode-utils';

describe('parseFrontmatterValues', () => {
  describe('basic frontmatter detection', () => {
    it('returns empty array when no frontmatter', () => {
      const text = 'No frontmatter here';
      const result = parseFrontmatterValues(text, 'key');
      assert.deepStrictEqual(result, []);
    });

    it('returns empty array when frontmatter not closed', () => {
      const text = '---\nkey: value\n';
      const result = parseFrontmatterValues(text, 'key');
      assert.deepStrictEqual(result, []);
    });

    it('returns empty array when key not found', () => {
      const text = '---\nother: value\n---';
      const result = parseFrontmatterValues(text, 'key');
      assert.deepStrictEqual(result, []);
    });
  });

  describe('acronyms.keys pattern', () => {
    const acronymsDoc = `---
title: Test Doc
acronyms:
  keys:
    - shortname: API
      longname: Application Programming Interface
    - shortname: HTML
      longname: HyperText Markup Language
    - shortname: CSS
      longname: Cascading Style Sheets
---

Content here
`;

    it('parses all shortnames from acronyms.keys', () => {
      const result = parseFrontmatterValues(acronymsDoc, 'acronyms.keys', 'shortname');
      assert.strictEqual(result.length, 3);
      assert.deepStrictEqual(
        result.map(r => r.key),
        ['API', 'HTML', 'CSS']
      );
    });

    it('uses shortname as default valuePath', () => {
      const result = parseFrontmatterValues(acronymsDoc, 'acronyms.keys');
      assert.strictEqual(result.length, 3);
    });

    it('can extract longname instead', () => {
      const result = parseFrontmatterValues(acronymsDoc, 'acronyms.keys', 'longname');
      assert.strictEqual(result.length, 3);
      assert.deepStrictEqual(
        result.map(r => r.key),
        ['Application Programming Interface', 'HyperText Markup Language', 'Cascading Style Sheets']
      );
    });
  });

  describe('single-level key', () => {
    const simpleDoc = `---
glossary:
  - term: apple
    definition: A fruit
  - term: banana
    definition: Another fruit
---`;

    it('parses values from single-level key', () => {
      const result = parseFrontmatterValues(simpleDoc, 'glossary', 'term');
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(
        result.map(r => r.key),
        ['apple', 'banana']
      );
    });
  });

  describe('quoted values', () => {
    const quotedDoc = `---
items:
  keys:
    - name: "quoted value"
    - name: 'single quoted'
    - name: unquoted
---`;

    it('strips quotes from values', () => {
      const result = parseFrontmatterValues(quotedDoc, 'items.keys', 'name');
      assert.strictEqual(result.length, 3);
      assert.deepStrictEqual(
        result.map(r => r.key),
        ['quoted value', 'single quoted', 'unquoted']
      );
    });
  });

  describe('indentation handling', () => {
    const indentedDoc = `---
level1:
  level2:
    - field: value1
    - field: value2
other:
  - field: should not appear
---`;

    it('stops parsing at same indentation level', () => {
      const result = parseFrontmatterValues(indentedDoc, 'level1.level2', 'field');
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(
        result.map(r => r.key),
        ['value1', 'value2']
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty section', () => {
      const doc = `---
acronyms:
  keys:
other: value
---`;
      const result = parseFrontmatterValues(doc, 'acronyms.keys', 'shortname');
      assert.deepStrictEqual(result, []);
    });

    it('handles document with only frontmatter', () => {
      const doc = `---
data:
  items:
    - name: test
---`;
      const result = parseFrontmatterValues(doc, 'data.items', 'name');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].key, 'test');
    });

    it('handles multiple occurrences of key in different contexts', () => {
      // The keys: under filters should not be matched
      const doc = `---
filters:
  - acronyms
acronyms:
  keys:
    - shortname: TEST
---`;
      const result = parseFrontmatterValues(doc, 'acronyms.keys', 'shortname');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].key, 'TEST');
    });
  });
});
