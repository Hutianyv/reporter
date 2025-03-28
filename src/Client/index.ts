import { tapable } from "@/utils/tapable";
import { NormalLoggerPlugin } from "@/Plugins/NormalLoggerPlugin";
/**
 * 实例主体，负责串联配置管理器、收集器、组装器和发送器，串通整个流程，同时提供生命周期监听以供扩展 SDK 功能。
 */
//@ts-ignore
export const createClient = ({ config }: any) => {
  let inited = false;
  let started = false;
  let preStartQueue = new Set();
  let configManager: any;
  let monitor: any;
  let builder: any;
  let sender: any;
  const hooks = tapable(["init", "beforeApplyPlugin", "beforeStart", "start"]);

  const normalPlugin = [NormalLoggerPlugin];

  const client = {
    init: (config: any) => {
      hooks.beforeApplyPlugin.emit();
      hooks.init.emit();
      //@ts-ignore
      configManager = new ConfigManager(config);
      configManager.onReady(() => {
        //@ts-ignore
        // preStartQueue.forEach((e: any) => { this.report(e) })
        monitor = new Monitor(configManager);
        //@ts-ignore
        builder = new Builder(configManager);
        //@ts-ignore
        sender = new Sender(configManager);
        started = true;
      });
      inited = true;
    },
    report: (data: any) => {
      if (!started) {
        preStartQueue.add(data);
      } else {
        const builderData = builder.build(data);
        builderData && sender.send(builderData);
      }
    },
  };

  //挂载插件系统
  const PluginType2Instance = {
    client: client,
    configManager: configManager,
    monitor: monitor,
    builder: builder,
    sender: sender,
  };
  function applyPlugin(normalPlugin: any[], customPlugin: any[]) {
    hooks.beforeApplyPlugin.emit();

    //处理内置NormalPlugin
    normalPlugin.forEach((plugin) => {
      if (typeof plugin === "function") {
        //@ts-ignore
        plugin(PluginType2Instance[plugin.type]);
      } else {
        //@ts-ignore
        plugin.apply(PluginType2Instance[plugin.type]);
      }
    });
    //这里可以给用户传入的plugin进行一些处理
    if (Array.isArray(customPlugin)) {
      customPlugin.forEach((plugin) => {
        if (typeof plugin === "function") {
          //@ts-ignore
          plugin(PluginType2Instance[plugin.type]);
        } else {
          //@ts-ignore
          plugin.apply(PluginType2Instance[plugin.type]);
        }
      });
    } else {
      throw new Error("plugin must be an array");
    }
  }
  hooks.beforeApplyPlugin.tapSync(() => {
    applyPlugin(normalPlugin, config.plugin);
  });

  return client;
};
