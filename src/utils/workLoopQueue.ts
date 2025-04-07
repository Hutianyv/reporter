export class WorkLoopQueue<T> {
  private queue: Set<T>;
  private isProcessing = false;
  private idleDeadline: IdleDeadline | null = null;
  private processItem: (item: T) => void;

  constructor(processItem: (item: T) => void) {
    this.queue = new Set<T>();
    this.processItem = processItem;
    this.isProcessing = false;
    this.idleDeadline = null;
  }
  enqueue(data: T) {
    this.queue.add(data);
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  private startProcessing() {
    this.isProcessing = true;
    this.scheduleIdleProcessing();
  }

  private scheduleIdleProcessing() {
    requestIdleCallback(
      (deadline) => {
        this.idleDeadline = deadline;
        this.processBatch();
      },
      { timeout: 1000 }
    );
  }

  private processBatch() {
    const startTime = performance.now();
    while (this.hasProcessingCapacity()) {
      const data = this.dequeue();
      if (!data) break;
      this.processItem(data);
      //防止单任务过长阻塞
      if (performance.now() - startTime > 5) break;
    }

    if (this.queue.size > 0) {
      this.scheduleIdleProcessing();
    } else {
      this.isProcessing = false;
    }
  }

  private hasProcessingCapacity(): boolean {
    return (
      (this.idleDeadline?.timeRemaining() ?? 0) > 0 ||
      (this.idleDeadline?.didTimeout ?? false)
    );
  }

  private dequeue(): T | undefined {
    const iterator = this.queue.values();
    const data = iterator.next().value;
    if (data) this.queue.delete(data);
    return data;
  }
}
