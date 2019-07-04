declare module '@babel/helper-plugin-utils' {
  import { PluginObj, ConfigAPI } from '@babel/core'

  type Plugin = (api: ConfigAPI, options: any, dirname: string) => PluginObj

  export function declare(builder: Plugin): Plugin
}
