import * as assert from 'assert';
import { loadSpec, loadAllSpecs, loadFileData, clearCaches } from '../../spec-loader';

describe('spec-loader', () => {
  // Clear caches before each test to ensure isolation
  beforeEach(() => {
    clearCaches();
  });

  describe('loadSpec', () => {
    it('loads fa spec', () => {
      const spec = loadSpec('fa');
      assert.ok(spec !== null, 'fa spec should load');
      assert.strictEqual(spec!.shortcode, 'fa');
    });

    it('loads countdown spec', () => {
      const spec = loadSpec('countdown');
      assert.ok(spec !== null, 'countdown spec should load');
      assert.strictEqual(spec!.shortcode, 'countdown');
    });

    it('loads now spec', () => {
      const spec = loadSpec('now');
      assert.ok(spec !== null, 'now spec should load');
      assert.strictEqual(spec!.shortcode, 'now');
    });

    it('loads downloadthis spec', () => {
      const spec = loadSpec('downloadthis');
      assert.ok(spec !== null, 'downloadthis spec should load');
      assert.strictEqual(spec!.shortcode, 'downloadthis');
    });

    it('loads acr spec', () => {
      const spec = loadSpec('acr');
      assert.ok(spec !== null, 'acr spec should load');
      assert.strictEqual(spec!.shortcode, 'acr');
    });

    it('returns null for non-existent spec', () => {
      const spec = loadSpec('nonexistent-shortcode');
      assert.strictEqual(spec, null);
    });

    it('caches loaded specs', () => {
      const spec1 = loadSpec('fa');
      const spec2 = loadSpec('fa');
      assert.strictEqual(spec1, spec2, 'should return cached instance');
    });
  });

  describe('loadAllSpecs', () => {
    it('loads all 5 specs', () => {
      const specs = loadAllSpecs();
      assert.strictEqual(specs.length, 5, 'should load 5 specs');
    });

    it('includes all expected shortcodes', () => {
      const specs = loadAllSpecs();
      const shortcodeNames = specs.map(s => s.shortcode).sort();
      assert.deepStrictEqual(shortcodeNames, ['acr', 'countdown', 'downloadthis', 'fa', 'now']);
    });
  });

  describe('loadFileData', () => {
    it('loads fontawesome icons', () => {
      const icons = loadFileData('data/fontawesome-icons.json', 'icons');
      assert.ok(icons.length > 0, 'should load icons');
      assert.ok(icons.length > 1000, 'should have many icons');
    });

    it('includes common icons', () => {
      const icons = loadFileData('data/fontawesome-icons.json', 'icons');
      assert.ok(icons.includes('star'), 'should include star icon');
      assert.ok(icons.includes('heart'), 'should include heart icon');
      assert.ok(icons.includes('check'), 'should include check icon');
    });

    it('includes brand icons', () => {
      const icons = loadFileData('data/fontawesome-icons.json', 'icons');
      assert.ok(icons.includes('brands github'), 'should include github brand icon');
      assert.ok(icons.includes('brands twitter'), 'should include twitter brand icon');
    });

    it('returns empty array for non-existent file', () => {
      const data = loadFileData('data/nonexistent.json', 'items');
      assert.deepStrictEqual(data, []);
    });

    it('returns empty array for non-existent path', () => {
      const data = loadFileData('data/fontawesome-icons.json', 'nonexistent.path');
      assert.deepStrictEqual(data, []);
    });

    it('caches loaded data', () => {
      const icons1 = loadFileData('data/fontawesome-icons.json', 'icons');
      const icons2 = loadFileData('data/fontawesome-icons.json', 'icons');
      assert.strictEqual(icons1, icons2, 'should return cached instance');
    });
  });

  describe('clearCaches', () => {
    it('clears spec cache', () => {
      const spec1 = loadSpec('fa');
      clearCaches();
      const spec2 = loadSpec('fa');
      assert.notStrictEqual(spec1, spec2, 'should be different instances after cache clear');
    });

    it('clears file data cache', () => {
      const icons1 = loadFileData('data/fontawesome-icons.json', 'icons');
      clearCaches();
      const icons2 = loadFileData('data/fontawesome-icons.json', 'icons');
      assert.notStrictEqual(icons1, icons2, 'should be different instances after cache clear');
    });
  });

  describe('spec structure validation', () => {
    it('fa spec has arguments and attributes', () => {
      const spec = loadSpec('fa');
      assert.ok(spec!.arguments, 'fa should have arguments');
      assert.ok(spec!.arguments!.length > 0, 'fa should have at least one argument');
      assert.ok(spec!.attributes, 'fa should have attributes');
      assert.ok(spec!.attributes!.length > 0, 'fa should have at least one attribute');
    });

    it('fa spec first argument uses file-data completion', () => {
      const spec = loadSpec('fa');
      const firstArg = spec!.arguments![0];
      assert.strictEqual(firstArg.name, 'icon');
      assert.strictEqual(firstArg.completion.type, 'file-data');
    });

    it('countdown spec has only attributes', () => {
      const spec = loadSpec('countdown');
      assert.ok(!spec!.arguments || spec!.arguments.length === 0, 'countdown should have no arguments');
      assert.ok(spec!.attributes, 'countdown should have attributes');
      assert.ok(spec!.attributes!.length > 10, 'countdown should have many attributes');
    });

    it('countdown spec has color attributes', () => {
      const spec = loadSpec('countdown');
      const colorAttrs = spec!.attributes!.filter(a => a.completion.type === 'color');
      assert.ok(colorAttrs.length > 0, 'countdown should have color attributes');
    });

    it('now spec has only arguments', () => {
      const spec = loadSpec('now');
      assert.ok(spec!.arguments, 'now should have arguments');
      assert.ok(spec!.arguments!.length > 0, 'now should have at least one argument');
      assert.ok(!spec!.attributes || spec!.attributes.length === 0, 'now should have no attributes');
    });

    it('now spec uses enum completion', () => {
      const spec = loadSpec('now');
      const firstArg = spec!.arguments![0];
      assert.strictEqual(firstArg.completion.type, 'enum');
    });

    it('acr spec uses frontmatter completion', () => {
      const spec = loadSpec('acr');
      const firstArg = spec!.arguments![0];
      assert.strictEqual(firstArg.completion.type, 'frontmatter');
    });

    it('downloadthis spec uses file completion', () => {
      const spec = loadSpec('downloadthis');
      const firstArg = spec!.arguments![0];
      assert.strictEqual(firstArg.completion.type, 'file');
    });
  });
});
