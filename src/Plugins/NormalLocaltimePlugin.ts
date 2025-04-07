/**
 * 
 * @param Builder 构建器
 */
import { pluginName, ReporterMessage } from "@/types";
import Builder from "@/Builder";
export function NormalLocaltimePlugin(Builder: Builder) {
  Builder.hooks.beforeBuild.tapSync((RawMonitorMessageData: ReporterMessage) => {
    RawMonitorMessageData.reportTimeStamp = Date.now();
    // 这里注入上报时间信息
    console.log("NormalLoggetPlugin ready");
  });
}

NormalLocaltimePlugin.type = "builder" as pluginName