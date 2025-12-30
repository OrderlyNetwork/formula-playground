/**
 * @description Version configuration service
 * Handles loading and managing version configurations from versionConfig.json
 */

import type { VersionConfig, VersionConfigFile } from "../types/version";

/**
 * @description Load version configurations from versionConfig.json
 * @returns Promise resolving to the version configuration file
 */
export async function loadVersionConfig(): Promise<VersionConfigFile> {
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}versionConfig.json`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to load version config: ${response.status} ${response.statusText}`
      );
    }
    const config: VersionConfigFile = await response.json();
    return config;
  } catch (error) {
    console.error("Failed to load version config:", error);
    // Return default empty config
    return {
      versions: [],
      defaultVersion: "",
    };
  }
}

/**
 * @description Get a version configuration by ID
 * @param config - Version configuration file
 * @param versionId - Version ID to find
 * @returns Version configuration or undefined if not found
 */
export function getVersionById(
  config: VersionConfigFile,
  versionId: string
): VersionConfig | undefined {
  return config.versions.find((v) => v.id === versionId);
}

/**
 * @description Get the default version configuration
 * @param config - Version configuration file
 * @returns Default version configuration or undefined if not found
 */
export function getDefaultVersion(
  config: VersionConfigFile
): VersionConfig | undefined {
  if (!config.defaultVersion) {
    return config.versions[0];
  }
  return getVersionById(config, config.defaultVersion);
}
