import * as assert from 'assert';
import {
  analyzeShortcodeContext,
  analyzeAttributeOnlyContext,
  parseAttributeValueContext,
} from '../../shortcode-utils';
import { ShortcodeContext } from '../../types';

// Helper to create a basic context for testing
function createBaseContext(overrides: Partial<ShortcodeContext> = {}): ShortcodeContext {
  return {
    fullContent: '',
    contentStart: 5,
    completionType: 'attribute-name',
    typedText: '',
    tokenStart: 5,
    hasSpaceBeforeEnd: false,
    needsLeadingSpace: false,
    ...overrides,
  };
}

describe('parseAttributeValueContext', () => {
  it('returns null when no attribute= pattern', () => {
    const result = parseAttributeValueContext('star', 10);
    assert.strictEqual(result, null);
  });

  it('returns null for partial attribute name', () => {
    const result = parseAttributeValueContext('siz', 10);
    assert.strictEqual(result, null);
  });

  it('parses attribute with empty value', () => {
    const result = parseAttributeValueContext('size=', 12);
    assert.ok(result !== null);
    assert.strictEqual(result!.attributeName, 'size');
    assert.strictEqual(result!.typedValue, '');
  });

  it('parses attribute with partial value', () => {
    const result = parseAttributeValueContext('size=2', 13);
    assert.ok(result !== null);
    assert.strictEqual(result!.attributeName, 'size');
    assert.strictEqual(result!.typedValue, '2');
  });

  it('parses attribute with quoted value', () => {
    const result = parseAttributeValueContext('label="hel', 17);
    assert.ok(result !== null);
    assert.strictEqual(result!.attributeName, 'label');
    assert.strictEqual(result!.typedValue, 'hel');
  });

  it('handles multiple attributes, returns last one', () => {
    const result = parseAttributeValueContext('size=2x color=re', 23);
    assert.ok(result !== null);
    assert.strictEqual(result!.attributeName, 'color');
    assert.strictEqual(result!.typedValue, 're');
  });
});

describe('analyzeShortcodeContext', () => {
  const hasPrimaryValue = (content: string) => {
    // Simple check: has content that doesn't contain '='
    const parts = content.split(/\s+/).filter(Boolean);
    return parts.length > 0 && !parts[0].includes('=');
  };

  describe('primary value detection', () => {
    it('returns primary completion type when empty', () => {
      const baseContext = createBaseContext({ fullContent: '' });
      const result = analyzeShortcodeContext(
        baseContext,
        '',
        7,
        true,
        hasPrimaryValue,
        'icon'
      );
      assert.strictEqual(result.completionType, 'icon');
    });

    it('returns attribute-name when primary value exists', () => {
      const baseContext = createBaseContext({ fullContent: 'star' });
      const result = analyzeShortcodeContext(
        baseContext,
        'star ',
        12,
        true,
        hasPrimaryValue,
        'icon'
      );
      assert.strictEqual(result.completionType, 'attribute-name');
    });

    it('returns attribute-value when after attr=', () => {
      const baseContext = createBaseContext({ fullContent: 'star size=' });
      const result = analyzeShortcodeContext(
        baseContext,
        'star size=',
        17,
        true,
        hasPrimaryValue,
        'icon'
      );
      assert.strictEqual(result.completionType, 'attribute-value');
      assert.strictEqual(result.attributeName, 'size');
    });
  });

  describe('typedText extraction', () => {
    it('extracts typed text when completing primary value', () => {
      const baseContext = createBaseContext({ fullContent: 'sta' });
      const result = analyzeShortcodeContext(
        baseContext,
        'sta',
        10,
        true,
        hasPrimaryValue,
        'icon'
      );
      assert.strictEqual(result.typedText, 'sta');
    });

    it('extracts typed text when completing attribute name', () => {
      const baseContext = createBaseContext({ fullContent: 'star siz' });
      const result = analyzeShortcodeContext(
        baseContext,
        'star siz',
        15,
        true,
        hasPrimaryValue,
        'icon'
      );
      assert.strictEqual(result.completionType, 'attribute-name');
      assert.strictEqual(result.typedText, 'siz');
    });

    it('extracts typed value when completing attribute value', () => {
      const baseContext = createBaseContext({ fullContent: 'star size=2' });
      const result = analyzeShortcodeContext(
        baseContext,
        'star size=2',
        18,
        true,
        hasPrimaryValue,
        'icon'
      );
      assert.strictEqual(result.completionType, 'attribute-value');
      assert.strictEqual(result.typedText, '2');
    });
  });
});

describe('analyzeAttributeOnlyContext', () => {
  describe('completion type detection', () => {
    it('returns attribute-name when empty', () => {
      const baseContext = createBaseContext({ fullContent: '' });
      const result = analyzeAttributeOnlyContext(baseContext, '', 7, true);
      assert.strictEqual(result.completionType, 'attribute-name');
    });

    it('returns attribute-name when typing attribute', () => {
      const baseContext = createBaseContext({ fullContent: 'min' });
      const result = analyzeAttributeOnlyContext(baseContext, 'min', 10, true);
      assert.strictEqual(result.completionType, 'attribute-name');
      assert.strictEqual(result.typedText, 'min');
    });

    it('returns attribute-value when after attr=', () => {
      const baseContext = createBaseContext({ fullContent: 'minutes=' });
      const result = analyzeAttributeOnlyContext(baseContext, 'minutes=', 15, true);
      assert.strictEqual(result.completionType, 'attribute-value');
      assert.strictEqual(result.attributeName, 'minutes');
    });

    it('returns attribute-value with partial value', () => {
      const baseContext = createBaseContext({ fullContent: 'minutes=5' });
      const result = analyzeAttributeOnlyContext(baseContext, 'minutes=5', 16, true);
      assert.strictEqual(result.completionType, 'attribute-value');
      assert.strictEqual(result.attributeName, 'minutes');
      assert.strictEqual(result.typedText, '5');
    });
  });

  describe('multiple attributes', () => {
    it('returns attribute-name after completed attribute', () => {
      const baseContext = createBaseContext({ fullContent: 'minutes=5 sec' });
      const result = analyzeAttributeOnlyContext(baseContext, 'minutes=5 sec', 20, true);
      assert.strictEqual(result.completionType, 'attribute-name');
      assert.strictEqual(result.typedText, 'sec');
    });

    it('returns attribute-value for second attribute', () => {
      const baseContext = createBaseContext({ fullContent: 'minutes=5 seconds=' });
      const result = analyzeAttributeOnlyContext(baseContext, 'minutes=5 seconds=', 25, true);
      assert.strictEqual(result.completionType, 'attribute-value');
      assert.strictEqual(result.attributeName, 'seconds');
    });
  });
});
