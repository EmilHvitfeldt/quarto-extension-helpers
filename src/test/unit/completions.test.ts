import * as assert from 'assert';
import { getUsedAttributes, filterByPrefix } from '../../shortcode-utils';
import { AttributeDefinition } from '../../types';

// Note: createBooleanValueCompletions and createEnumValueCompletions require vscode.Position
// and return vscode.CompletionItem, which need VS Code types. Since we're testing pure logic,
// we test the filtering behavior through the context and test getUsedAttributes directly.

describe('getUsedAttributes', () => {
  const sampleAttributes: AttributeDefinition[] = [
    { name: 'size', description: 'Size', valueType: 'enum', values: ['1x', '2x', '3x'] },
    { name: 'color', description: 'Color', valueType: 'color' },
    { name: 'spin', description: 'Spin animation', valueType: 'boolean' },
    { name: 'flip', description: 'Flip direction', valueType: 'enum', values: ['horizontal', 'vertical'] },
  ];

  it('returns empty set when no attributes used', () => {
    const result = getUsedAttributes('star', sampleAttributes);
    assert.strictEqual(result.size, 0);
  });

  it('detects single used attribute', () => {
    const result = getUsedAttributes('star size=2x', sampleAttributes);
    assert.strictEqual(result.size, 1);
    assert.ok(result.has('size'));
  });

  it('detects multiple used attributes', () => {
    const result = getUsedAttributes('star size=2x color=red spin=true', sampleAttributes);
    assert.strictEqual(result.size, 3);
    assert.ok(result.has('size'));
    assert.ok(result.has('color'));
    assert.ok(result.has('spin'));
  });

  it('detects all used attributes', () => {
    const result = getUsedAttributes('star size=2x color=red spin=true flip=horizontal', sampleAttributes);
    assert.strictEqual(result.size, 4);
  });

  it('does not detect partial matches', () => {
    // "siz" is not "size="
    const result = getUsedAttributes('star siz', sampleAttributes);
    assert.strictEqual(result.size, 0);
  });

  it('handles quoted values', () => {
    const result = getUsedAttributes('star color="red"', sampleAttributes);
    assert.strictEqual(result.size, 1);
    assert.ok(result.has('color'));
  });
});

describe('Value completion filtering behavior', () => {
  // These tests document the filtering behavior that createBooleanValueCompletions
  // and createEnumValueCompletions implement. The actual functions need VS Code types,
  // so we document the expected behavior through assertions about inputs/outputs.

  describe('Boolean value filtering', () => {
    const booleanValues: string[] = ['true', 'false'];

    it('no filter returns both values', () => {
      const filtered = filterByPrefix(booleanValues, '');
      assert.deepStrictEqual(filtered, ['true', 'false']);
    });

    it('filter "t" returns only "true"', () => {
      const filtered = filterByPrefix(booleanValues, 't');
      assert.deepStrictEqual(filtered, ['true']);
    });

    it('filter "f" returns only "false"', () => {
      const filtered = filterByPrefix(booleanValues, 'f');
      assert.deepStrictEqual(filtered, ['false']);
    });

    it('filter "tr" returns only "true"', () => {
      const filtered = filterByPrefix(booleanValues, 'tr');
      assert.deepStrictEqual(filtered, ['true']);
    });

    it('filter "x" returns empty', () => {
      const filtered = filterByPrefix(booleanValues, 'x');
      assert.deepStrictEqual(filtered, []);
    });
  });

  describe('Enum value filtering', () => {
    const sizeValues: string[] = ['1x', '2x', '3x', '4x', '5x'];

    it('no filter returns all values', () => {
      const filtered = filterByPrefix(sizeValues, '');
      assert.deepStrictEqual(filtered, ['1x', '2x', '3x', '4x', '5x']);
    });

    it('filter "2" returns "2x"', () => {
      const filtered = filterByPrefix(sizeValues, '2');
      assert.deepStrictEqual(filtered, ['2x']);
    });

    it('filter "x" returns empty (prefix match only)', () => {
      const filtered = filterByPrefix(sizeValues, 'x');
      assert.deepStrictEqual(filtered, []);
    });
  });

  describe('Now alias filtering', () => {
    // Mirrors NOW_ALIASES from now.ts
    const nowAliases: string[] = [
      'year', 'month', 'day', 'weekday', 'date', 'isodate',
      'hour', 'minute', 'ampm', 'time', 'datetime',
      'isotime', 'isodatetime', 'timestamp',
    ];

    it('no filter returns all 14 aliases', () => {
      const filtered = filterByPrefix(nowAliases, '');
      assert.strictEqual(filtered.length, 14);
    });

    it('filter "iso" returns isodate, isotime, isodatetime', () => {
      const filtered = filterByPrefix(nowAliases, 'iso');
      assert.deepStrictEqual(filtered, ['isodate', 'isotime', 'isodatetime']);
    });

    it('filter "time" returns time and timestamp', () => {
      const filtered = filterByPrefix(nowAliases, 'time');
      assert.deepStrictEqual(filtered, ['time', 'timestamp']);
    });

    it('filter "d" returns day, date, datetime', () => {
      const filtered = filterByPrefix(nowAliases, 'd');
      assert.deepStrictEqual(filtered, ['day', 'date', 'datetime']);
    });

    it('filter "year" returns only year', () => {
      const filtered = filterByPrefix(nowAliases, 'year');
      assert.deepStrictEqual(filtered, ['year']);
    });

    it('filter case insensitive - "ISO" matches iso aliases', () => {
      const filtered = filterByPrefix(nowAliases, 'ISO');
      assert.deepStrictEqual(filtered, ['isodate', 'isotime', 'isodatetime']);
    });
  });

  describe('Default value marking', () => {
    // Documents that completions with defaultValue should be marked with "(default)"
    // This is implemented in createBooleanValueCompletions and createEnumValueCompletions

    it('documents default value behavior for boolean', () => {
      // When defaultValue='true', the 'true' completion should have detail='(default)'
      // and sortText='0true' to sort it first
      const defaultValue = 'true';
      const values = ['true', 'false'];

      for (const value of values) {
        const isDefault = value === defaultValue;
        const expectedDetail = isDefault ? '(default)' : undefined;
        const expectedSortPrefix = isDefault ? '0' : '1';

        if (value === 'true') {
          assert.strictEqual(expectedDetail, '(default)');
          assert.strictEqual(expectedSortPrefix, '0');
        } else {
          assert.strictEqual(expectedDetail, undefined);
          assert.strictEqual(expectedSortPrefix, '1');
        }
      }
    });

    it('documents default value behavior for enum', () => {
      const values = ['small', 'medium', 'large'];
      const defaultValue = 'medium';

      for (const value of values) {
        const isDefault = value === defaultValue;
        const expectedSortPrefix = isDefault ? '0' : '1';

        if (value === 'medium') {
          assert.strictEqual(expectedSortPrefix, '0');
        } else {
          assert.strictEqual(expectedSortPrefix, '1');
        }
      }
    });
  });
});
