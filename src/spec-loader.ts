/**
 * Loads and caches shortcode specifications from YAML files
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ShortcodeSpec } from './spec-types';
import { CACHE } from './constants';

/** Cache for loaded specs (with size limit) */
const specCache = new Map<string, ShortcodeSpec>();

/** Cache for file-data sources (with size limit) */
const fileDataCache = new Map<string, string[]>();

/**
 * Add to cache with size limit enforcement
 */
function addToCache<T>(cache: Map<string, T>, key: string, value: T, maxSize: number): void {
  // Evict oldest entry if at capacity
  if (cache.size >= maxSize) {
    const firstKey = cache.keys().next().value;
    if (firstKey) {
      cache.delete(firstKey);
    }
  }
  cache.set(key, value);
}

/**
 * Get the project root directory
 * Works in both ts-node (src/) and compiled (out/) contexts
 */
function getProjectRoot(): string {
  // __dirname is either src/ or out/ depending on context
  // Go up one level to get project root
  return path.join(__dirname, '..');
}

/**
 * Get the specs directory path
 * In development (ts-node): src/specs/
 * In production: out/specs/ (copied during build)
 */
function getSpecsDir(): string {
  // __dirname is out/ in production, so specs are at out/specs/
  // __dirname is src/ in ts-node, so specs are at src/specs/
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
    addToCache(specCache, shortcodeName, spec, CACHE.MAX_SPEC_ENTRIES);
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
    // Try multiple locations:
    // 1. out/data/ (production - compiled)
    // 2. data/ from project root (development/testing)
    const possiblePaths = [
      path.join(__dirname, source),           // out/data/file.json
      path.join(getProjectRoot(), source),    // data/file.json from root
    ];

    let content: string | null = null;
    for (const tryPath of possiblePaths) {
      try {
        content = fs.readFileSync(tryPath, 'utf-8');
        break;
      } catch {
        // Try next path
      }
    }

    if (!content) {
      return [];
    }
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
      addToCache(fileDataCache, cacheKey, result, CACHE.MAX_FILE_DATA_ENTRIES);
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
