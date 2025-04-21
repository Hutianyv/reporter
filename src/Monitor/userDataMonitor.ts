/**
 * @description 用户信息监控类
 */

import { tapable } from "@/utils/tapable";
import { Subject } from "rxjs";

class UserDataMontior {
     private hooks = tapable(['beforeInit', 'beforeStart', "beforeVia"])
    private config: Monitor.MonitorConfig["userData"];
     public readonly stream$ = new Subject<Monitor.RawMonitorMessageData>();
        constructor(errorMonitorConfig: Monitor.MonitorConfig["userData"]) {
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

export default UserDataMontior