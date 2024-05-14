import { depends, pending } from '../constants';
import { triggerEffects } from '../utils';

export function useModule<T extends new (...args: any) => any>(target: T): InstanceType<T> {
  const module = depends.get(target);

  // 自动触发更新
  if (pending.get(module) === null) {
    triggerEffects(target);
  }

  return module;
}
