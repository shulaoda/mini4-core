/**
 * Module Constants
 */
export const GLOBAL_MODULE = Symbol('global_module');
export const depends: Map<string | symbol | Function, any> = new Map();
export const updates: WeakMap<Function, Map<Function, number>> = new WeakMap();
export const pending: WeakMap<object, null | Map<Function, Function | Promise<any>>> = new WeakMap();

/**
 * Request Constants
 * @hooks 这是 Mini Request Hack-Time Function
 * @requestQueue 这里存放的是 Request Task (common | microTask)
 */
export const BASE_URL: Record<number | string, Function> = {};
export const request_hooks: Record<number | string, Function> = {};
