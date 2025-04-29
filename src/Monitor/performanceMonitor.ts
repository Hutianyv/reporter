/**
 * @description 页面性能监控类
 */

import { tapable } from "@/utils/tapable";
import { Subject, fromEventPattern } from "rxjs";
import { empty } from "uuidv4";

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
  private hooks = tapable([
    "beforeInit",
    "beforeStart",
    "afterStart",
    "onError",
  ]);
  private config: Monitor.MonitorConfig["performance"];
  public readonly stream$ = new Subject<Monitor.RawMonitorMessageData>();
  private observers: PerformanceObserver[] = [];
  private idleCallbackIds: number[] = [];
  private animationFrameIds: number[] = [];

  constructor(errorMonitorConfig: Monitor.MonitorConfig["performance"]) {
    this.config = errorMonitorConfig;
    this.hooks.beforeInit.callSync(this);
  }
  start() {
    this.hooks.beforeStart.callSync(this);
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

    this.hooks.afterStart.callSync(this);
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
    if (!this.isSupported("navigation")) return;
    const handleNavigationEntry = (entries: PerformanceEntryList) => {
      entries.forEach((entry) => {
        const navEntry = entry as PerformanceNavigationTiming;
        const timingData = {
          navigationType: navEntry.type,
          dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
          tcp: navEntry.connectEnd - navEntry.connectStart,
          ssl:
            navEntry.secureConnectionStart > 0
              ? navEntry.connectEnd - navEntry.secureConnectionStart
              : 0,
          ttfb: navEntry.responseStart - navEntry.requestStart,
          download: navEntry.responseEnd - navEntry.responseStart,
          domReady: navEntry.domContentLoadedEventEnd - navEntry.startTime,
          fullLoad: navEntry.loadEventStart,
          transferSize: navEntry.transferSize,
          encodedBodySize: navEntry.encodedBodySize,
          decodedBodySize: navEntry.decodedBodySize,
        };
        if (timingData.fullLoad !== 0) {
          this.stream$.next({
            type: "performance",
            info: {
              subType: "navigation",
              pageUrl: window.location.href,
              timeStamp: Date.now(),
              ...timingData,
            },
          });
        }
      });
    };

    this.createObserver("navigation", handleNavigationEntry);
  }
  private observePaintMetrics() {
    if (!this.isSupported("paint")) return;
    //首次绘制FCP监控
    this.createObserver("paint", (entries) => {
      entries.forEach((entry) => {
        if (entry.name === "first-contentful-paint") {
          this.stream$.next({
            type: "performance",
            info: {
              subType: "paint",
              timeStamp: Date.now(),
              extraDesc: "fcp",
              pageUrl: window.location.href,
              startTime: entry.startTime,
            },
          });
        }
      });
    });
    //LCP监控
    this.createObserver("largest-contentful-paint", (entries) => {
      const lastEntry = entries[entries.length - 1] as LargestContentfulPaint;
      this.stream$.next({
        type: "performance",
        info: {
          subType: "paint",
          extraDesc: "lcp",
          pageUrl: window.location.href,
          timeStamp: Date.now(),
          renderTime: lastEntry.renderTime || lastEntry.loadTime,
          element: lastEntry.element?.tagName,
          size: lastEntry.size,
          url: lastEntry.url,
        },
      });
    });

    //CLS监控
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
            shiftValue: entry.value,
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
            timeStamp: Date.now(),
            clsValue: clsValue,
            individualShifts: individualShifts,
          },
        });
      }
    });
  }

  private observeResourceLoading() {
    if (!this.isSupported("resource")) return;
    this.createObserver("resource", (entries) => {
      entries.forEach((entry) => {
        const resourceEntry = entry as PerformanceResourceTiming;
        if (resourceEntry.encodedBodySize < this.getThreshold(resourceEntry))
          return;
        this.stream$.next({
          type: "performance",
          info: {
            subType: "resource",
            pageUrl: window.location.href,
            timeStamp: Date.now(),
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
    if (!this.isSupported("longtask")) return;
    this.createObserver("longtask", (entries) => {
      entries.forEach((entry) => {
        const longTaskEntry = entry as PerformanceLongTaskTiming;
        if (longTaskEntry.duration > this.config.longTask.longTaskThreshold) {
          const attributions = longTaskEntry.attribution.map((attr) => ({
            containerType: attr.containerType,
            containerSrc: attr.containerSrc,
            containerId: attr.containerId,
            containerName: attr.containerName,
          }));
          this.stream$.next({
            type: "performance",
            info: {
              subType: "longTask",
              pageUrl: window.location.href,
              timeStamp: Date.now(),
              name: longTaskEntry.name,
              startTime: longTaskEntry.startTime,
              duration: longTaskEntry.duration,
              attributions: attributions,
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
  // =================================内存监控==================================
  private observeMemoryUsage() {
    if (!this.isSupported("memory")) return;

    let lastUsedJSHeap = 0;
    let growthCount = 0;
    const perf = window.performance as EnhancedPerformance;
    const checkMemory = () => {
      try {
        const { totalJSHeapSize, usedJSHeapSize } = perf.memory!;
        const usedMB = +(usedJSHeapSize / 1024 / 1024).toFixed(2);
        const totalMB = +(totalJSHeapSize / 1024 / 1024).toFixed(2);

        this.checkMemoryLeak(usedMB, lastUsedJSHeap, growthCount);
        this.checkMemoryOverflow(usedMB, totalMB);

        lastUsedJSHeap = usedMB;
      } catch (error) {
        console.error("内存监控发生错误:", error);
      }
    };

    let currentFrameId: number | null = null;
    const startMonitoring = () => {
      let lastRun = 0;
      const checkWithRAF = () => {
        const now = Date.now();
        if (now - lastRun >= this.config.memory.samplingInterval) {
          checkMemory();
          lastRun = now;
        }
        if ("requestAnimationFrame" in window) {
          if (currentFrameId !== null) {
            const index = this.animationFrameIds.indexOf(currentFrameId);
            if (index > -1) {
              this.animationFrameIds.splice(index, 1);
            }
          }
          currentFrameId = requestAnimationFrame(checkWithRAF);
          this.animationFrameIds.push(currentFrameId);
        }
      };

      if ("requestAnimationFrame" in window) {
        currentFrameId = requestAnimationFrame(checkWithRAF);
        this.animationFrameIds.push(currentFrameId);
      } else {
        setInterval(checkMemory, this.config.memory.samplingInterval);
      }
    };
    startMonitoring();
  }

  private checkMemoryLeak(
    usedMB: number,
    lastUsedJSHeap: number,
    growthCount: number
  ) {
    if (usedMB > lastUsedJSHeap) {
      growthCount++;
      if (growthCount >= this.config.memory.leakThreshold) {
        this.stream$.next({
          type: "performance",
          info: {
            subType: "memory",
            extraDesc: "memoryLeak",
            pageUrl: window.location.href,
            timeStamp: Date.now(),
            usedMB: usedMB,
          },
        });
      }
    } else {
      growthCount = 0;
    }
  }

  private checkMemoryOverflow(usedMB: number, totalMB: number) {
    if (usedMB > this.config.memory.maxUsageAlert) {
      this.stream$.next({
        type: "performance",
        info: {
          subType: "memory",
          extraDesc: "memoryOverflow",
          pageUrl: window.location.href,
          timeStamp: Date.now(),
          maxUsageAlert: this.config.memory.maxUsageAlert,
          totalMB: totalMB,
          usedMB: usedMB,
        },
      });
    }
  }
  private observeWhiteScreen() {
    const GAP_TIME = 6000;
    let lastCheckTime = 0;
    let currentFrameId: number | null = null;

    const performWhiteScreenCheck = () => {
      const now = Date.now();
      if (now - lastCheckTime < GAP_TIME) {
        if ("requestAnimationFrame" in window) {
          currentFrameId = requestAnimationFrame(performWhiteScreenCheck);
          if (currentFrameId !== null) {
            const index = this.animationFrameIds.indexOf(currentFrameId);
            if (index === -1) {
              this.animationFrameIds.push(currentFrameId);
            }
          }
        }
        return;
      }

      let emptyPoints = 0;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const getCheckPoints = (total: number) =>
        Array.from({ length: total }, (_, i) => (i + 1) / (total + 1));

      getCheckPoints(9).forEach((ratio) => {
        const element = document.elementFromPoint(
          viewportWidth * ratio,
          viewportHeight / 2
        );
        if (isWrapperElement(element)) emptyPoints++;
      });

      getCheckPoints(9).forEach((ratio) => {
        const element = document.elementFromPoint(
          viewportWidth / 2,
          viewportHeight * ratio
        );
        if (isWrapperElement(element)) emptyPoints++;
      });

      if (emptyPoints >= this.config.whiteScreen.threshold) {
        reportWhiteScreen(emptyPoints);
      }

      lastCheckTime = now;
      if ("requestAnimationFrame" in window) {
        if (currentFrameId !== null) {
          const index = this.animationFrameIds.indexOf(currentFrameId);
          if (index > -1) {
            this.animationFrameIds.splice(index, 1);
          }
        }
        currentFrameId = requestAnimationFrame(performWhiteScreenCheck);
        this.animationFrameIds.push(currentFrameId);
      }
    };

    const isWrapperElement = (element: Element | null) => {
      if (!element) return true; //容错：无法获取元素视为白屏点
      return this.config.whiteScreen.wrapperSelectors.some((selector) =>
        element.matches(selector)
      );
    };

    const reportWhiteScreen = (emptyPoints: number) => {
      this.stream$.next({
        type: "performance",
        info: {
          subType: "whiteScreen",
          pageUrl: window.location.href,
          timeStamp: Date.now(),
          emptyPoints,
        },
      });
    };

    // 启动检查
    if ("requestAnimationFrame" in window) {
      setTimeout(() => {
        currentFrameId = requestAnimationFrame(performWhiteScreenCheck);
        this.animationFrameIds.push(currentFrameId);
      }, this.config.whiteScreen.checkDelay);
    } else {
      // 如果不支持 RAF，使用 setTimeout 实现间隔检查
      setTimeout(() => {
        setInterval(() => {
          performWhiteScreenCheck();
        }, GAP_TIME);
      }, this.config.whiteScreen.checkDelay);
    }
  }
  private observePageBlock() {
    if (!("requestAnimationFrame" in window)) return;
    const CHECK_COUNT = this.config.pageBlock.checkCount;
    const BLOCK_TIME = this.config.pageBlock.blockTime;

    let unmetCount = 0; // 不满足阈值的次数
    let lastFrameTime = 0;
    let currentFrameId: number | null = null;

    const checkFrame = (currentFrameTime: DOMHighResTimeStamp) => {
      if (currentFrameTime - lastFrameTime >= BLOCK_TIME) {
        unmetCount++;
        if (unmetCount >= CHECK_COUNT) {
          this.stream$.next({
            type: "performance",
            info: {
              subType: "pageBlock",
              pageUrl: window.location.href,
              timeStamp: Date.now(),
            },
          });
        }
      } else {
        unmetCount = 0;
      }
      lastFrameTime = currentFrameTime;
      if (currentFrameId !== null) {
        const index = this.animationFrameIds.indexOf(currentFrameId);
        if (index > -1) {
          this.animationFrameIds.splice(index, 1);
        }
      }
      currentFrameId = requestAnimationFrame(checkFrame);
      this.animationFrameIds.push(currentFrameId);
    };
    currentFrameId = requestAnimationFrame(checkFrame);
    this.animationFrameIds.push(currentFrameId);
  }

  //======================= 创建性能监控对象方法 =======================
  private createObserver(
    type: string,
    callback: (entries: PerformanceEntryList) => void
  ) {
    const addHandler = (
      handler: (list: PerformanceObserverEntryList) => void
    ) => {
      const observer = new PerformanceObserver((list) => handler(list));
      observer.observe({ type, buffered: true });
      this.observers.push(observer);
      return observer;
    };

    const removeHandler = (subscription: any) => {
      const observer = subscription as PerformanceObserver;
      observer.disconnect();
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
    fromEventPattern<PerformanceObserverEntryList>(
      addHandler,
      removeHandler
    ).subscribe((list: PerformanceObserverEntryList) => {
      callback(list.getEntries());
    });
  }

  //======================= 计算资源阈值大小 ==========================
  private getThreshold(entry: PerformanceResourceTiming) {
    const isFont = ["font", "woff", "woff2", "ttf", "otf", "eot"].some((ext) =>
      entry.name.includes(ext)
    );
    if (entry.initiatorType === "img")
      return this.config.resource.imgSizeThreshold;
    if (entry.initiatorType === "script")
      return this.config.resource.scriptSizeThreshold;
    if (entry.initiatorType === "link" && entry.name.endsWith(".css"))
      return this.config.resource.cssSizeThreshold;
    if (isFont) return this.config.resource.fontSizeThreshold;
    return this.config.resource.extraMediaSizeThreshold;
  }

  private disconnect() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.idleCallbackIds.forEach((id) => {
      if ("cancelIdleCallback" in window) {
        (window as any).cancelIdleCallback(id);
      }
    });
    this.idleCallbackIds = [];
    this.animationFrameIds.forEach((id) => {
      cancelAnimationFrame(id);
    });
    this.animationFrameIds = [];
  }

  //========================= 兼容性检查 ========================
  private isSupported(api: string): boolean {
    const featureMap: Record<string, () => boolean> = {
      navigation: () => "PerformanceNavigationTiming" in window,
      paint: () => "PerformancePaintTiming" in window,
      longtask: () => "PerformanceLongTaskTiming" in window,
      resource: () => "PerformanceResourceTiming" in window,
      memory: () => "memory" in performance,
    };

    return featureMap[api]?.() ?? false;
  }
}
export default PerformanceMontior;
