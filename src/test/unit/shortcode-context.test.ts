import * as assert from 'assert';
import { getShortcodeContext } from '../../shortcode-utils';

describe('getShortcodeContext', () => {
  describe('triggers correctly', () => {
    it('returns context when cursor inside shortcode', () => {
      // {{< fa icon >}} with cursor at position 7 (after "fa i")
      const result = getShortcodeContext('{{< fa icon >}}', 7, 'fa');
      assert.ok(result !== null);
      assert.strictEqual(result!.fullContent, 'icon');
    });

    it('returns context when cursor at start of content', () => {
      // {{< fa | >}} with cursor right after "fa "
      const result = getShortcodeContext('{{< fa  >}}', 7, 'fa');
      assert.ok(result !== null);
    });

    it('returns context when cursor in middle of content', () => {
      // {{< fa star size=2x >}} with cursor after "star"
      const result = getShortcodeContext('{{< fa star size=2x >}}', 11, 'fa');
      assert.ok(result !== null);
      assert.strictEqual(result!.fullContent, 'star size=2x');
    });
  });

  describe('returns null when outside shortcode', () => {
    it('returns null when cursor before shortcode', () => {
      const result = getShortcodeContext('text {{< fa >}}', 3, 'fa');
      assert.strictEqual(result, null);
    });

    it('returns null when cursor after shortcode', () => {
      const result = getShortcodeContext('{{< fa >}} text', 12, 'fa');
      assert.strictEqual(result, null);
    });

    it('returns null when between two shortcodes', () => {
      const result = getShortcodeContext('{{< fa >}} text {{< fa >}}', 12, 'fa');
      assert.strictEqual(result, null);
    });

    it('returns null for incomplete shortcode (no close)', () => {
      const result = getShortcodeContext('{{< fa icon', 10, 'fa');
      assert.strictEqual(result, null);
    });

    it('returns null when no shortcode marker present', () => {
      const result = getShortcodeContext('just plain text', 5, 'fa');
      assert.strictEqual(result, null);
    });

    it('returns null for different shortcode name', () => {
      const result = getShortcodeContext('{{< countdown >}}', 10, 'fa');
      assert.strictEqual(result, null);
    });
  });

  describe('multiple shortcodes on same line', () => {
    it('returns context for second shortcode when cursor is inside it', () => {
      // Two shortcodes, cursor in second one
      const result = getShortcodeContext('{{< fa star >}} {{< fa heart >}}', 24, 'fa');
      assert.ok(result !== null);
      assert.strictEqual(result!.fullContent, 'heart');
    });

    it('returns null when cursor between two shortcodes', () => {
      const result = getShortcodeContext('{{< fa star >}} {{< fa heart >}}', 15, 'fa');
      assert.strictEqual(result, null);
    });

    it('returns context for first shortcode when cursor is inside it', () => {
      const result = getShortcodeContext('{{< fa star >}} {{< fa heart >}}', 8, 'fa');
      assert.ok(result !== null);
      assert.strictEqual(result!.fullContent, 'star');
    });
  });

  describe('fullContent extraction', () => {
    it('extracts empty content correctly', () => {
      const result = getShortcodeContext('{{< fa  >}}', 7, 'fa');
      assert.ok(result !== null);
      assert.strictEqual(result!.fullContent, '');
    });

    it('extracts single word content', () => {
      const result = getShortcodeContext('{{< fa star >}}', 10, 'fa');
      assert.ok(result !== null);
      assert.strictEqual(result!.fullContent, 'star');
    });

    it('extracts content with attributes', () => {
      const result = getShortcodeContext('{{< fa star size=2x color=red >}}', 20, 'fa');
      assert.ok(result !== null);
      assert.strictEqual(result!.fullContent, 'star size=2x color=red');
    });
  });
});
