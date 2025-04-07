/**
 * 
 * @param Builder 构建器
 */
import { pluginName, ReporterMessage } from "@/types";
import Builder from "@/Builder";
import { nanoid } from 'nanoid'
export function NormalIdPlugin(Builder: Builder) {
    //长期的userId
    let userId = localStorage.getItem('userId')
    if (!userId) { 
        userId = nanoid(10)
        localStorage.setItem('userId', userId)
    }
    //每次页面访问的traceId
    let traceId = sessionStorage.getItem('traceId')
    if (!traceId) { 
        traceId = nanoid(10)
        sessionStorage.setItem('traceId', traceId)
    }
    Builder.hooks.beforeBuild.tapSync((RawMonitorMessageData: ReporterMessage) => {
      // 这里注入userId和traceId
    RawMonitorMessageData.userId = userId as string;
    RawMonitorMessageData.traceId = traceId as string;
    console.log("NormalLoggetPlugin ready");
  });
}

NormalIdPlugin.type = "builder" as pluginName