/**
 * 
 * @param Builder 构建器
 */
export function NormalLocaltimePlugin(Builder: any) {
    Builder.hooks.ready.tapSync(() => {
    console.log("NormalLoggetPlugin ready");
  });
}

NormalLocaltimePlugin.type = "Builder";