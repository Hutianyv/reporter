/**
* 配置管理器，负责配置逻辑，比如合并初始配置和用户配置、拉取远端配置等功能。
* 一般需要传入默认配置，支持用户手动配置，当配置完成时， ConfigManager 会变更 ready 状态，所以它也支持被订阅，以便当 ready 时或者配置变更时通知到订阅方。
*/
import { tapable } from "@/utils/tapable";
// import { baseConfig } from "./baseConfig";
import { RiverConfig } from "@/types";

class ConfigManager {
    private tapableHooks = ['init', 'beforeApplyDefaultConfig', 'beforeApplyPlugin','beforeReady','ready']

    private hooks = tapable(this.tapableHooks);
    private config: Partial<RiverConfig> = {}
    private ready = false
    constructor(config: Partial<RiverConfig>) {
        this.config = config
       this.initTapDefaultHooks()
        //触发ConfigManager的整个初始化流程
        this.hooks.init.callSync(config)
    }

    //初始化整个默认hook的挂载流程
    initTapDefaultHooks = () => {
        this.hooks.init.tapSync(() => {
            //@ts-ignore
            this.applyBasedDefaultConfig({}, this.config)
            this.hooks.beforeReady.callSync(this.config)
        })
        this.hooks.beforeReady.tapSync(() => {
            this.ready = true
            this.hooks.ready.callSync(this.config)
        })
    }


    applyBasedDefaultConfig = (baseConfig: RiverConfig, customConfig: RiverConfig) => {
        //这里将默认配置合并到config中，
        //比如jserror的各种配置没给，那我给他变成正常的格式，给他默认值
        // function mergeConfig(defaultConfig: RiverConfig, customConfig: RiverConfig) {
        //     for (let key in defaultConfig) {
        //         let typedKey = key as keyof RiverConfig
        //         if (customConfig[typedKey] === undefined) {
        //             customConfig[typedKey] = defaultConfig[typedKey]
        //         } else if (typeof customConfig[typedKey] === 'object') {
        //             mergeConfig(defaultConfig[typedKey], customConfig[typedKey])
        //         }
        //     }
        // }

        // this.hooks.beforeApplyDefaultConfig.callSync()
        // return mergeConfig(baseConfig, customConfig)
        
      return customConfig
    }

    getMonitorConfig = (): Monitor.MonitorConfig => {
        //关于Monitor的配置基本就是要对哪些数据进行监控收集
        //每个监控类型的配置可能也是个对象，里面有更详细的配置选项，比如pv，uv；jserror还是资源error
        return {
            error: this.config.monitor!.error,
            performance: this.config.monitor!.performance,
            // userAction: this.config.monitor!.userAction,
            pageView: this.config.monitor!.pageView
        }
    }

    getBuilderConfig = (): Builder.BuilderConfig => {
        return this.config.builder!
    }

    getSenderConfig = (): Sender.SenderConfig => {
        return this.config.sender!
    }

    onReady = (callback: Function) => {
        if (!this.ready) {
            this.hooks.ready.tapSync(() => {
                callback()
            })
            throw new Error('请在正常的生命周期内调用onReady方法');
        }
        callback()
    }
}

export default ConfigManager