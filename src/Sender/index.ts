/*
* 上报器，负责将组装器组装好的信息进行对应url的上报。
* 1. 需要根据不同的上报类型，进行不同url的上报
* 2. 使用sendBeacon进行上报
*/

import { tapable } from "@/utils/tapable"
import ConfigManager from '@/ConfigManager';
import { sendBeacon } from "./sendBeacon";
import { sendImage } from "./sendImage";
import { ReporterMessage } from "@/types";
class Sender {

    private config: Sender.SenderConfig
    private hooks = tapable(['beforeSend', 'afterSend'])
    private senderInstance: typeof sendBeacon | typeof sendImage
    constructor(ConfigManager: ConfigManager) {
        this.config = ConfigManager.getSenderConfig()
        switch (this.config.strategy) {
            case 'beacon':
                this.senderInstance = sendBeacon.bind(this)
                break  
            case 'image':
                this.senderInstance = sendImage.bind(this)
                break
            default:
                this.senderInstance = sendBeacon
        }
    }

    send(ReporterMessage: ReporterMessage) { 
        this.hooks.beforeBuild.callSync(ReporterMessage)
        console.log('在上报中')

        this.senderInstance('', ReporterMessage)
        
        this.hooks.afterBuild.callSync(ReporterMessage)
    }
}

export default Sender