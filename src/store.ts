import React from 'react';
import { produce } from 'immer';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';

interface StoreApi<State> {
  subscribe: (onStoreChange: () => void) => () => void;
  getState: () => State;
  getInitialState: () => State;
}

function structuredClone<T>(obj: T, clonedObjects = new WeakMap()): T {
  // 如果是基本类型或 null，则直接返回
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  // 如果已经克隆过该对象，则直接返回克隆后的对象
  if (clonedObjects.has(obj)) {
    return clonedObjects.get(obj);
  }

  // 创建一个新的对象或数组
  const newObj: any = Array.isArray(obj) ? [] : {};

  // 将该对象添加到已克隆对象的 Map 中
  clonedObjects.set(obj, newObj);

  // 递归地克隆对象的属性
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) {
      newObj[key] = structuredClone(obj[key], clonedObjects);
    }
  }

  return newObj;
}

function useStore<State, StateSlice>(
  api: StoreApi<State>,
  selector?: (state: State) => StateSlice,
  isEqualFn?: (oldState: StateSlice, newState: StateSlice) => boolean
) {
  if (typeof selector === 'function') {
    return useSyncExternalStoreWithSelector<State, StateSlice>(
      api.subscribe,
      api.getState,
      api.getInitialState,
      selector,
      isEqualFn
    );
  }

  return React.useSyncExternalStore(api.subscribe, api.getState, api.getInitialState);
}

type Consumer<State> = (oldState: State, newState: State) => void;

export interface UseStore<State> {
  (): State;
  <U>(selector: (state: State) => U): U;
  <U>(selector: (state: State) => U, equalityFn: (a: U, b: U) => boolean): U;
  peek: () => State;
  patch: (value: Partial<State> | ((state: State) => void | State)) => void;
  restore: () => void;
}

export function definePeach<State extends object = any>(rawState: State): UseStore<State> {
  const initialState: State = rawState;
  const consumers: Set<Consumer<State>> = new Set();

  let state = structuredClone(initialState);

  const restore = () => (state = initialState);

  const setState: Consumer<State> = (value: Partial<State> | ((state: State) => void | State)) => {
    let nextState: State;

    if (typeof value === 'function') {
      const recipe = (draftState: State) => {
        return value(draftState);
      };

      nextState = produce(state, recipe);
    } else {
      nextState = Object.assign({}, state, value);
    }

    if (!Object.is(state, nextState)) {
      const prevState = state;

      state = nextState;
      consumers.forEach(update => {
        update(prevState, nextState);
      });
    }
  };

  const getState = () => state;

  const getInitialState = () => initialState;

  const subscribe = (onStoreChange: () => void) => {
    consumers.add(onStoreChange);

    return () => {
      consumers.delete(onStoreChange);
    };
  };

  const api = { subscribe, getState, getInitialState };
  const store = useStore.bind(null, api);

  Object.assign(store, { peek: getState, patch: setState, restore });

  return store as UseStore<State>;
}
