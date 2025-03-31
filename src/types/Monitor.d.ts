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
        userAgentData: boolean;//比如：用户设备类型、操作系统、浏览器、进入页面方式等信息
    }
    interface PageViewMonitorConfig {
        url?: string; //页面显示信息上报地址
        pv: boolean;
        uv: boolean;
        time: boolean;//用户页面停留时长
    }
    export interface RawMonitorMessageData {
        type: string;
        info: {} & {
            type: 'error' | 'performance' | 'userAction' | 'userData' | 'pageView';
            subType?: string;
        };
    }
    export interface MonitorConfig {
        error: ErrorMonitorConfig
        performance: PerformanceMonitorConfig
        userAction: UserActionMonitorConfig
        userData: UserDataMonitorConfig
        pageView: boolPageViewMonitorConfigan
    }
} 