/**
 * Types for shortcode specification files
 */

export type CompletionType =
  | 'enum'
  | 'boolean'
  | 'freeform'
  | 'file'
  | 'color'
  | 'file-data'
  | 'frontmatter'
  | 'workspace-file'
  | 'none';

export interface EnumCompletion {
  type: 'enum';
  values: string[];
  default?: string;
}

export interface BooleanCompletion {
  type: 'boolean';
  default?: boolean;
}

export interface FreeformCompletion {
  type: 'freeform';
  placeholder?: string;
}

export interface FileCompletion {
  type: 'file';
  extensions?: string[];
}

export interface ColorCompletion {
  type: 'color';
}

export interface FileDataCompletion {
  type: 'file-data';
  source: string;
  path: string;
  labelPath?: string;
  detailPath?: string;
}

export interface FrontmatterCompletion {
  type: 'frontmatter';
  key: string;
  valuePath?: string;
}

export interface WorkspaceFileCompletion {
  type: 'workspace-file';
  filename: string;
  path: string;
}

export interface NoneCompletion {
  type: 'none';
}

export type Completion =
  | EnumCompletion
  | BooleanCompletion
  | FreeformCompletion
  | FileCompletion
  | ColorCompletion
  | FileDataCompletion
  | FrontmatterCompletion
  | WorkspaceFileCompletion
  | NoneCompletion;

export interface SpecArgument {
  name: string;
  required?: boolean;
  completion: Completion;
}

export interface SpecAttribute {
  name: string;
  description?: string;
  category?: string;
  quoted?: boolean;
  completion: Completion;
}

export interface ShortcodeSpec {
  shortcode: string;
  arguments?: SpecArgument[];
  attributes?: SpecAttribute[];
}
