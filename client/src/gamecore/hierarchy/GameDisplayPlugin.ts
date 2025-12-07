/**
 * 游戏显示插件接口
 * 用于将不同游戏的UI逻辑与通用GameTableView解耦
 */

export interface GameDisplayPluginProps {
  tableClient: any;
  isMyTable: boolean;
  onLeaveTable: () => void;
}

export interface GameDisplayPlugin {
  /**
   * 游戏类型标识
   */
  gameType: string;

  /**
   * React组件 - 返回游戏显示界面
   */
  Component: React.ComponentType<GameDisplayPluginProps>;

  /**
   * 验证gameClient是否包含此游戏所需的方法
   */
  canHandle: (gameClient: any) => boolean;
}

/**
 * 全局游戏显示插件注册表
 */
const gameDisplayPlugins: Map<string, GameDisplayPlugin> = new Map();

export function registerGameDisplayPlugin(plugin: GameDisplayPlugin) {
  gameDisplayPlugins.set(plugin.gameType, plugin);
  console.log(`[GameDisplayPlugin] Registered plugin: ${plugin.gameType}`);
}

export function getGameDisplayPlugin(gameType: string): GameDisplayPlugin | undefined {
  return gameDisplayPlugins.get(gameType);
}

export function getGameDisplayPluginForClient(gameClient: any): GameDisplayPlugin | undefined {
  // 遍历所有已注册的插件，找到第一个能处理该gameClient的
  const plugins = Array.from(gameDisplayPlugins.values());
  for (const plugin of plugins) {
    if (plugin.canHandle(gameClient)) {
      return plugin;
    }
  }
  return undefined;
}
