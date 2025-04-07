import { tapable } from "@/utils/tapable";
import { WorkLoopQueue } from "@/utils/workLoopQueue";
import ConfigManager from "@/ConfigManager";
import MainMonitor from "@/Monitor";
import Builder from "@/Builder";
import Sender from "@/Sender";
import { Plugin } from "@/types/Client";
import { NormalLoggerPlugin } from "@/Plugins/NormalLoggerPlugin";
import { NormalLocaltimePlugin } from "@/Plugins/NormalLocaltimePlugin";
import { NormalUserAgentPlugin } from "@/Plugins/NormalUserAgentPlugin";
import { NormalIdPlugin } from "@/Plugins/NormalIdPlugin";
/**
 * 实例主体，负责串联配置管理器、收集器、组装器和发送器，串通整个流程，同时提供生命周期监听以供扩展 SDK 功能。
 */

export const createClient = (config: any) => {
  let inited = false;
  let started = false;
  let preStartQueue = new WorkLoopQueue<Monitor.RawMonitorMessageData>(
    processQueueItem
  );
  let configManager: ConfigManager;
  let monitor: MainMonitor;
  let builder: Builder;
  let sender: Sender;
  const hooks = tapable(["init", "beforeApplyPlugin", "beforeStart", "start"]);

  const normalPlugin: Plugin[] = [NormalLoggerPlugin, NormalLocaltimePlugin, NormalUserAgentPlugin, NormalIdPlugin];

  const client = {
    init: (config: any) => {
      hooks.beforeApplyPlugin.callSync();
      hooks.init.callSync();
      configManager = new ConfigManager(config);
      configManager.onReady(() => {
        builder = new Builder(configManager);
        sender = new Sender(configManager);
        //初始化全局监控
        monitor = new MainMonitor(configManager, preStartQueue.enqueue);
        started = true;
      });
      inited = true;
    },
    report: (rawMonitorMessageData: Monitor.RawMonitorMessageData) => {
      if (!started) {
        preStartQueue.enqueue(rawMonitorMessageData);
      } else {
        handleReport(rawMonitorMessageData);
      }
    },
  };

  function processQueueItem(rawMonitorMessageData: Monitor.RawMonitorMessageData) {
    handleReport(rawMonitorMessageData);
  }

  function handleReport(rawMonitorMessageData: Monitor.RawMonitorMessageData) {
    if (rawMonitorMessageData) {
      const buildData = builder.build(rawMonitorMessageData);
      buildData && sender.send(buildData);
    }
  }

  function applyPlugin(normalPlugin: Plugin[], customPlugin: Plugin[]) {
    //挂载插件系统
    const PluginType2Instance = {
      configManager: configManager,
      monitor: monitor,
      builder: builder,
      sender: sender,
    };

    hooks.beforeApplyPlugin.callSync();

    //处理内置NormalPlugin
    normalPlugin.forEach((plugin) => {
      if (typeof plugin === "function") {
        plugin(PluginType2Instance[plugin.type]);
      } else {
        plugin.apply(PluginType2Instance[plugin.type]);
      }
    });
    //这里可以给用户传入的plugin进行一些处理
    if (Array.isArray(customPlugin)) {
      customPlugin.forEach((plugin) => {
        if (typeof plugin === "function") {
          plugin(PluginType2Instance[plugin.type]);
        } else {
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
