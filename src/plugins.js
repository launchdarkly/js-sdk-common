const UNKNOWN_PLUGIN_NAME = 'unknown plugin';

/**
 * Safely gets the name of a plugin with error handling
 * @param {{ error: (message: string) => void }} logger - The logger instance
 * @param {{getMetadata: () => {name: string}}} plugin - Plugin object that may have a name property
 * @returns {string} The plugin name or 'unknown' if not available
 */
function getPluginName(logger, plugin) {
  try {
    return plugin.getMetadata().name || UNKNOWN_PLUGIN_NAME;
  } catch (error) {
    logger.error(`Exception thrown getting metadata for plugin. Unable to get plugin name.`);
    return UNKNOWN_PLUGIN_NAME;
  }
}

/**
 * Safely retrieves hooks from plugins with error handling
 * @param {Object} logger - The logger instance
 * @param {Object} environmentMetadata - Metadata about the environment for plugin initialization
 * @param {Array<{getHooks: (environmentMetadata: object) => Hook[]}>} plugins - Array of plugin objects that may implement getHooks
 * @returns {Array<Hook>} Array of hook objects collected from all plugins
 */
function getPluginHooks(logger, environmentMetadata, plugins) {
  const hooks = [];
  plugins.forEach(plugin => {
    try {
      const pluginHooks = plugin.getHooks?.(environmentMetadata);
      if (pluginHooks === undefined) {
        logger.error(`Plugin ${getPluginName(logger, plugin)} returned undefined from getHooks.`);
      } else if (pluginHooks && pluginHooks.length > 0) {
        hooks.push(...pluginHooks);
      }
    } catch (error) {
      logger.error(`Exception thrown getting hooks for plugin ${getPluginName(logger, plugin)}. Unable to get hooks.`);
    }
  });
  return hooks;
}

/**
 * Registers plugins with the SDK
 * @param {{ error: (message: string) => void }} logger - The logger instance
 * @param {Object} environmentMetadata - Metadata about the environment for plugin initialization
 * @param {Object} client - The SDK client instance
 * @param {Array<{register: (client: object, environmentMetadata: object) => void}>} plugins - Array of plugin objects that implement register
 */
function registerPlugins(logger, environmentMetadata, client, plugins) {
  plugins.forEach(plugin => {
    try {
      plugin.register(client, environmentMetadata);
    } catch (error) {
      logger.error(`Exception thrown registering plugin ${getPluginName(logger, plugin)}.`);
    }
  });
}

/**
 * Creates a plugin environment object
 * @param {{userAgent: string, version: string}} platform - The platform object
 * @param {string} env - The environment
 * @param {{application: {name: string, version: string}, wrapperName: string, wrapperVersion: string}} options - The options
 * @returns {{sdk: {name: string, version: string, wrapperName: string, wrapperVersion: string}, application: {name: string, version: string}, clientSideId: string}} The plugin environment
 */
function createPluginEnvironment(platform, env, options) {
  const pluginSdkMetadata = {};

  if (platform.userAgent) {
    pluginSdkMetadata.name = platform.userAgent;
  }
  if (platform.version) {
    pluginSdkMetadata.version = platform.version;
  }
  if (options.wrapperName) {
    pluginSdkMetadata.wrapperName = options.wrapperName;
  }
  if (options.wrapperVersion) {
    pluginSdkMetadata.wrapperVersion = options.wrapperVersion;
  }

  const pluginApplicationMetadata = {};

  if (options.application) {
    if (options.application.name) {
      pluginApplicationMetadata.name = options.application.name;
    }
    if (options.application.version) {
      pluginApplicationMetadata.version = options.application.version;
    }
  }

  const pluginEnvironment = {
    sdk: pluginSdkMetadata,
    clientSideId: env,
  };

  if (Object.keys(pluginApplicationMetadata).length > 0) {
    pluginEnvironment.application = pluginApplicationMetadata;
  }

  return pluginEnvironment;
}

module.exports = {
  getPluginHooks,
  registerPlugins,
  createPluginEnvironment,
};
