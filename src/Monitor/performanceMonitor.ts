/**
 * @description 页面性能监控类
 */

import { tapable } from "@/utils/tapable";

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  sources: Array<{
    node: Node;
    previousRect: DOMRectReadOnly;
    currentRect: DOMRectReadOnly;
  }>;
}

interface PerformanceLongTaskTiming extends PerformanceEntry {
  readonly attribution: TaskAttribution[];
}
interface TaskAttribution {
  readonly containerType: "window" | "iframe" | "embed" | "object";
  readonly containerSrc?: string;
  readonly containerId?: string;
  readonly containerName?: string;
}

class PerformanceMontior {
  private hooks = tapable(["beforeStart", "afterStart", "onError"]);
  private config: Monitor.MonitorConfig["performance"];
  private enqueue: (data: Monitor.RawMonitorMessageData) => void;
  private observers: PerformanceObserver[] = [];
  private longTaskThreshold = 50; //这个长任务阈值给个50ms，先这样吧，但是怀疑现在代码里肯定一堆大于50ms的任务hhh
  private readonly MAX_SAMPLE_RATE = 0.1; //10%采样率

  constructor(
    errorMonitorConfig: Monitor.MonitorConfig["performance"],
    enqueue: (data: Monitor.RawMonitorMessageData) => void
  ) {
    this.config = errorMonitorConfig;
    this.enqueue = enqueue;
    this.hooks.beforeInit.callSync();
    this.start();
  }
  start() {
    this.hooks.beforeStart.callSync();
    //开始监控
    try {
      //核心性能指标监控
      this.setupCoreMetrics();
      //高级性能指标监控，需要一定的自定义
      this.setupAdvancedMonitoring();
      //完全由用户自己设计的性能指标
      this.setupCustomMetrics();
    } catch (error) {
      //TODO: 在这里进行retry重新开启监控，其他的地方也看看加上onerror这个生命周期
    }

    this.hooks.afterStart.callSync();
  }

  //======================= 核心性能指标 =======================
  private setupCoreMetrics() {
    //导航计时（类似dns解析事件，网络传输时间，dom解析完成时间等等）
    if (this.config.navigation) {
      this.observeNavigationTiming();
    }

    //绘制指标 (FP/FCP/LCP/CLS，常见的web vitals)
    if (this.config.paint) {
      this.observePaintMetrics();
    }

    //资源加载性能
    if (this.config.resource) {
      this.observeResourceLoading();
    }

    //长任务监控
    if (this.config.longTask) {
      this.observeLongTasks();
    }
  }

  //具体方法实现
  private observeNavigationTiming() {
    const handleNavigationEntry = (entry: PerformanceNavigationTiming) => {
      const timingData = {
        dns: entry.domainLookupEnd - entry.domainLookupStart,
        tcp: entry.connectEnd - entry.connectStart,
        ssl:
          entry.secureConnectionStart > 0
            ? entry.connectEnd - entry.secureConnectionStart
            : 0,
        ttfb: entry.responseStart - entry.requestStart,
        download: entry.responseEnd - entry.responseStart,
        domReady: entry.domContentLoadedEventEnd - entry.startTime,
        fullLoad: entry.loadEventStart - entry.startTime,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
      };

      this.enqueue({
        type: "performance",
        info: {
          subType: "navigation",
          ...timingData,
        },
      });
    };

    if (this.isSupported("navigation")) {
      const entries = performance.getEntriesByType("navigation");
      if (entries.length)
        handleNavigationEntry(entries[0] as PerformanceNavigationTiming);
    }
  }
  private observePaintMetrics() {
    //首次绘制指标
    const fcp = performance.getEntriesByType("paint")[1];
    this.enqueue({
      type: "performance",
      info: {
        subType: "paint",
        extraDesc: "fcp",
        value: fcp.startTime,
      },
    });
    //LCP监控
    this.createObserver("largest-contentful-paint", (entries) => {
      const lastEntry = entries[entries.length - 1] as LargestContentfulPaint;
      this.enqueue({
        type: "performance",
        info: {
          subType: "paint",
          extraDesc: "lcp",
          value: lastEntry.renderTime || lastEntry.loadTime,
          element: lastEntry.element?.tagName,
          size: lastEntry.size,
          url: lastEntry.url,
        },
      });
    });

    //CLS监控
    let clsValue = 0;
    this.createObserver("layout-shift", (entries) => {
      entries.forEach((entry) => {
        if (!(entry as LayoutShift).hadRecentInput) {
          clsValue += (entry as LayoutShift).value;
          this.enqueue({
            type: "performance",
            info: {
              subType: "paint",
              extraDesc: "cls",
              value: clsValue,
              sources: (entry as LayoutShift).sources?.map((s) =>
                s.node?.toString()
              ),
            },
          });
        }
      });
    });
  }

  private observeResourceLoading() {
    this.createObserver("resource", (entries) => {
      entries.forEach((entry) => {
        if (Math.random() > this.MAX_SAMPLE_RATE) return;

        const resourceEntry = entry as PerformanceResourceTiming;
        this.enqueue({
          type: "performance",
          info: {
            subType: "resource",
            initiatorType: resourceEntry.initiatorType,
            name: resourceEntry.name,
            duration: resourceEntry.duration,
            protocol: new URL(resourceEntry.name).protocol.replace(":", ""),
            transferSize: resourceEntry.transferSize,
            encodedBodySize: resourceEntry.encodedBodySize,
          },
        });
      });
    });
  }

  private observeLongTasks() {
    this.createObserver("longtask", (entries) => {
      entries.forEach((entry) => {
        const longTaskEntry = entry as PerformanceLongTaskTiming;
        if (longTaskEntry.duration > this.longTaskThreshold) {
          this.enqueue({
            type: "performance",
            info: {
              subType: "longTask",
              duration: longTaskEntry.duration,
              container:
                longTaskEntry.attribution[0]?.containerType || "window",
              context: longTaskEntry.attribution[0]?.containerSrc,
            },
          });
        }
      });
    });
  }

  //======================= 高级监控项 =======================
  private setupAdvancedMonitoring() {
    // 1. 内存监控
    if ("memory" in performance) {
      this.observeMemoryUsage();
    }

    // 2. 首屏渲染监控
    this.observeFirstScreenPaint();

    // 3. 交互响应延迟
    this.observeInteractionLatency();
  }

  private observeMemoryUsage() {}
  private observeFirstScreenPaint() {}
  private observeInteractionLatency() {}

  //======================= 自定义指标 =======================
  private setupCustomMetrics() {
    // 业务自定义指标示例
    performance.mark("custom-metric-start");
    window.addEventListener("custom-event", () => {
      performance.measure("custom-metric", "custom-metric-start");
    });
  }

  //======================= 工具方法 =======================
  private createObserver(
    type: string,
    callback: (entries: PerformanceEntryList) => void
  ) {
    try {
      const observer = new PerformanceObserver((list) =>
        callback(list.getEntries())
      );
      observer.observe({ type, buffered: true });
      this.observers.push(observer);
    } catch (error) {
      this.hooks.onError.callSync(error);
    }
  }

  private disconnect() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }

  //========================= 兼容性检查 ========================
  private isSupported(api: string): boolean {
    const featureMap: Record<string, () => boolean> = {
      navigation: () => "PerformanceNavigationTiming" in window,
      paint: () => "PerformancePaintTiming" in window,
      longtask: () => "PerformanceLongTaskTiming" in window,
      resource: () => "PerformanceResourceTiming" in window,
    };

    return featureMap[api]?.() ?? false;
  }
}
export default PerformanceMontior;
