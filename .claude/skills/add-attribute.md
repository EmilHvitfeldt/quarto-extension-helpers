# Add Attribute to Extension

Adds a new attribute to an existing Quarto extension helper.

## Usage

```
/add-attribute <extension-name> <attribute-name>
```

## Arguments

- `extension-name`: The extension to add the attribute to (e.g., `roughnotation`)
- `attribute-name`: The name of the new attribute (e.g., `rn-delay`)

## Instructions

When the user runs this skill:

### 1. Verify Extension Exists

Check that `src/<extension-name>.ts` exists. If not, suggest using `/add-extension` first.

### 2. Identify the Attributes Array

Read `src/<extension-name>.ts` to find the attributes array. Look for arrays of type `AttributeDefinition[]`:
- `ATTRIBUTES` - Common name
- `RN_ATTRIBUTES` for roughnotation
- Category arrays like `TIMER_ATTRIBUTES`, `COLOR_ATTRIBUTES` for countdown

### 3. Gather Attribute Information

Ask the user for:
- **Type**: `enum`, `boolean`, `number`, `string`, or `color`
- **Description**: What does this attribute do?
- **Values** (for enum): What are the valid values?
- **Default value**: What is the default?
- **Placeholder** (for number/string): What example value to show?
- **Category** (if extension uses categories): Which category does it belong to?

### 4. Add Attribute Definition

Add the new attribute using the `AttributeDefinition` interface from `src/types.ts`:

**For enum type:**
```typescript
{
  name: '<attribute-name>',
  description: '<description>',
  valueType: 'enum',
  values: ['value1', 'value2', 'value3'],
  defaultValue: 'value1',
  category: 'Category',  // If applicable
},
```

**For boolean type:**
```typescript
{
  name: '<attribute-name>',
  description: '<description>',
  valueType: 'boolean',
  defaultValue: 'true',
  category: 'Category',
},
```

**For number type:**
```typescript
{
  name: '<attribute-name>',
  description: '<description>',
  valueType: 'number',
  placeholder: '100',
  defaultValue: '100',
  category: 'Category',
},
```

**For string type:**
```typescript
{
  name: '<attribute-name>',
  description: '<description>',
  valueType: 'string',
  placeholder: 'example',
  defaultValue: 'default',
  quoted: true,  // If value should be quoted
  category: 'Category',
},
```

**For color type:**
```typescript
{
  name: '<attribute-name>',
  description: '<description>',
  valueType: 'color',
  category: 'Color',
},
```

**Note:** Color attributes automatically integrate with brand colors via `getBrandColors()` in the shared `createAttributeValueCompletions()` function.

### 5. Update Attributes Map (if exists)

If the extension has an `ATTRIBUTES_MAP`, ensure the new attribute is included. Usually this is automatic if using:
```typescript
const ATTRIBUTES_MAP = new Map<string, AttributeDefinition>(
  ATTRIBUTES.map(attr => [attr.name, attr])
);
```

### 6. Update Example Files

Add an example using the new attribute to the appropriate demo file:
- `examples/<extension-name>/demo.qmd` - For shortcode-based extensions
- `examples/<extension-name>/without-brandyml/demo.qmd` - For span-based extensions

If adding a **color** attribute, also update:
- `examples/<extension-name>/with-brandyml/demo.qmd` - Demonstrates brand color integration

### 7. Update CHANGELOG

Add entry under `[Unreleased]`:
```markdown
- Added `<attribute-name>` attribute support for <extension-name>
```

### 8. Compile and Verify

Run `npm run compile` and `npm run lint` to verify there are no errors.

## Example

```
User: /add-attribute countdown blink_rate

Claude: I'll add the `blink_rate` attribute to countdown.

First, let me check the extension file...

[Reads src/countdown.ts, finds TIMER_ATTRIBUTES array]

The countdown extension uses categorized attributes. `blink_rate` sounds like a timer attribute.

Please provide:

1. Type: Is this an enum, boolean, number, string, or color?
2. Description: What does this attribute do?
3. Default value: What is the default?
4. (If number) Placeholder: What example value should I show?

User: It's a number, controls the blink rate in milliseconds when blinking is enabled, default is 1000

Claude: I'll add the blink_rate attribute to TIMER_ATTRIBUTES...

[Adds attribute definition]
[Updates examples/countdown/demo.qmd]
[Updates CHANGELOG.md]
[Runs npm run compile]
[Runs npm run lint]

Done! The `blink_rate` attribute has been added. Users can now use:
{{< countdown minutes=5 blink_colon=true blink_rate=500 >}}
```
