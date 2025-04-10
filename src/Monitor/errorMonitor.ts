/**
 * @description 报错监控类
 * 对于错误监控，我们使用的都是dom2级的时间监听
 * 因为可以注册多个事件分情况上报，且资源错误只能在捕获阶段拿到
 */

import { tapable } from "@/utils/tapable";
class ErrorMontior {
  private hooks = tapable(["beforeStart"]);
  private config: Monitor.MonitorConfig["error"];
  private enqueue: (data: Monitor.RawMonitorMessageData) => void;

  //保留原始XMLHttpRequest的引用，用于劫持XHR
  private originalXHR: typeof XMLHttpRequest;
  //保留原始fetch的引用，用于劫持fetch
  private originalFetch: typeof fetch;
  constructor(
    errorMonitorConfig: Monitor.MonitorConfig["error"],
    enqueue: (data: Monitor.RawMonitorMessageData) => void
  ) {
    this.config = errorMonitorConfig;
    this.enqueue = enqueue;
    this.originalXHR = window.XMLHttpRequest;
    this.originalFetch = window.fetch;

    this.start();
  }
  start() {
    this.hooks.beforeStart.callSync();
    //开始监控
    if (this.config.jsError) {
      this.listenRuntimeError();
    }
    if (this.config.assetsError) {
      this.listenResourceError();
    }
    if (this.config.unhandledrejectionError) {
      this.listenPromiseError();
    }
    if (this.config.ajaxError) {
      this.hijackXHR();
      this.hijackFetch();
    }
  }

  //------------------------ 运行时错误监控 ------------------------
  private listenRuntimeError() {
    window.addEventListener("error", (event) => {
      //这里进行判断，如果是window下的错误，那么其实就是运行时的js错误，这里进行jserror的上报
      if (event.target !== window) return;
      this.enqueue({
        type: "error",
        info: {
          subType: "jsError",
          pageUrl: window.location.href,
          errorMsg: event.message,
          filename: event.filename,
          line: event.lineno,
          col: event.colno,
          stack: event.error?.stack,
        },
      });
      //监控埋点原则上不会影响页面的表现，所以不用阻止默认行为，该报错就报错
      // event.preventDefault(); // 阻止默认错误打印（可选）
    });
  }

  //------------------------ 资源加载错误监控 ------------------------
  private listenResourceError() {
    window.addEventListener(
      "error",
      (event) => {
        const target = event.target as HTMLElement;
        const isResourceError =
          target.tagName === "IMG" ||
          target.tagName === "SCRIPT" ||
          target.tagName === "LINK";

        if (isResourceError) {
          this.enqueue({
            type: "error",
            info: {
              subType: "assetsError",
              pageUrl: window.location.href,
              resourceUrl:
                (target as HTMLImageElement).src ||
                (target as HTMLLinkElement).href ||
                (target as HTMLScriptElement).src,
              tagName: target.tagName,
              outerHTML: target.outerHTML,
            },
          });
        }
      },
      true //在捕获阶段监听（资源加载错误不会冒泡）
    );
  }

  //------------------------ Promise 未处理错误监控 ------------------------
  private listenPromiseError() {
    window.addEventListener("unhandledrejection", (event) => {
      this.enqueue({
        type: "error",
        info: {
          subType: "unhandledrejectionError",
          pageUrl: window.location.href,
          reason: event.reason?.message || String(event.reason),
          stack: event.reason?.stack,
        },
      });
      //event.preventDefault();
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
            self.enqueue({
              type: "error",
              info: {
                subType: "ajaxError",
                pageUrl: window.location.href,
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
        self.enqueue({
          type: "error",
          info: {
            subType: "ajaxError",
            pageUrl: window.location.href,
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
