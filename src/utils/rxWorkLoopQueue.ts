import { Subject, Subscription } from 'rxjs';

export class RxQueue<T> {
  //输入流封闭在内部
  private input$ = new Subject<T>();
  //输出流暴露供外部订阅
  public output$ = new Subject<T>();
  private idleSubscription = new Subscription();
  private pendingQueue = new Set<T>();
  private isProcessing = false;

  constructor(
    private config = { 
      maxBatch: 10,
      retries: 3,
      timeout: 1000
    }
  ) {

    this.idleSubscription.add(
      this.input$.subscribe(data => {
        this.pendingQueue.add(data);
        this.scheduleIdleProcessing();
      })
    );
  }

  private scheduleIdleProcessing() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    requestIdleCallback(async (deadline) => {
      const start = performance.now();
      let processed = 0;
      
      while (
        this.pendingQueue.size > 0 &&
        (deadline.timeRemaining() > 1 || deadline.didTimeout) &&
        processed < this.config.maxBatch &&
        performance.now() - start < 5
      ) {
        const item = this.dequeue();
        if (!item) break;
          this.output$.next(item)
        processed++;
      }

      if (this.pendingQueue.size > 0) {
        this.scheduleIdleProcessing();
      }
        this.isProcessing = false;
      
    }, { timeout: this.config.timeout });
  }
/**
 * 
 * @param item 需要入队的信息
 * @description 主动向input流中push一段数据
 */
  enqueue(item: T) {
    this.input$.next(item);
  }

  private dequeue(): T | undefined {
    const iterator = this.pendingQueue.values();
    const item = iterator.next().value;
    if (item) this.pendingQueue.delete(item);
    return item;
  }

  destroy() {
    //断掉输入流，但队列中可能还有数据，所以不断输出流
    this.idleSubscription.unsubscribe();
    //存储到indexDB
    this.pendingQueue.clear();
  }
}