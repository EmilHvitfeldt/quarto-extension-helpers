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

Read `src/<extension-name>.ts` to find the attributes array. The naming convention is:
- `RN_ATTRIBUTES` for roughnotation
- `<PREFIX>_ATTRIBUTES` for other extensions (e.g., `LB_ATTRIBUTES` for lightbox)

### 3. Gather Attribute Information

Ask the user for:
- **Type**: `enum`, `boolean`, `number`, or `color`
- **Description**: What does this attribute do?
- **Values** (for enum/boolean): What are the valid values?
- **Default value**: What is the default?
- **Placeholder** (for number): What example value to show?

### 4. Add Attribute Definition

Add the new attribute to the attributes array in `src/<extension-name>.ts`.

**For enum type:**
```typescript
{
  name: '<attribute-name>',
  description: '<description>',
  valueType: 'enum',
  values: ['value1', 'value2', 'value3'],
  defaultValue: 'value1'
},
```

**For boolean type:**
```typescript
{
  name: '<attribute-name>',
  description: '<description>',
  valueType: 'boolean',
  values: ['true', 'false'],
  defaultValue: 'true'
},
```

**For number type:**
```typescript
{
  name: '<attribute-name>',
  description: '<description>',
  valueType: 'number',
  placeholder: '100',
  defaultValue: '100'
},
```

**For color type:**
```typescript
{
  name: '<attribute-name>',
  description: '<description>',
  valueType: 'color',
  values: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black'],
  defaultValue: 'black'
},
```

**Note:** For color attributes, the completion provider should also integrate brand colors from `_brand.yml`. Check if the extension already has color support - if not, this may require additional implementation.

### 5. Update Example File

If relevant, add an example using the new attribute to `examples/<extension-name>-demo.qmd`.

### 6. Update CHANGELOG

Add entry under `[Unreleased]`:
```markdown
- Added `<attribute-name>` attribute support for <extension-name>
```

### 7. Compile and Verify

Run `npm run compile` to verify there are no TypeScript errors.

## Example

```
User: /add-attribute roughnotation rn-delay

Claude: I'll add the `rn-delay` attribute to roughnotation.

First, let me check the extension file exists and find the attributes array...

[Reads src/roughnotation.ts, finds RN_ATTRIBUTES array]

The attributes array is `RN_ATTRIBUTES`. Please provide:

1. Type: Is this an enum, boolean, number, or color?
2. Description: What does this attribute do?
3. Default value: What is the default?
4. (If enum) Valid values: What values can it accept?
5. (If number) Placeholder: What example value should I show?

User: It's a number, controls the delay before animation starts in milliseconds, default is 0

Claude: I'll add the rn-delay attribute to RN_ATTRIBUTES...

[Adds attribute definition]
[Updates examples/roughnotation-demo.qmd]
[Updates CHANGELOG.md]
[Runs npm run compile]

Done! The `rn-delay` attribute has been added. Users can now use:
[text]{.rn-fragment rn-delay=500}
```
