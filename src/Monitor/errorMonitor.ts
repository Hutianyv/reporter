/**
 * @description 报错监控类
 */
// interface ErrorMonitorConfig {
//     url?: string; //错误上报地址
//     jsError: boolean;
//     assetsError: boolean;
//     ajaxError: boolean;
//     unhandledrejectionError: boolean;
// }
import { tapable } from "@/utils/tapable"
class ErrorMontior {
    private hooks = tapable(['beforeInit', 'beforeStart', "beforeVia"])
    private config: Monitor.MonitorConfig["error"];
    private enqueue: (data: Monitor.RawMonitorMessageData) => void;
    constructor(errorMonitorConfig: Monitor.MonitorConfig["error"], enqueue: (data: Monitor.RawMonitorMessageData) => void) {
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
export default ErrorMontior