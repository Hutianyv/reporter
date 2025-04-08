/**
* 配置管理器，负责配置逻辑，比如合并初始配置和用户配置、拉取远端配置等功能。
* 一般需要传入默认配置，支持用户手动配置，当配置完成时， ConfigManager 会变更 ready 状态，所以它也支持被订阅，以便当 ready 时或者配置变更时通知到订阅方。
*/
import { tapable } from "@/utils/tapable";
import { baseConfig } from "./baseConfig";

class ConfigManager {
    private tapableHooks = ['init', 'beforeApplyDefaultConfig', 'beforeApplyPlugin','beforeReady']

    private hooks = tapable(this.tapableHooks);
    private config: Partial<any> = {}
    private ready = false
    constructor(config: Partial<any>) {
        this.config = config
       this.initTapDefaultHooks()
        //触发ConfigManager的整个初始化流程
        this.hooks.init.callSync()
    }

    //初始化整个默认hook的挂载流程
    initTapDefaultHooks = () => {
        this.hooks.init.tapSync(() => {
            this.applyBasedDefaultConfig(baseConfig, this.config)
            this.hooks.beforeReady.callSync()
        })
        this.hooks.beforeReady.tapSync(() => {
            this.ready = true
            this.hooks.ready.callSync()
        })
    }


    applyBasedDefaultConfig = (baseConfig: any,customConfig: any) => {
        //这里将默认配置合并到config中，
        //比如jserror的各种配置没给，那我给他变成正常的格式，给他默认值
        function mergeConfig(defaultConfig: any, customConfig: any) {
            for (let key in defaultConfig) {
                if (customConfig[key] === undefined) {
                    customConfig[key] = defaultConfig[key]
                } else if (typeof customConfig[key] === 'object') {
                    mergeConfig(defaultConfig[key], customConfig[key])
                }
            }
        }

        this.hooks.beforeApplyDefaultConfig.callSync()
        return mergeConfig(baseConfig, customConfig)
      
    }

    getMonitorConfig = () => {
        //关于Monitor的配置基本就是要对哪些数据进行监控收集
        //每个监控类型的配置可能也是个对象，里面有更详细的配置选项，比如pv，uv；jserror还是资源error
        return {
            error: this.config.error,
            performance: this.config.performance,
            userAction: this.config.userAction,
            userData: this.config.userData,
            pageView: this.config.pageView
        }
    }

    getBuilderConfig = (): any => {
        return {
           
        }
    }

    getSenderConfig = (): any => {
        return {
            
        }
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