/**
 * 
 * @param Builder 构建器
 */
import { ReporterMessage } from "@/types";
import { pluginName } from '@/types/Client';
import Builder from "@/Builder";
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { nanoid } from 'nanoid'

async function getFingerprint(): Promise<string> {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  const visitorId = result.visitorId;
 
  return visitorId
}
export async function NormalIdPlugin(Builder: Builder) {
    //长期的userId
    let userId = localStorage.getItem('river-userId')
    if (!userId) { 
        userId = await getFingerprint()
        localStorage.setItem('userId', userId)
    }
    //每次页面访问的traceId
    let traceId = sessionStorage.getItem('river-traceId')
    if (!traceId) { 
        traceId = nanoid(10)
        sessionStorage.setItem('traceId', traceId)
    }
    Builder.hooks.beforeBuild.tapSync((RawMonitorMessageData: ReporterMessage) => {
      // 这里注入userId和traceId
    RawMonitorMessageData.userId = userId as string;
    RawMonitorMessageData.traceId = traceId as string;
    console.log("[ NormalIdPlugin ] processing...");
  });
}

NormalIdPlugin.type = "builder" as pluginName