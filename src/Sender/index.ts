/*
 * 上报器，负责将组装器组装好的信息进行对应url的上报。
 * 1. 需要根据不同的上报类型，进行不同url的上报
 * 2. 使用sendBeacon进行上报
 */

import { tapable } from "@/utils/tapable";
import ConfigManager from "@/ConfigManager";
import { sendBeacon } from "./sendBeacon";
import { sendImage } from "./sendImage";
import { ReporterMessage } from "@/types";
class Sender {
  private config: Sender.SenderConfig;
  private hooks = tapable(["beforeSend", "afterSend", "onError"]);
  private senderInstance: typeof sendBeacon | typeof sendImage;
  constructor(ConfigManager: ConfigManager) {
    this.config = ConfigManager.getSenderConfig();
    switch (this.config.strategy) {
      case "image":
        this.senderInstance = sendImage.bind(this);
        break;
      default:
        this.senderInstance = sendBeacon.bind(this);
    }
  }

  send(ReporterMessage: ReporterMessage) {
    try {
      this.hooks.beforeSend.callSync(ReporterMessage);
      this.senderInstance("", ReporterMessage);
      this.hooks.afterSend.callSync(ReporterMessage);
    } catch (error) {
      this.hooks.onError.callSync(error);
    }
  }
}

export default Sender;
