/**
 * 
 * @param Builder 构建器
 */
import { ReporterMessage } from "@/types";
import Builder from "@/Builder";
import { pluginName } from '@/types/Client';
export function NormalLocaltimePlugin(Builder: Builder) {
  Builder.hooks.beforeBuild.tapSync((RawMonitorMessageData: ReporterMessage) => {
    // 这里注入上报时间信息
    RawMonitorMessageData.reportTimeStamp = Date.now();
    console.log("[ NormalLocalTimePlugin ] processing...");
  });
}

NormalLocaltimePlugin.type = "builder" as pluginName