import mitt from 'mitt';
 
/**
 * 基于 mitt 实现类似 Tapable 的钩子系统（支持同步钩子）
 * @param hooks 钩子名称列表
 * @returns 包含所有钩子的对象，每个钩子包含 tap 和 emit 方法
 */
export function tapable<T extends string[]>(hooks: T) {
  type HookMap = {
    [K in T[number]]: {
      tapSync: (fn: (...args: any[]) => void) => void;
      emit: (...args: any[]) => void;
    };
  };
 
  const ev = mitt<Record<string, any[]>>();
 
  return hooks.reduce((acc, hookName: T[number]) => {
    acc[hookName] = {
      tapSync: (fn: Function) => ev.on(hookName, (args) => fn(...args)),
      emit: (...args: any[]) => ev.emit(hookName, args),
    };
    return acc;
  }, {} as HookMap);
}