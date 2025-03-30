import mitt from 'mitt';
 
/**
 * 基于 mitt 实现类似 Tapable 的钩子系统（支持同步钩子）
 * @param hooks 钩子名称列表
 * @returns 包含所有钩子的对象，每个钩子包含 tap 和 emit 方法
 */
export function tapable<T extends string[]>(hooks: T) {
  type HookMap = {
    [K in T[number]]: {
      tapSync: (fn: (...args: unknown[]) => void) => void;
      //mitt本身的ev.on返回的类型就是void，这边只能这么写
      tapAsync: (fn: (...args: unknown[]) => void) => void;
      callSync: (...args: unknown[]) => void;
    };
  };
 
  const ev = mitt<Record<string, unknown[]>>();
 
  return hooks.reduce((acc, hookName: T[number]) => {
    acc[hookName] = {
      tapSync: (fn: Function) => ev.on(hookName, (args) => fn(...args)),
      tapAsync: (fn: Function) => ev.on(hookName, (...args: any[]) => {
        Promise.resolve()
          .then(() => fn(...args))
          .catch((e) => {
            console.error(e);
          })
      }),
      callSync: (...args: unknown[]) => ev.emit(hookName, args),
    };
    return acc;
  }, {} as HookMap);
}