import { pluginName } from "."
import ConfigManager from "@/ConfigManager";
import MainMonitor from "@/Monitor";
import Builder from "@/Builder";
import Sender from "@/Sender";

export type pluginName = "monitor" | "builder" | "configManager" | "sender";
type ApplyInstance = ConfigManager | MainMonitor | Builder | Sender
type WithPluginType<T> = T & { type: pluginName };
type FunctionPlugin = WithPluginType<(instance: ApplyInstance) => void>
type ClassInstancePlugin = WithPluginType<object & { apply: (instance: ApplyInstance) => void }>
export type Plugin = FunctionPlugin | ClassInstancePlugin

declare namespace Client {
    export interface ClientConfig {
        plugin: Array<Plugin>
    }
}