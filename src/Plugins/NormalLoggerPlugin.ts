/**
 * 
 * @param Client // 监控平台唯一实例
 */

import { pluginName } from "@/types";
export function NormalLoggerPlugin(Client: any) {
  Client.hooks.ready.tapSync(() => {
    console.log("NormalLoggetPlugin ready");
  });
}
NormalLoggerPlugin.type = 'client' as pluginName
