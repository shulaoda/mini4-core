import { depends, GLOBAL_MODULE, pending, updates } from '../constants';

export class DelayModule {
  public readonly value: string | symbol;

  constructor(value: string | symbol) {
    this.value = value;
  }
}

export function delayModule(target: string | symbol) {
  return new DelayModule(target);
}

export function triggerEffects(target: Function): void | Promise<void> {
  const module = depends.get(target);

  // 自动执行完毕
  if (!pending.has(module)) return;

  // 前置准备工作
  let premise: Promise<any>[] | undefined;
  if (depends.has(GLOBAL_MODULE)) {
    const modules: Set<Function> = depends.get(GLOBAL_MODULE);

    if (!modules.has(target)) {
      modules.forEach(module => {
        const task = triggerEffects(module);

        if (task) {
          (premise || (premise = [])).push(
            task.then(() => {
              modules.delete(module);

              if (!modules.size) depends.delete(GLOBAL_MODULE);
            })
          );
        }
      });
    }
  }

  // 初始化更新
  let t = pending.get(module);
  if (!t) {
    const effects = updates.get(target);

    if (effects) {
      pending.set(module, (t = new Map()));

      const temp = Array.from(effects);
      temp.sort((a, b) => {
        return b[1] - a[1];
      });

      for (const [value] of temp) {
        t.set(value, value);
      }
    }
  }

  // 没有队列任务
  if (!t) return;

  // 生成任务队列
  async function createTasks(): Promise<void> {
    // 构建任务队列
    const tasks: Promise<any>[] = [];
    t?.forEach((value, key, thisMap) => {
      if (key === value) {
        const task = Promise.resolve(value.apply(module))
          .then(() => {
            thisMap.delete(key);
          })
          .catch(err => {
            thisMap.set(key, key);
            throw err;
          });

        thisMap.set(key, task);
        tasks.push(task);
        return;
      }

      tasks.push(value as Promise<any>);
    });

    await Promise.all(tasks);
    pending.delete(module);
  }

  // 是否存在前置任务
  return premise
    ? Promise.all(premise).then(() => {
        return createTasks();
      })
    : createTasks();
}
