import { RxQueue } from "@/utils/rxWorkLoopQueue";
import ConfigManager from "@/ConfigManager";
import MainMonitor from "@/Monitor";
import Builder from "@/Builder";
import Sender from "@/Sender";
import { Plugin, pluginName } from "@/types/Client";
// import { NormalLoggerPlugin } from "@/Plugins/NormalLoggerPlugin";
import { NormalLocaltimePlugin } from "@/Plugins/NormalLocaltimePlugin";
import { NormalUserAgentPlugin } from "@/Plugins/NormalUserAgentPlugin";
import { NormalIdPlugin } from "@/Plugins/NormalIdPlugin";
import { RiverConfig } from "@/types/index";
/**
 * 实例主体，负责串联配置管理器、收集器、组装器和发送器，串通整个流程，同时提供生命周期监听以供扩展 SDK 功能。
 */

export const createClient = (config: RiverConfig) => {
  let inited = false;
  let isStart = false;
  let preStartQueue = new RxQueue<Monitor.RawMonitorMessageData>({
    maxBatch: 15,
    timeout: 2000,
    retries: 3,
  });
  let configManager: ConfigManager;
  let monitor: MainMonitor;
  let builder: Builder;
  let sender: Sender;

  const normalPlugin: Plugin[] = [
    // NormalLoggerPlugin,
    NormalLocaltimePlugin,
    NormalUserAgentPlugin,
    NormalIdPlugin,
  ];

  const client = {
    init: () => {
      configManager = new ConfigManager(config);
      configManager.onReady(() => {
        //初始化全局监控
        monitor = new MainMonitor(configManager);
        builder = new Builder(configManager);
        sender = new Sender(configManager);
        //应用所有插件
        applyPlugin(normalPlugin, config.plugins);
      });
      inited = true;
    },

    start: () => {
      if (!inited || isStart) return;
      isStart = true;
      monitor.start();
      //将数据流串连起来
      concatStream();
      isStart = true;
    },

    report: (rawMonitorMessageData: Monitor.RawMonitorMessageData) => {
      if (!isStart) return;
      preStartQueue.enqueue(rawMonitorMessageData);
    },
  };

  function concatStream() {
    monitor.mainStream$.subscribe({
      next: (data) => {
        if (!isStart) return;
        preStartQueue.enqueue(data);
      },
      error: (e) => console.error("Monitor stream error:", e),
    });
    preStartQueue.output$.subscribe({
      next: (data) => builder.toBuild(data),
      error: (e) => console.error("Build stream error:", e),
    });
    builder.output$.subscribe({
      next: (data) => { sender.send(data); console.log(data) },
      error: (e) => console.error("Send stream error:", e),
    });
  }

  function applyPlugin(normalPlugin: Plugin[], customPlugin: Plugin[]) {
    //挂载插件系统
    const PluginType2Instance: { [K in pluginName]: any } = {
      "configManager": configManager,
      "monitor": monitor,
      "builder": builder,
      "sender": sender,
    };

    function getInstance(type: pluginName) { 
      return PluginType2Instance[type];
    }

    //处理内置NormalPlugin
    normalPlugin.forEach(async (plugin) => {
      if (typeof plugin === "function") {
        await plugin(getInstance(plugin.type));
      } else {
        plugin.apply(getInstance(plugin.type));
      }
    });
    //这里可以给用户传入的plugin进行一些处理
    if (Array.isArray(customPlugin)) {
      customPlugin.forEach((plugin) => {
        if (typeof plugin === "function") {
          plugin(getInstance(plugin.type));
        } else {
          plugin.apply(getInstance(plugin.type));
        }
      });
    } else {
      throw new Error("plugin must be an array");
    }
  }
  return client;
};
