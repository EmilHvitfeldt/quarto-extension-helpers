/**
 * Loads and caches shortcode specifications from YAML files
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ShortcodeSpec } from './spec-types';

/** Cache for loaded specs */
const specCache = new Map<string, ShortcodeSpec>();

/** Cache for file-data sources */
const fileDataCache = new Map<string, string[]>();

/**
 * Get the specs directory path
 * In development: src/specs/
 * In production: out/specs/ (copied during build)
 */
function getSpecsDir(): string {
  // __dirname is out/ in production, so specs are at out/specs/
  return path.join(__dirname, 'specs');
}

/**
 * Load a spec from a YAML file
 */
export function loadSpec(shortcodeName: string): ShortcodeSpec | null {
  // Check cache first
  const cached = specCache.get(shortcodeName);
  if (cached) {
    return cached;
  }

  const specPath = path.join(getSpecsDir(), `${shortcodeName}.yaml`);

  try {
    const content = fs.readFileSync(specPath, 'utf-8');
    const spec = yaml.load(content) as ShortcodeSpec;
    specCache.set(shortcodeName, spec);
    return spec;
  } catch {
    return null;
  }
}

/**
 * Load all specs from the specs directory
 */
export function loadAllSpecs(): ShortcodeSpec[] {
  const specs: ShortcodeSpec[] = [];
  const specsDir = getSpecsDir();

  try {
    const files = fs.readdirSync(specsDir);
    for (const file of files) {
      if (file.endsWith('.yaml')) {
        const shortcodeName = file.replace('.yaml', '');
        const spec = loadSpec(shortcodeName);
        if (spec) {
          specs.push(spec);
        }
      }
    }
  } catch {
    // Specs directory doesn't exist or can't be read
  }

  return specs;
}

/**
 * Load data from a file-data source (JSON file)
 */
export function loadFileData(source: string, dataPath: string): string[] {
  const cacheKey = `${source}:${dataPath}`;

  // Check cache first
  const cached = fileDataCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const sourcePath = path.join(__dirname, '..', source);
    const content = fs.readFileSync(sourcePath, 'utf-8');
    const data = JSON.parse(content);

    // Navigate to the specified path
    const pathParts = dataPath.split('.');
    let result = data;
    for (const part of pathParts) {
      result = result[part];
      if (!result) {
        return [];
      }
    }

    if (Array.isArray(result)) {
      fileDataCache.set(cacheKey, result);
      return result;
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Clear all caches (useful for testing or reloading)
 */
export function clearCaches(): void {
  specCache.clear();
  fileDataCache.clear();
}
