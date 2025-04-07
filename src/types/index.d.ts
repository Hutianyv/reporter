export type pluginName = "monitor" | "builder" | "configManager" | "sender";

export type ReporterMessage = Monitor.RawMonitorMessageData & {
  reportTimeStamp: number;
  userId: string;
  traceId: string;
  info: {
    timeStamp: string;
    userAgent: Partial<UAParser.IResult>;
  };
};
