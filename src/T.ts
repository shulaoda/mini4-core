export abstract class Mini4 {
  props?: { children: any };

  protected constructor() {
    this.init();
  }

  init() {}

  render() {
    return this.props?.children;
  }
}

export * from './utils';
export * from './hooks';
export * from './request';
export * from './decorator';
