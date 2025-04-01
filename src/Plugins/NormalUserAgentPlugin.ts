/**
 * @desc 用户设备信息插件，通过此插件可获取用户设备信息，作用在Builder生命周期，将设备信息与RawMessage组装
 * @param Builder 构建器
 */
export function NormalUserAgentPlugin(Builder: any) {
    Builder.hooks.ready.tapSync(() => {
    console.log("NormalUserAgentPlugin ready");
  });
}

NormalUserAgentPlugin.type = "Builder";