// [Issues of Cache] 以下是因为请求缓存策略导致的问题：
// 假如相同参数的同一个请求被多次触发，如何解决 adapter & update 重复无效执行
// 假如不同参数的同一个请求被多次触发，但是 adapter & update 处理同一个业务，如何解决重复无效执行
//
// 场景一：用户多次在未完成模块初始化的时候返回上一页重新进入，由于未完成模块初始化导致初始化行为被重复调用
// 如：getTimetableData().then((data) => updateTimetable(adapter(data)));
// 假如 initTimetableModule 是一个 request task，未完成的情况下多次执行都返回同一个 task（Promise），
// 由于任务未完成的原因，导致在该 task 上产生了多个不必要的 Promise 任务，都是同一个 adapter & update 操作。
//
// 场景二：用户快速切换课表学期，虽然是不同的学期参数，但是 adapter & update 最后处理完成更新的都是同一个视图，
// 理想的情况应该是只处理执行最后一个 request task 返回的数据，这样才不会造成无效的 adapter 处理和频繁无效的状态更新。
import Taro from '@tarojs/taro';

import { BASE_URL, request_hooks } from './constants';

type BaseData = { data: any; success: boolean; errCode: number; errMsg: string; traceId?: string };
type ASRBaseOptions<T = any> = string | Taro.request.Option<T> | ((...args: any[]) => ASRBaseOptions);

type BaseKeyType = keyof typeof BASE_URL;
type ASRAdditionOptions = {
  base?: BaseKeyType;
};

export enum HOOK_KEYS {
  REFRESH_USERINFO = 'r',
  UNAUTHORIZED = 'u',
  INTERCEPTOR = 'i',
  LOCAL_ERROR = 'l',
  SUCCESS = 's',
  FAILED = 'f'
}

export function injectBaseUrl<T>(url: T) {
  Object.assign(BASE_URL, url);
}

export function hook(name: string, callback: Function) {
  request_hooks[name] = callback.bind(null, request_hooks[name] || (() => {}));
}

/**
 * 处理请求信息
 * @param params
 * @param addition
 */
function handleParams(params: any, addition?: ASRAdditionOptions): Taro.request.Option {
  return Object.assign(params, {
    enableCache: true,
    header: {
      ...params?.header
    },
    url: `${BASE_URL[addition?.base || 'MAIN'] || ''}${params.url}`
  });
}

/**
 * 处理请求异常
 * @param options
 */
async function handleException(options: Taro.request.Option): Promise<any> {
  return Taro.request(options)
    .catch(reason => {
      request_hooks[HOOK_KEYS.LOCAL_ERROR]?.(reason, options);

      const { errno: errCode, errMsg } = reason;

      return {
        statusCode: -1,
        header: {},
        data: {
          errMsg,
          errCode,
          data: null,
          success: false
        }
      };
    })
    .then((value: any) => {
      // 通信是否正常，正常情况应该返回
      // data: {data, success, errCode, errMsg}
      const normal = value.data?.success || value.data?.errCode;

      // 云防护拦截等因素导致格式不一致
      // 即value.data是HTML String或者null
      if (!normal) {
        value.data = {
          data: null,
          errCode: 0,
          success: false,
          errMsg: '请求不到服务器资源'
        };
      }

      // 将traceId提取出来放到data中
      // 后端将其写在了response header里
      value.data.traceId = value.header?.Traceid || '';

      // 解析一下数据
      const {
        statusCode,
        data: { data, success, errCode, errMsg, traceId }
      } = value;

      // 数据响应成功
      if (success) {
        request_hooks[HOOK_KEYS.SUCCESS]?.(value, options);
        return data;
      }

      request_hooks[HOOK_KEYS.FAILED]?.(value, options);

      // Token错误 || 密码已经修改
      if (errCode === 5004 || errCode === 1002) {
        request_hooks[HOOK_KEYS.UNAUTHORIZED]?.(errCode);
      }

      // Token过期
      if (errCode === 5005) {
        request_hooks[HOOK_KEYS.REFRESH_USERINFO]?.(options);
      }

      throw { errMsg, errCode, statusCode, traceId };
    });
}

/**
 * ASR请求触发器
 * @param args
 */
export function triggerASR(this: any, ...args: any[]): any {
  let { options: temp, handler, addition } = this;

  // 初始化当前请求缓存变量和请求选项参数
  if (typeof temp === 'function') {
    temp = temp(...args);
  }

  if (typeof temp === 'string') {
    temp = { url: temp };
  }

  // 处理得到请求参数
  const options = (request_hooks[HOOK_KEYS.INTERCEPTOR] || handleParams)(temp, addition);

  return handleException(options).then((data: BaseData) => handler?.(data) || data);
}

/**
 * 创建和管理ASR并返回ASR触发器
 * @param options
 * @param args
 */
export const createASR = <T = any, U extends ASRBaseOptions<T> = ASRBaseOptions<T>, K = any>(
  options: U,
  ...args: [((data: T) => K)?, ASRAdditionOptions?] | [ASRAdditionOptions?]
): U extends (...args: any[]) => ASRBaseOptions
  ? (...args: Parameters<U>) => K extends void ? Promise<T> : K
  : () => K extends void ? Promise<T> : K => {
  // 解析 Args
  let addition: ASRAdditionOptions | undefined, handler: undefined | ((data: T) => K);

  if (args.length > 1) {
    [handler, addition] = args as [((data: T) => K)?, ASRAdditionOptions?];
  } else {
    if (typeof args[0] === 'function') {
      handler = args[0];
    } else {
      addition = args[0];
    }
  }

  // 返回触发函数
  return triggerASR.bind({
    options,
    handler: handler,
    addition: addition
  }) as any;
};

// 初始化部分 Hooks
request_hooks[HOOK_KEYS.INTERCEPTOR] = handleParams;
