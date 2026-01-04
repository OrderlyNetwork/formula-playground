/**
 * @description Version configuration type definitions
 * Defines the structure for version configurations used for formula library testing
 */

/**
 * @description Version type - indicates the source of the version
 */
export type VersionType = "release" | "dev" | "local";

/**
 * @description Dependency configuration for loading external packages from jsDelivr
 */
export interface DependencyConfig {
  /** Package name (e.g., "@orderly.network/utils") */
  packageName: string;
  /** Package version (e.g., "2.8.1") */
  version: string;
}

/**
 * @description Version configuration interface
 * Defines a single version configuration that can be selected for formula execution
 */
export interface VersionConfig {
  /** Unique identifier for this version */
  id: string;
  /** Display name shown in UI */
  name: string;
  /** Version string (e.g., "4.8.1", "dev", "local-v1") */
  version: string;
  /** Type of version: release, dev, or local */
  type: VersionType;
  /** jsDelivr URL for release/dev versions */
  jsdelivrUrl?: string;
  /** Static resource path for local versions (relative to public directory) */
  sourcePath?: string;
  /** npm package name (for display purposes) */
  packageName?: string;
  /** Description of this version */
  description?: string;
  /** Global namespace for local versions (e.g., "formulas") */
  globalNamespace?: string;
  /** Global key for local versions (e.g., "v1") */
  globalKey?: string;
  /** Path to version-specific formula configuration (relative to public directory) */
  formulaConfigPath?: string;
  /** Dependencies to load from jsDelivr for local versions */
  dependencies?: DependencyConfig[];
}

/**
 * @description Version configuration file structure
 * Root structure of the versionConfig.json file
 */
export interface VersionConfigFile {
  /** List of available versions */
  versions: VersionConfig[];
  /** Default version ID to use on startup */
  defaultVersion: string;
}
