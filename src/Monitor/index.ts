/*
 * 收集器，主动或被动地采集特定环境下的原始数据，组装为平台无关事件。
 * Monitor 有若干个，每一个 Monitor 对应一个功能
 * 比如关于 JS 错误的监控是一个 Monitor，关于用户行为的监控又是另一个 Monitor
 */

/**
 * @description 主监控类
 */

import { tapable } from "@/utils/tapable";
import {
  Subject,
  merge,
  mergeMap,
  catchError,
  bufferTime,
  Subscription,
  Observable,
  EMPTY,
} from "rxjs";
import ConfigManager from "@/ConfigManager";
import ErrorMonitor from "./errorMonitor";
import PerformanceMonitor from "./performanceMonitor";
import PageViewMonitor from "./pageViewMonitor";

abstract class BaseMonitor {
  abstract stream$: Subject<Monitor.RawMonitorMessageData>;
  abstract start(): void;
  abstract stop(): void;
}

const MONITOR_REGISTRY: Record<
  keyof Monitor.MonitorConfig,
  new (config: any) => BaseMonitor
> = {
  error: ErrorMonitor,
  performance: PerformanceMonitor,
  //@ts-ignore
  userAction: UserActionMonitor,
  pageView: PageViewMonitor,
};
export interface MonitorStreamConfig {
  concurrency?: number; // 最大并发数
  enableLog?: boolean; // 启用日志
  bufferTime?: number; // 背压缓冲时间(ms)
}
const DEFAULT_CONFIG: Required<MonitorStreamConfig> = {
  concurrency: 3,
  enableLog: true,
  bufferTime: 500,
};
class MainMonitor {
  private isStarted = false;
  private config: Monitor.MonitorConfig;
  private hooks = tapable(["beforeInit", "beforeStart", "beforeStop"]);
  private monitors: Partial<
    Record<keyof Monitor.MonitorConfig, Monitor.MonitorInstance>
  > = {};
  private MainPipeline$ = new Subject();
  private RawMonitorMessageStream$ =
    new Subject<Monitor.RawMonitorMessageData>();
  private subscriptions = new Subscription();
  public readonly mainStream$ = this.RawMonitorMessageStream$.asObservable();
  constructor(configManager: ConfigManager) {
    this.config = configManager.getMonitorConfig();
    this.hooks.beforeInit.callSync();

    this.initializeMonitors();
  }

  private initializeMonitors() {
    const childStreams: Observable<Monitor.RawMonitorMessageData>[] = [];

    (
      Object.entries(MONITOR_REGISTRY) as Array<
        [keyof Monitor.MonitorConfig, new (config: any) => BaseMonitor]
      >
    ).forEach(([type, MonitorClass]) => {
      const config = this.config[type];
      if (config.enable) {
        const monitor = new MonitorClass(config);
        this.monitors[type] = monitor;

        childStreams.push(monitor.stream$);
      }
    });

    this.subscriptions.add(
      merge(...childStreams).subscribe(this.RawMonitorMessageStream$)
    );
  }

  private setupDataPipeline(config: MonitorStreamConfig = DEFAULT_CONFIG) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    this.subscriptions.add(
      this.mainStream$
        .pipe(
          bufferTime(mergedConfig.bufferTime),
          mergeMap((buffer) => buffer, mergedConfig.concurrency),
          catchError((error) => {
            console.error("[Monitor] Pipeline error:", error);
            return EMPTY;
          })
        )
        .subscribe()
    );
  }

  start() {
    if (this.isStarted) return;
    this.hooks.beforeStart.callSync();
    // 开始监控
    try {
      Object.values(this.monitors).forEach((monitor) => {
        monitor?.start();
      });

      this.setupDataPipeline();
      this.isStarted = true;
    } catch (err) {
      console.log(err);
    }
  }

  stop() {
    this.hooks.beforeStop.callSync();
    // 停止监控
    try {
      Object.values(this.monitors).forEach((monitor) => {
        monitor?.stop();
      });
    } catch (err) {
      console.log(err);
      this.MainPipeline$?.unsubscribe();
      this.subscriptions.unsubscribe();
      this.subscriptions = new Subscription();
      this.isStarted = false;
    }
  }
}

export default MainMonitor;
