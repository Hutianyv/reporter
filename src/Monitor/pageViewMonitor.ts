/**
 * @description 页面显示信息监控类
 */

import { tapable } from "@/utils/tapable";
import { Subject } from "rxjs";

class PageViewMontior {
    private hooks = tapable(['beforeInit', 'beforeStart', "beforeVia"])
    // private config: Monitor.MonitorConfig["pageView"];
    public readonly stream$ = new Subject<Monitor.RawMonitorMessageData>();
      
       constructor(errorMonitorConfig: Monitor.MonitorConfig["pageView"]) {
           //    this.config = errorMonitorConfig
           
           this.hooks.beforeInit.callSync(this)
           
       }
       start() { 
           this.hooks.beforeStart.callSync(this)
           //开始监控
           
       }
       stop() {
        //停止监控
      }
}
export default PageViewMontior