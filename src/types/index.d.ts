import { Plugin } from "./types/Plugin";
export type ReporterMessage = Monitor.RawMonitorMessageData & {
  reportTimeStamp: number;
  userId: string;
  traceId: string;
  userAgent: Partial<UAParser.IResult>;
};

export type RiverConfig = {
  plugins: Plugin[];
  monitor: Monitor.MonitorConfig;
  builder: Builder.BuilderConfig;
  sender: Sender.SenderConfig;
};