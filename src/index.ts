import { depends, GLOBAL_MODULE } from './constants';

/**
 *  梦开始的地方
 *
 *  思路：
 *  无论从哪个页面进入，都会触发Mini4的构造函数
 *  在进入到具体页面后，页面中使用useModule注入依赖的模块
 *  比如说首页会导致主模块的注入，获取首页相关数据并导致数据层的变动
 *  首页视图层中使用的Store Hooks监听到了数据层的数据变化，引发页面重新渲染
 *
 *  【注意】
 *  模块初始化的逻辑分散在具体的模块业务文件夹中
 *  模块数据的变动都会反映到Redux层中
 *  而Redux的数据变化会被组件中的hook订阅
 *  由于Redux和ui框架完全解耦，所以理论上可以把React换成任何框架（只需要重新将redux和ui框架连接起来）
 *
 *  【对维护的收益】
 *  如果页面不按照预期运行，那么先查看数据层中模块数据是否正常
 *  如果数据不正常，那么可能是页面逻辑出现了问题，只需要前往具体业务的module.ts逻辑中查看纯JS逻辑
 *
 *  页面本质上是基于渲染层的产物，所以支持React的hook以及Taro的相关Api
 *  接口适配层负责封装请求相关的api
 */
export class Mini4 {
  // private id: string | undefined;

  // get traceId() {
  //   return (
  //     this.id ||
  //     (this.id =
  //       Date.now().toString(16) +
  //       Math.floor((1 + Math.random()) * 0x10000)
  //         .toString(16)
  //         .substring(1))
  //   );
  // }

  constructor(modules?: Function[]) {
    // 设置全局模块
    if (modules) {
      depends.set(GLOBAL_MODULE, new Set(modules));
    }
  }
}

export * from './utils';
export * from './hooks';
export * from './decorator';
