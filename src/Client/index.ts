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
  let canStart = false;
  let preStartQueue = new WorkLoopQueue<Monitor.RawMonitorMessageData>(
    processQueueItem
  );
  let configManager: ConfigManager;
  let monitor: MainMonitor;
  let builder: Builder;
  let sender: Sender;

  const normalPlugin: Plugin[] = [NormalLoggerPlugin, NormalLocaltimePlugin, NormalUserAgentPlugin, NormalIdPlugin];

  const client = {
    init: (config: any) => {
      configManager = new ConfigManager(config);
      configManager.onReady(() => {
        builder = new Builder(configManager);
        sender = new Sender(configManager);
        //初始化全局监控
        monitor = new MainMonitor(configManager, preStartQueue.enqueue);
        //应用所有插件
        applyPlugin(normalPlugin, config.plugin);
        canStart = true;
      });
      inited = true;
    },

    start: () => { 
      if (!canStart) return;
      monitor.start();
      handleReport({
        type: "pageView",
        info: {
          subType: "pv",
          url: window.location.href,
        },
      });
    },

    report: (rawMonitorMessageData: Monitor.RawMonitorMessageData) => {
      if (!canStart) {
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
  return client;
};
