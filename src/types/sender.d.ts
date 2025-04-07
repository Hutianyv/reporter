declare namespace Sender {
    export interface SenderConfig {
        strategy: 'beacon' | 'image';
        maxRetry: number;
    }
}