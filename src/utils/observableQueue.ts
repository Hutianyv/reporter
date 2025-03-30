class ObserableQueue<T> {
  private _queue: T[] = [];
  private _observers: Set<(value: T) => void>;
  constructor(initialArray = []) {
    this._queue = [...initialArray];
    this._observers = new Set();
    this._createProxy();
  }

  _createProxy() {
    const handler = {
      set: (target: T[], property: string, value: T, receiver: any) => {
        const result = Reflect.set(target, property, value, receiver);
        if (typeof property !== "symbol" && !isNaN(Number(property))) {
          this._notify(value);
        }
        return result;
      },
    };

    this._queue = new Proxy(this._queue, handler);
  }

  _notify(result: T) {
    this._observers.forEach((cb) => cb(result));
  }
  subscribe(callback: () => void) {
    this._observers.add(callback);
    return {
      unsubscribe: () => this._observers.delete(callback),
    };
  }

  get value() {
    return [...this._queue];
  }
}
