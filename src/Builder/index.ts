/*
* 组装器，负责将收集器上报的平台无关事件转换为特定平台的上报格式。
* 主要负责包装特定环境下的上下文信息。
* 在浏览器环境下，上下文信息包括页面地址、网络状态、当前时间等等
* 再结合收到的 Monitor 的数据，完成上报格式的组装。
*/

import { tapable } from "@/utils/tapable"
import ConfigManager from '@/ConfigManager';
import { ReporterMessage } from "@/types";
class Builder {

    config: Builder.BuilderConfig
    hooks = tapable([ 'beforeBuild', 'afterBuild' ])
    constructor(ConfigManager: ConfigManager) {
        this.config = ConfigManager.getBuilderConfig()
    }

    build(RawMonitorMessageData: Monitor.RawMonitorMessageData) { 
        this.hooks.beforeBuild.callSync(RawMonitorMessageData)
        console.log('在加工中')
        this.hooks.afterBuild.callSync()

        return RawMonitorMessageData as ReporterMessage
    }
}

export default Builder