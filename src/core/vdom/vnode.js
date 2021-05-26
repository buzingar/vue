/* @flow */

/**
 * VNode在Vue的整个虚拟DOM过程起了什么作用呢？
 * 其实VNode的作用是相当大的。
 * 我们在视图渲染之前，把写好的template模板先编译成VNode并缓存下来，
 * 等到数据发生变化页面需要重新渲染的时候，我们把数据发生变化后生成的VNode与前一次缓存下来的VNode进行对比，
 * 找出差异，然后有差异的VNode对应的真实DOM节点就是需要重新渲染的节点，
 * 最后根据有差异的VNode创建出真实的DOM节点再插入到视图中，最终完成一次视图更新。
 */
export default class VNode {
  tag: string | void;
  data: VNodeData | void;
  children: ?Array<VNode>;
  text: string | void;
  elm: Node | void;
  ns: string | void;
  context: Component | void; // rendered in this component's scope
  key: string | number | void;
  componentOptions: VNodeComponentOptions | void; // 组件的option选项，如组件的props等
  componentInstance: Component | void; // component instance 当前组件节点对应的Vue实例
  parent: VNode | void; // component placeholder node

  // strictly internal
  raw: boolean; // contains raw HTML? (server only)
  isStatic: boolean; // hoisted static node
  isRootInsert: boolean; // necessary for enter transition check
  isComment: boolean; // empty comment placeholder?
  isCloned: boolean; // is a cloned node?
  isOnce: boolean; // is a v-once node?
  asyncFactory: Function | void; // async component factory function
  asyncMeta: Object | void;
  isAsyncPlaceholder: boolean;
  ssrContext: Object | void;
  fnContext: Component | void; // real context vm for functional nodes 函数式组件对应的Vue实例
  fnOptions: ?ComponentOptions; // for SSR caching 函数式组件的option选项
  devtoolsMeta: ?Object; // used to store functional render context for devtools
  fnScopeId: ?string; // functional scope id support

  constructor(
    tag?: string,
    data?: VNodeData,
    children?: ?Array<VNode>,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function
  ) {
    this.tag = tag;
    this.data = data;
    this.children = children;
    this.text = text;
    this.elm = elm;
    this.ns = undefined;
    this.context = context;
    this.fnContext = undefined;
    this.fnOptions = undefined;
    this.fnScopeId = undefined;
    this.key = data && data.key;
    this.componentOptions = componentOptions;
    this.componentInstance = undefined;
    this.parent = undefined;
    this.raw = false;
    this.isStatic = false;
    this.isRootInsert = true;
    this.isComment = false;
    this.isCloned = false;
    this.isOnce = false;
    this.asyncFactory = asyncFactory;
    this.asyncMeta = undefined;
    this.isAsyncPlaceholder = false;
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child(): Component | void {
    return this.componentInstance;
  }
}

/**
 * 注释节点
 * @param {*} text
 * @returns
 */
export const createEmptyVNode = (text: string = "") => {
  const node = new VNode();
  node.text = text; // 表示具体的注释信息
  node.isComment = true; // 用来标识一个节点是否是注释节点
  return node;
};

/**
 * 创建文本节点
 * @param {*} val
 * @returns
 */
export function createTextVNode(val: string | number) {
  // 表示具体的文本信息
  // (tag?: string, data?: VNodeData, children?: ?Array<VNode>, text?: string,...)
  return new VNode(undefined, undefined, undefined, String(val));
}

// optimized shallow clone 优化浅克隆
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
// 用于静态节点和槽节点，当DOM操作依赖于它们的elm引用时，克隆它们可以避免错误，因为它们可以在多个渲染中重用。
// 克隆节点就是把一个已经存在的节点复制一份出来，它主要是为了做模板编译优化时使用
export function cloneVNode(vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    // #7975
    // clone children array to avoid mutating original in case of cloning
    // a child.
    vnode.children && vnode.children.slice(),
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  );
  cloned.ns = vnode.ns;
  cloned.isStatic = vnode.isStatic;
  cloned.key = vnode.key;
  cloned.isComment = vnode.isComment;
  cloned.fnContext = vnode.fnContext;
  cloned.fnOptions = vnode.fnOptions;
  cloned.fnScopeId = vnode.fnScopeId;
  cloned.asyncMeta = vnode.asyncMeta;
  cloned.isCloned = true; // 唯一的不同就是克隆得到的节点isCloned为true
  return cloned;
}
