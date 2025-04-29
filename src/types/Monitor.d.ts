declare namespace Monitor {
  type SubTypeMap = {
    error: "jsError" | "assetsError" | "ajaxError" | "unhandledrejectionError";
    performance:
      | "paint"
      | "resource"
      | "longTask"
      | "memory"
      | "whiteScreen"
      | "pageBlock"
      | "navigation";
    // userAction: 'userActionSteps';
    pageView: "history" | "time";
  };

  interface SubTypeExtraInfoMap {
    jsError: {
      errorMsg: string;
      line: number;
      col: number;
      stack: any;
      filename: string;
    };
    assetsError: { resourceUrl: string; tagName: string; outerHTML: string };
    ajaxError: {
      status: number;
      statusText: string;
      url?: string;
      method?: string;
      response?: any;
      costTime?: number;
    };
    unhandledrejectionError: { reason: string; stack: any };
    navigation: {
      dns: number;
      tcp: number;
      ssl: number;
      ttfb: number;
      download: number;
      domReady: number;
      fullLoad: number;
      transferSize: number;
      encodedBodySize: number;
      decodedBodySize: number;
    };
    paint: {
      extraDesc: "fcp" | "lcp" | "fid" | "cls" | "inp" | "ttfb" | "load";
      startTime?: number;
      renderTime?: number;
      clsValue?: number;
      element?: string;
      size?: number;
      url?: string;
      individualShifts?: {
        shiftValue: number;
        sources: string[];
        timestamp: number;
        duration: number;
      }[];
    };
    resource: {
      initiatorType: string;
      url: string;
      duration: number;
      transferSize: number;
      encodedBodySize: number;
    };
    longTask: {
      name: string
      startTime: number;
      duration: number;
      attributions: Object
    };
    memory: {
      extraDesc: "memoryLeak" | "memoryOverflow";
      maxUsageAlert?: number;
      usedMB: number;
      totalMB?: number;
    };
    whiteScreen: {
      emptyPoints: number;
    };
    pageBlock: {
    };
  }
  export interface MonitorInstance {
    start: () => void;
    stop: () => void;
  }

  export type RawMonitorMessageData = {
    [K in keyof SubTypeMap]: SubTypeMap[K] extends infer S
      ? S extends any
        ? {
            type: K;
            info: {
              subType: S;
              pageUrl: string;
              timeStamp: number;
            } & (S extends keyof SubTypeExtraInfoMap
              ? SubTypeExtraInfoMap[S]
              : {});
          }
        : never
      : never;
  }[keyof SubTypeMap];

  export interface MonitorConfig {
    error: {
      enable: boolean;
      customErrorMonitor: Array<
        (stream$: Subject<RawMonitorMessageData>) => void
      >;
    };
    performance: {
      enable: boolean;
      memory: {
        samplingInterval: number; //采样间隔时间
        leakThreshold: number; //连续增长超过n次告警
        maxUsageAlert: number; //内存超过nMB告警（单位MB）
      };
      whiteScreen: {
        wrapperSelectors: string[]; //白屏容器元素
        checkPoints: number; //白屏检测点数
        threshold: number; //白屏判定阈值
        checkDelay: number; //页面加载后开始检测的延迟
      };
      longTask: {
        longTaskThreshold: number;
      };
      pageBlock: {
        checkCount: number;
        blockTime: number;
      }
      resource: {
        imgSizeThreshold: number;
        scriptSizeThreshold: number;
        cssSizeThreshold: number;
        fontSizeThreshold: number;
        extraMediaSizeThreshold: number;
      };
      customPerformanceMonitor: Array<
        (stream$: Subject<RawMonitorMessageData>) => void
      >;
    };
    // userAction: {
    //   enable: boolean;
    // };
    pageView: {
      enable: boolean;
    };
  }
}
