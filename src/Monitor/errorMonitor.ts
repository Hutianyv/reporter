/**
 * @description 报错监控类
 * 对于错误监控，我们使用的都是dom2级的时间监听
 * 因为可以注册多个事件分情况上报，且资源错误只能在捕获阶段拿到
 */

import { tapable } from "@/utils/tapable";
import { Subject, fromEvent } from "rxjs";
class ErrorMontior {
  private hooks = tapable(["beforeStart"]);
  private config: Monitor.MonitorConfig["error"];
  public readonly stream$ = new Subject<Monitor.RawMonitorMessageData>();

  //保留原始XMLHttpRequest的引用，用于劫持XHR
  private originalXHR: typeof XMLHttpRequest;
  //保留原始fetch的引用，用于劫持fetch
  private originalFetch: typeof fetch;
  constructor(errorMonitorConfig: Monitor.MonitorConfig["error"]) {
    this.config = errorMonitorConfig;
    this.originalXHR = window.XMLHttpRequest;
    this.originalFetch = window.fetch;
  }
  start() {
    this.hooks.beforeStart.callSync(this.config);
    //开始监控
    this.listenRuntimeError();
    this.listenResourceError();
    this.listenPromiseError();
    this.hijackXHR();
    this.hijackFetch();
    
    //自定义错误上报
    if (this.config.customErrorMonitor.length > 0) {
      this.config.customErrorMonitor.forEach((item) => {
        item(this.stream$);
      });
    }

  }
  stop() {
    //停止监控
  }

  //------------------------ 运行时错误监控 ------------------------
  private listenRuntimeError() {
    fromEvent(window, 'error').subscribe((event: Event) => {
      const errorEvent = event as ErrorEvent;
      //这里进行判断，如果是window下的错误，那么其实就是运行时的js错误，这里进行jserror的上报
      if (event.target !== window) return;
      this.stream$.next({
        type: "error",
        info: {
          subType: "jsError",
          pageUrl: window.location.href,
          timeStamp: Date.now(),
          errorMsg: errorEvent.message,
          filename: errorEvent.filename,
          line: errorEvent.lineno,
          col: errorEvent.colno,
          stack: errorEvent.error?.stack,
        },
      });
      //   //监控埋点原则上不会影响页面的表现，所以不用阻止默认行为，该报错就报错
    //   // event.preventDefault(); // 阻止默认错误打印（可选）
    });
  }

  //------------------------ 资源加载错误监控 ------------------------
  private listenResourceError() {
    fromEvent(window, 'error', { capture: true }).subscribe((event: Event) => {
      const target = event.target as HTMLElement;
      const isResourceError =
        target.tagName === "IMG" ||
        target.tagName === "SCRIPT" ||
        target.tagName === "LINK";

      if (isResourceError) {
        this.stream$.next({
          type: "error",
          info: {
            subType: "assetsError",
            pageUrl: window.location.href,
            timeStamp: Date.now(),
            resourceUrl:
              (target as HTMLImageElement).src ||
              (target as HTMLLinkElement).href ||
              (target as HTMLScriptElement).src,
            tagName: target.tagName,
            outerHTML: target.outerHTML,
          },
        });
      }
    });
  }

  //------------------------ Promise 未处理错误监控 ------------------------
  private listenPromiseError() {
    fromEvent(window, 'unhandledrejection').subscribe((event: Event) => {
      const rejectionEvent = event as PromiseRejectionEvent;
      this.stream$.next({
        type: "error",
        info: {
          subType: "unhandledrejectionError",
          pageUrl: window.location.href,
          timeStamp: Date.now(),
          reason: rejectionEvent.reason?.message || String(rejectionEvent.reason),
          stack: rejectionEvent.reason?.stack,
        },
      });
    });
  }

  //------------------------ XHR劫持 ------------------------
  private hijackXHR() {
    const self = this;
    if (!self.originalXHR) return;

    window.XMLHttpRequest = class XHR extends this.originalXHR {
      private url?: string;
      private method?: string;

      open(method: string, url: string) {
        this.url = url;
        this.method = method;
        super.open(method, url);
      }

      send(data?: any) {
        this.addEventListener("readystatechange", () => {
          if (this.readyState === 4 && this.status >= 400) {
            self.stream$.next({
              type: "error",
              info: {
                subType: "ajaxError",
                pageUrl: window.location.href,
                timeStamp: Date.now(),
                status: this.status,
                statusText: this.statusText,
                url: this.url,
                method: this.method,
                response: this.response,
              },
            });
          }
        });
        super.send(data);
      }
    };
  }

  //------------------------ Fetch劫持 ------------------------
  private hijackFetch() {
    const self = this;

    if (!self.originalFetch) return;
    window.fetch = async function (...args) {
      const startTime = Date.now();
      const response = await self.originalFetch.apply(this, args);

      if (!response.ok) {
        const costTime = Date.now() - startTime;
        self.stream$.next({
          type: "error",
          info: {
            subType: "ajaxError",
            pageUrl: window.location.href,
            timeStamp: Date.now(),
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            method: args[1]?.method || "GET",
            costTime,
          },
        });
      }
      return response;
    };
  }
}
export default ErrorMontior;
