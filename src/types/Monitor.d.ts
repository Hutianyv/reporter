declare namespace Monitor {
  interface ErrorMonitorConfig {
    url?: string; //错误上报地址
    jsError: boolean;
    assetsError: boolean;
    ajaxError: boolean;
    unhandledrejectionError: boolean;
  }
  interface PerformanceMonitorConfig {
    url?: string; //性能上报地址
    paint: boolean;
    resource: boolean;
    navigation: boolean;
    longTask: boolean;
    memory: boolean;
    whiteScreen: boolean;
    pageBlock: boolean;
  }
  //这个没设计好，再看看，要反映用户的兴趣和偏好
  interface UserActionMonitorConfig {
    url?: string; //用户行为上报地址
    click: boolean;
    scroll: boolean;
    input: boolean;
    keydown: boolean;
    mousemove: boolean;
    mousewheel: boolean;
    resize: boolean;
    visibilitychange: boolean;
    focus: boolean;
    blur: boolean;
    dblclick: boolean;
    contextmenu: boolean;
    select: boolean;
    submit: boolean;
  }
  interface UserDataMonitorConfig {
    url?: string; //用户数据上报地址
    userAgentData: boolean; //比如：用户设备类型、操作系统、浏览器、进入页面方式等信息
  }
  interface PageViewMonitorConfig {
    url?: string; //页面显示信息上报地址
    pv: boolean;
    uv: boolean;
    time: boolean; //用户页面停留时长
  }

  type BooleanKeys<T> = {
    [K in keyof T]: T[K] extends boolean ? K : never;
  }[keyof T];

  type SubTypeMap = {
    error: BooleanKeys<ErrorMonitorConfig>;
    performance: BooleanKeys<PerformanceMonitorConfig>;
    userAction: BooleanKeys<UserActionMonitorConfig>;
    userData: BooleanKeys<UserDataMonitorConfig>;
    pageView: BooleanKeys<PageViewMonitorConfig>;
  };

  interface SubTypeExtraInfoMap {
    pv: { url: string };
    uv: { url: string };
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
      value: number;
      element?: string;
      size?: number;
      url?: string;
      individualShifts?: {
        value: number;
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
      duration: number;
      container: "object" | "window" | "iframe" | "embed";
      context?: string;
    };
    memory: {
      extraDesc: "memoryLeak" | 'memoryOverflow'
      maxUsageAlert?: number
      usedMB: number;
      totalMB?: number;
    };
    whiteScreen: {
      emptyPoints: number;
    };
    pageBlock: {

    }
  }

  export type RawMonitorMessageData = {
    [K in keyof SubTypeMap]: SubTypeMap[K] extends infer S
      ? S extends any
        ? {
            type: K;
            info: {
                subType: S;
                pageUrl: string;
            } & (S extends keyof SubTypeExtraInfoMap
              ? SubTypeExtraInfoMap[S]
              : {});
          }
        : never
      : never;
  }[keyof SubTypeMap];

  export interface MonitorConfig {
    error: ErrorMonitorConfig;
    performance: PerformanceMonitorConfig;
    userAction: UserActionMonitorConfig;
    userData: UserDataMonitorConfig;
    pageView: boolPageViewMonitorConfigan;
  }
}
