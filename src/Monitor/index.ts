/*
 * 收集器，主动或被动地采集特定环境下的原始数据，组装为平台无关事件。
 * Monitor 有若干个，每一个 Monitor 对应一个功能
 * 比如关于 JS 错误的监控是一个 Monitor，关于用户行为的监控又是另一个 Monitor
 */

/**
 * @description 主监控类
 */

import ConfigManager from '@/ConfigManager'
import ErrorMontior from './errorMonitor';
import PerformanceMonitor from './performanceMonitor';
import PageViewMonitor from './pageViewMonitor';
import UserActionMonitor from './userActionMonitor';
import UserDataMonitor from './userDataMonitor';
import { tapable } from '@/utils/tapable';

class MainMonitor {
    private config: Monitor.MonitorConfig;
  private hooks = tapable(["beforeInit", "beforeStart", "beforeStop"]);
  private enqueue: (data: Monitor.RawMonitorMessageData) => void;
    private errorMontior?: ErrorMontior;
    private performanceMonitor?: PerformanceMonitor;
    private pageViewMonitor?: PageViewMonitor;
    private userActionMonitor?: UserActionMonitor;
    private userDataMonitor?: UserDataMonitor;
  constructor(configManager: ConfigManager, enqueue: (data: Monitor.RawMonitorMessageData) => void) {
    this.config = configManager.getMonitorConfig()
    this.enqueue = enqueue
      this.hooks.beforeInit.callSync()
      this.init(this.config)
  }

  init(config: Monitor.MonitorConfig) {
      // 初始化各种监控类
      const shouldInitErrorMonitor = Boolean(config.error.url);
      const shouldInitPerformanceMonitor = Boolean(config.performance.url);
      const shouldInitUserActionMonitor = Boolean(config.userAction.url);
      const shouldInitUserDataMonitor = Boolean(config.userData.url);
      const shouldInitPageViewMonitor = Boolean(config.pageView.url);

      if (shouldInitErrorMonitor) {
          // 初始化错误监控
          this.errorMontior = new ErrorMontior(config.error, this.enqueue)
      }
      if (shouldInitPerformanceMonitor) {
          // 初始化性能监控
          this.performanceMonitor = new PerformanceMonitor(config.performance, this.enqueue)
      }
      if (shouldInitUserActionMonitor) {
          // 初始化用户行为监控
          this.userActionMonitor = new UserActionMonitor(config.userAction, this.enqueue)
      }
      if (shouldInitUserDataMonitor) {
          // 初始化用户数据监控
          this.userDataMonitor = new UserDataMonitor(config.userData, this.enqueue)
      }
      if (shouldInitPageViewMonitor) {
          // 初始化页面浏览监控
          this.pageViewMonitor = new PageViewMonitor(config.pageView, this.enqueue)
      }
  }

    start() {
      this.hooks.beforeStart.callSync()
        // 开始监控
        this.errorMontior?.start()
        this.performanceMonitor?.start()
        this.userActionMonitor?.start()
        this.userDataMonitor?.start()
        this.pageViewMonitor?.start()
    }
  
  
    stop() {
      this.hooks.beforeStop.callSync()
    // 停止监控
  }
}

export default MainMonitor;