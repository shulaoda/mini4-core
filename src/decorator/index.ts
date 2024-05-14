import { depends, pending, updates } from '../constants';
import { StoreApi, UseBoundStore } from '../constants/interface';
import { DelayModule, delayModule } from '../utils';

/**
 * 声明依赖模块
 * @param name
 * @returns
 */
export function Injectable(name?: string | symbol): ClassDecorator {
  return (target: any): void => {
    // 依赖模块收集
    if (!depends.has(target)) {
      let module = new target();

      if (name) {
        if (depends.has(name)) {
          throw new Error(`[Mini4 Exception] ${String(name)} has already been used.`);
        }

        depends.set(name, module);
      }

      depends.set(target, module);
    }

    // 初始化自动更新
    if (updates.has(target)) {
      pending.set(depends.get(target), null);
    }
  };
}

/**
 * 自动执行方法
 * @param priority 执行优先级（默认为 0）
 * @returns
 */
export function Auto(priority: number = 0): MethodDecorator {
  return (target: object, _propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    let effects = updates.get(target.constructor);

    if (!effects) {
      updates.set(target.constructor, (effects = new Map()));
    }

    effects.set(descriptor.value, priority);
  };
}

/**
 * 自动注入依赖
 * @param value
 * @returns
 */
export function Autowired(value?: any): PropertyDecorator {
  return (_target: object, propertyKey: string | symbol) => {
    // 属性描述器
    const descriptor: TypedPropertyDescriptor<unknown> = {
      configurable: true,
      enumerable: true
    };

    // 类型统一处理
    switch (typeof value) {
      case 'undefined':
        if (depends.has(propertyKey)) {
          value = depends.get(propertyKey);
        } else {
          value = delayModule(propertyKey);
        }

      // eslint-disable-next-line no-fallthrough
      case 'function':
        if (depends.has(value)) {
          value = depends.get(value);
        } else {
          descriptor.get = function (this: any) {
            return value();
          };

          break;
        }

      // eslint-disable-next-line no-fallthrough
      default:
        if (value instanceof DelayModule) {
          value = value.value;
          descriptor.get = function (this: any) {
            return depends.get(value);
          };
        } else {
          descriptor.value = value;
        }
    }

    return descriptor;
  };
}

/**
 * 自动注入依赖
 * @returns
 * @param store
 */
export function Zustand<T extends UseBoundStore<StoreApi<any>>>(store: T): PropertyDecorator {
  const value = new Proxy(Object.prototype, {
    get(_, p: string | symbol): any {
      if (p === 'peek') {
        return store.getState;
      }

      if (p === 'patch') {
        return store.setState;
      }

      return store(state => state[p]);
    }
  });

  return Autowired(value);
}

/**
 * 异步方法节流
 * @returns
 */
export function AsyncThrottle(): MethodDecorator {
  return (target: object, _propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    // 初始化所需参数
    let allow = true,
      func = descriptor.value,
      Target = target.constructor;

    // 修改对应的方法
    descriptor.value = async function (...args: any[]) {
      if (!allow || (allow = false)) return;

      try {
        return await func.apply(depends.get(Target) || this, args);
      } finally {
        allow = true;
      }
    };

    return descriptor;
  };
}
