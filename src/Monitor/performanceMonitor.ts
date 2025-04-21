/**
 * @description 页面性能监控类
 */

import { tapable } from "@/utils/tapable";
import { Subject } from "rxjs";

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

interface EnhancedPerformance extends Performance {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
}

class PerformanceMontior {
  private hooks = tapable(["beforeStart", "afterStart", "onError"]);
  private config: Monitor.MonitorConfig["performance"];
   public readonly stream$ = new Subject<Monitor.RawMonitorMessageData>();
  private observers: PerformanceObserver[] = [];
  private longTaskThreshold = 50; //这个长任务阈值给个50ms，先这样吧，但是怀疑现在代码里肯定一堆大于50ms的任务hhh
  private readonly MAX_SAMPLE_RATE = 0.1; //10%采样率

  constructor(
    errorMonitorConfig: Monitor.MonitorConfig["performance"],
  ) {
    this.config = errorMonitorConfig;
    this.hooks.beforeInit.callSync();
    this.start();
  }
  start() {
    this.hooks.beforeStart.callSync();
    //开始监控
    try {
      //核心性能指标监控
      this.setupCoreMetrics();
      //高级性能指标监控
      this.setupAdvancedMonitoring();
      //自定义性能指标监控
    if (this.config.customPerformanceMonitor.length > 0) { 
      this.config.customPerformanceMonitor.forEach((item) => {
        item(this.stream$);
      });
    }
    } catch (error) {
      //TODO: 在这里进行retry重新开启监控，其他的地方也看看加上onerror这个生命周期
    }

    this.hooks.afterStart.callSync();
  }
  stop() {
    //停止监控
  }

  //======================= 核心性能指标 =======================
  private setupCoreMetrics() {
    //导航计时（类似dns解析事件，网络传输时间，dom解析完成时间等等）
      this.observeNavigationTiming();

    //绘制指标 (FP/FCP/LCP/CLS，常见的web vitals)
      this.observePaintMetrics();

    //资源加载性能
      this.observeResourceLoading();

    //长任务监控
      this.observeLongTasks();
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

      this.stream$.next({
        type: "performance",
        info: {
          subType: "navigation",
          pageUrl: window.location.href,
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
    if (!this.isSupported("paint")) return;
    //首次绘制指标
    const paintEntries = performance.getEntriesByType("paint");
    const fcpEntry = paintEntries.find(
      (entry) => entry.name === "first-contentful-paint"
    );

    if (fcpEntry) {
      this.stream$.next({
        type: "performance",
        info: {
          subType: "paint",
          extraDesc: "fcp",
          pageUrl: window.location.href,
          value: fcpEntry.startTime,
        },
      });
    }
    //LCP监控
    this.createObserver("largest-contentful-paint", (entries) => {
      const lastEntry = entries[entries.length - 1] as LargestContentfulPaint;
      this.stream$.next({
        type: "performance",
        info: {
          subType: "paint",
          extraDesc: "lcp",
          pageUrl: window.location.href,
          value: lastEntry.renderTime || lastEntry.loadTime,
          element: lastEntry.element?.tagName,
          size: lastEntry.size,
          url: lastEntry.url,
        },
      });
    });

    //CLS监控  TODO: 可能这里的individualShifts还不够详细emmm，之后要改
    let clsValue = 0;
    let lastCLSReportTime = 0;
    const REPORT_INTERVAL = 5000;
    this.createObserver("layout-shift", (entries) => {
      const currentTime = Date.now();
      const individualShifts = entries
        .filter(
          (entry: PerformanceEntry): entry is LayoutShift =>
            !(entry as LayoutShift).hadRecentInput
        )
        .map((entry: LayoutShift) => {
          clsValue += entry.value;
          return {
            value: entry.value,
            sources: entry.sources?.map((s) => s.node?.toString()),
            timestamp: entry.startTime,
            duration: entry.duration,
          };
        });
      if (
        individualShifts.length > 0 &&
        currentTime - lastCLSReportTime >= REPORT_INTERVAL
      ) {
        this.stream$.next({
          type: "performance",
          info: {
            subType: "paint",
            extraDesc: "cls",
            pageUrl: window.location.href,
            value: clsValue,
            individualShifts: individualShifts,
          },
        });
      }
    });
  }

  private observeResourceLoading() {
    this.createObserver("resource", (entries) => {
      entries.forEach((entry) => {
        if (Math.random() > this.MAX_SAMPLE_RATE) return;

        const resourceEntry = entry as PerformanceResourceTiming;
        this.stream$.next({
          type: "performance",
          info: {
            subType: "resource",
            pageUrl: window.location.href,
            initiatorType: resourceEntry.initiatorType,
            url: resourceEntry.name,
            duration: resourceEntry.duration,
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
          this.stream$.next({
            type: "performance",
            info: {
              subType: "longTask",
              pageUrl: window.location.href,
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

    // 2. 白屏监控
    this.observeWhiteScreen();

    // 3. 页面卡顿监控
    this.observePageBlock();
  }

  private observeMemoryUsage() {
    if (!("memory" in performance)) return;

    let lastUsedJSHeap = 0;
    let growthCount = 0;
    const perf = window.performance as EnhancedPerformance;
    const checkMemory = () => {
      const { totalJSHeapSize, usedJSHeapSize } = perf.memory!;

      const usedMB = +(usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = +(totalJSHeapSize / 1024 / 1024).toFixed(2);

      //内存泄漏
      if (usedMB > lastUsedJSHeap) {
        growthCount++;
        if (growthCount >= this.config.memory.leakThreshold) {
          this.stream$.next({
            type: "performance",
            info: {
              subType: "memory",
              extraDesc: "memoryLeak",
              pageUrl: window.location.href,
              usedMB: usedMB,
            },
          });
        }
      } else {
        growthCount = 0;
      }

      //内存使用超过绝对阈值
      if (usedMB > this.config.memory.maxUsageAlert) {
        this.stream$.next({
          type: "performance",
          info: {
            subType: "memory",
            extraDesc: "memoryOverflow",
            pageUrl: window.location.href,
            maxUsageAlert: this.config.memory.maxUsageAlert,
            totalMB: totalMB,
            usedMB: usedMB,
          },
        });
      }
      lastUsedJSHeap = usedMB;

      let lastRun = 0;
      const checkWithRAF = () =>{
        const now = Date.now();
        if (now - lastRun >= this.config.memory.samplingInterval) {
          checkMemory();
          lastRun = now;
        }
        requestAnimationFrame(checkWithRAF);
      }

      if ("requestAnimationFrame" in window) {
        requestAnimationFrame(checkWithRAF);
      } else {
        setTimeout(checkMemory, this.config.memory.samplingInterval);
      }
    };
  }
  private observeWhiteScreen() {
    const performWhiteScreenCheck = () => {
      let emptyPoints = 0;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
  
      const getCheckPoints = (total: number) =>
        Array.from({ length: total }, (_, i) => (i + 1) / (total + 1));
  
      getCheckPoints(9).forEach(ratio => {
        const element = document.elementFromPoint(viewportWidth * ratio, viewportHeight / 2);
        if (isWrapperElement(element)) emptyPoints++;
      });
  
      getCheckPoints(9).forEach(ratio => {
        const element = document.elementFromPoint(viewportWidth / 2, viewportHeight * ratio);
        if (isWrapperElement(element)) emptyPoints++;
      });
  
      if (emptyPoints >= this.config.whiteScreen.threshold) {
        reportWhiteScreen(emptyPoints);
      }
    };
  
    const isWrapperElement = (element: Element | null) => {
      if (!element) return true; // 容错：无法获取元素视为白屏点
      return this.config.whiteScreen.wrapperSelectors.some(selector =>
        element.matches(selector)
      );
    };
  
    const reportWhiteScreen = (emptyPoints: number) => {
      this.stream$.next({
        type: 'performance',
        info: {
          subType: 'whiteScreen',
          pageUrl: window.location.href,
          emptyPoints,
        }
      });
    }
  
    const checkAtIdlePeriod = () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          performWhiteScreenCheck();
        }, { timeout: this.config.whiteScreen.checkDelay });
      } else {
        setTimeout(performWhiteScreenCheck, this.config.whiteScreen.checkDelay);
      }
    };

    if (document.readyState === 'complete') {
      checkAtIdlePeriod();
    } else {
      window.addEventListener('load', checkAtIdlePeriod);
    }
  }
  private observePageBlock() {
    if (!('requestAnimationFrame' in window)) return;
    const CHECK_COUNT = 2 //TODO: 应来自配置项
    const BLOCK_TIME = 100

    let unmetCount = 0; // 不满足阈值的次数
    let lastFrameTime = 0;

    const checkFrame = (currentFrameTime: DOMHighResTimeStamp) => {
      if (currentFrameTime - lastFrameTime >= BLOCK_TIME) {
        unmetCount++;
        if (unmetCount >= CHECK_COUNT) {
          this.stream$.next({
            type: "performance",
            info: {
              subType: "pageBlock",
              pageUrl: window.location.href,
            },
          });
        }
      } else {
        unmetCount = 0;
      }
      lastFrameTime = currentFrameTime;
      requestAnimationFrame(checkFrame);
    };
    requestAnimationFrame(checkFrame);
  }

  //======================= 自定义指标 =======================
  // private setupCustomMetrics() {
  //   // 业务自定义指标示例
  //   performance.mark("custom-metric-start");
  //   window.addEventListener("custom-event", () => {
  //     performance.measure("custom-metric", "custom-metric-start");
  //   });
  // }

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
