/**
 * @description 用户行为监控类
 */

import { tapable } from "@/utils/tapable";
import { Subject } from "rxjs";

class UserActionMontior {
     private hooks = tapable(['beforeInit', 'beforeStart', "beforeVia"])
    private config: Monitor.MonitorConfig["userAction"];
     public readonly stream$ = new Subject<Monitor.RawMonitorMessageData>();
        constructor(errorMonitorConfig: Monitor.MonitorConfig["userAction"]) {
            this.config = errorMonitorConfig
            this.hooks.beforeInit.callSync()
       
        }
       
        start() { 
            this.hooks.beforeStart.callSync()
            //开始监控
            console.log('start')
        }
        stop() {
            //停止监控
          }
}
export default UserActionMontior