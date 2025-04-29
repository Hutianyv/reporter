/*
 * 组装器，负责将收集器上报的平台无关事件转换为特定平台的上报格式。
 * 主要负责包装特定环境下的上下文信息。
 * 在浏览器环境下，上下文信息包括页面地址、网络状态、当前时间等等
 * 再结合收到的 Monitor 的数据，完成上报格式的组装。
 */

import { tapable } from "@/utils/tapable";
import ConfigManager from "@/ConfigManager";
import { ReporterMessage } from "@/types";
import { EMPTY, Observable, Subject, defer, of } from "rxjs";
import { catchError, mergeMap } from "rxjs/operators";

class Builder {
  config: Builder.BuilderConfig;
  hooks = tapable(["beforeBuild", "afterBuild"]);
  private input$ = new Subject<Monitor.RawMonitorMessageData>();
  public readonly output$: Observable<ReporterMessage>;

  constructor(ConfigManager: ConfigManager) {
    this.config = ConfigManager.getBuilderConfig();

    //构建处理管道
    this.output$ = this.input$.pipe(
      mergeMap((data) =>
        defer(() => {
          return this.build(data);
        })
      ),
      catchError((error) => {
        console.error("Build failed:", error);
        return EMPTY;
      })
    );
  }

  private build(data: Monitor.RawMonitorMessageData) { 
    return defer(() => {
      this.hooks.beforeBuild.callSync(data);
      this.hooks.afterBuild.callSync(data);
      return of(data as ReporterMessage);
    }).pipe(
      catchError((error) => {
        console.error("Build failed:", error);
        return EMPTY;
      })
    )
  }
  public toBuild(data: Monitor.RawMonitorMessageData) {
    this.input$.next(data);
  }
}

export default Builder;
