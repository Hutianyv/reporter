/*
* 收集器，主动或被动地采集特定环境下的原始数据，组装为平台无关事件。
* Monitor 有若干个，每一个 Monitor 对应一个功能
* 比如关于 JS 错误的监控是一个 Monitor，关于用户行为的监控又是另一个 Monitor
*/


/**
 * @description 主监控类
 */

// class Monitor {
//   constructor(config: Monitor.MonitorConfig){
//     this.init(config);
//   }

//   init(config: Monitor.MonitorConfig) {
//     // 初始化各种监控类
//   }

//   start() {
//     // 开始监控
//   }

//   stop() {
//     // 停止监控
//   }
// }