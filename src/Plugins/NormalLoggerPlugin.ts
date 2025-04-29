/**
 * 
 * @param Client // 监控平台唯一实例
 */

import { pluginName } from '@/types/Client';
export function NormalLoggerPlugin(Client: any) {
  Client.hooks.ready.tapSync(() => {
    console.log("[NormalLoggerPlugin] ready");
  });
}
NormalLoggerPlugin.type = 'client' as pluginName
