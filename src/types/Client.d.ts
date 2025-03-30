import { pluginName } from "."


type WithPluginType<T> = T & { type: pluginName };
type FunctionPlugin = WithPluginType<Function>
type ClassInstancePlugin = WithPluginType<object>

declare namespace Client {
    export interface ClientConfig {
        baseReportUrl: string
        plugin: Array<FunctionPlugin | ClassInstancePlugin>
    }
}