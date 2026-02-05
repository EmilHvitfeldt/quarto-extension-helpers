# Prepare Release

Prepares the extension for a new version release.

## Usage

```
/prepare-release <version>
```

## Arguments

- `version`: The new version number (e.g., `0.2.0`, `1.0.0`)

## Instructions

When the user runs this skill:

### 1. Version Validation

Read `package.json` to get the current version.

Verify the new version follows semver (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features (e.g., new extension support)
- PATCH: Bug fixes

Check that new version is greater than current version.

### 2. Update package.json

Update the `version` field in `package.json` to the new version.

### 3. Update CHANGELOG.md

Move items from `[Unreleased]` to a new version section:

```markdown
## [Unreleased]

## [<version>] - YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...
```

Use today's date in YYYY-MM-DD format.

### 4. Pre-release Checklist

Verify these items are complete:

- [ ] All TODO comments in README.md addressed (search for `<!-- TODO:`)
- [ ] Extension icon exists at `images/icon.png` (128x128 PNG recommended)
- [ ] `package.json` has `"icon": "images/icon.png"` field
- [ ] All supported extensions listed in README.md table
- [ ] CONTRIBUTING.md is up to date
- [ ] No TypeScript compilation errors (run `npm run compile`)
- [ ] Extension tested in development host (F5)
- [ ] `[Unreleased]` section in CHANGELOG.md has content to release

Report any incomplete items to the user with specific details.

### 5. Build Package

Run `npm run package` to create the `.vsix` file.

The filename will be: `quarto-extension-helpers-<version>.vsix`

Verify the build succeeds without errors.

### 6. Output Release Notes

Generate release notes for GitHub releases from the CHANGELOG:

```markdown
## What's New in v<version>

<Copy content from CHANGELOG for this version>

## Installation

### VS Code Marketplace
Search for "Quarto Extension Helpers" in VS Code Extensions, or install from [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=EmilHvitfeldt.quarto-extension-helpers).

### Open VSX
Install from [Open VSX Registry](https://open-vsx.org/extension/EmilHvitfeldt/quarto-extension-helpers).

### Manual Installation
Download the `.vsix` file from [GitHub Releases](https://github.com/EmilHvitfeldt/quarto-extension-helpers/releases) and install via VS Code's "Install from VSIX" option.

## Full Changelog

See [CHANGELOG.md](https://github.com/EmilHvitfeldt/quarto-extension-helpers/blob/main/CHANGELOG.md) for complete history.
```

### 7. Remind Publishing Steps

Output the publishing commands:

```bash
# 1. Create git tag
git add .
git commit -m "Release v<version>"
git tag v<version>
git push origin main --tags

# 2. VS Code Marketplace
vsce login EmilHvitfeldt
npm run publish

# 3. Open VSX (using the generated .vsix file)
ovsx publish quarto-extension-helpers-<version>.vsix -p <YOUR_OPENVSX_TOKEN>

# 4. GitHub Release
# Create release on GitHub with the generated release notes
# Upload quarto-extension-helpers-<version>.vsix as release asset
```

## Example

```
User: /prepare-release 0.2.0

Claude: I'll prepare the extension for version 0.2.0 release.

Current version in package.json: 0.1.0
New version: 0.2.0 ✅ (valid semver, greater than current)

## Pre-release Checklist

| Item | Status | Details |
|------|--------|---------|
| README TODOs | ⚠️ | 5 screenshot TODOs remaining |
| Extension icon | ❌ | images/icon.png not found |
| package.json icon field | ❌ | Missing "icon" field |
| README extensions table | ✅ | roughnotation listed |
| TypeScript compilation | ✅ | No errors |
| CHANGELOG entries | ✅ | Has unreleased content |

### Issues to Address

1. **Extension icon** (required for marketplace):
   - Create a 128x128 PNG icon at `images/icon.png`
   - Add to package.json:
     ```json
     "icon": "images/icon.png"
     ```

2. **README screenshots** (recommended):
   - Line 5: Add hero gif
   - Line 32: Add attribute autocomplete gif
   - Line 39: Add value autocomplete gif
   - Line 44: Add color picker gif
   - Line 49: Add brand colors screenshot

Would you like me to proceed with the release preparation anyway, or wait until these items are addressed?

User: proceed anyway

Claude: Proceeding with release preparation...

[Updates package.json version to 0.2.0]
[Updates CHANGELOG.md with today's date]
[Runs npm run compile - success]
[Runs npm run package - creates quarto-extension-helpers-0.2.0.vsix]

## Release Notes

[Generated release notes...]

## Next Steps

[Publishing commands...]
```
