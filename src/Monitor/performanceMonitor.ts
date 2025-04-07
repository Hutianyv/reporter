/**
 * @description 页面性能监控类
 */

import { tapable } from "@/utils/tapable";

class PerformanceMontior {
     private hooks = tapable(['beforeInit', 'beforeStart', "beforeVia"])
        private config: Monitor.MonitorConfig["performance"];
        private enqueue: (data: Monitor.RawMonitorMessageData) => void;
        constructor(errorMonitorConfig: Monitor.MonitorConfig["performance"], enqueue: (data: Monitor.RawMonitorMessageData) => void) {
            this.config = errorMonitorConfig
            this.enqueue = enqueue
            this.hooks.beforeInit.callSync()
            this.init()
        }
        init() {
            //初始化
            window.addEventListener('error', (e) => {
                console.log(e)
            })
        }
        via2Builder(message: string) {
            //将错误信息传递给builder
            console.log('via2Report')
        }
        start() { 
            this.hooks.beforeStart.callSync()
            //开始监控
            console.log('start')
        }
}
export default PerformanceMontior