type SetStateInternal<T> = {
  _(
    partial:
      | T
      | Partial<T>
      | {
          _(state: T): T | Partial<T>;
        }['_'],
    replace?: boolean | undefined
  ): void;
}['_'];

export interface StoreApi<T> {
  setState: SetStateInternal<T>;
  getState: () => T;
  getInitialState: () => T;
  subscribe: (listener: (state: T, prevState: T) => void) => () => void;
  /**
   * @deprecated Use `unsubscribe` returned by `subscribe`
   */
  destroy: () => void;
}

type ExtractState<S> = S extends {
  getState: () => infer T;
}
  ? T
  : never;

type ReadonlyStoreApi<T> = Pick<StoreApi<T>, 'getState' | 'subscribe'>;

type WithReact<S extends ReadonlyStoreApi<unknown>> = S & {
  /** @deprecated please use api.getInitialState() */
  getServerState?: () => ExtractState<S>;
};

export type UseBoundStore<S extends WithReact<ReadonlyStoreApi<unknown>>> = {
  (): ExtractState<S>;
  <U>(selector: (state: ExtractState<S>) => U): U;
  /**
   * @deprecated Use `createWithEqualityFn` from 'zustand/traditional'
   */
  <U>(selector: (state: ExtractState<S>) => U, equalityFn: (a: U, b: U) => boolean): U;
} & S;

interface Store<T extends UseBoundStore<StoreApi<any>>> {
  peek: T['getState'];
  patch: T['setState'];
}

export type StoreType<T extends UseBoundStore<StoreApi<any>>> = Store<T> &
  (T extends UseBoundStore<StoreApi<infer R>> ? R : any);
