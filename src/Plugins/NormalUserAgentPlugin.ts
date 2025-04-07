/**
 * @desc 用户设备信息插件，通过此插件可获取用户设备信息，作用在Builder生命周期，将设备信息与RawMessage组装
 * @param Builder 构建器
 */
import UAParser from 'ua-parser-js'
import Builder from '@/Builder';
import { pluginName, ReporterMessage } from "@/types";
export function NormalUserAgentPlugin(Builder: Builder) {
  const ua = new UAParser.UAParser().getResult();
  Builder.hooks.beforeBuild.tapSync((RawMonitorMessageData: ReporterMessage) => {
      
    // 这里注入UA信息
    RawMonitorMessageData.info.userAgent = {
      browser: ua.browser,
      cpu: ua.cpu,
      device: ua.device,
      engine: ua.engine,
      os: ua.os,
      ua: ua.ua,
    };
    console.log("NormalUserAgentPlugin ready");
  });
}

NormalUserAgentPlugin.type = "builder" as pluginName;