export function NormalLoggerPlugin(ConfigManager: any) {
  ConfigManager.hooks.ready.tapSync(() => {
    console.log("NormalLoggetPlugin ready");
  });
}
NormalLoggerPlugin.type = 'client'
