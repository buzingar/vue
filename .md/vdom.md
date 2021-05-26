# 虚拟 DOM 产生的原因以及最大的用途？

虚拟 DOM，就是用一个 JS 对象来描述一个 DOM 节点，把组成一个 DOM 节点的必要东西通过一个 JS 对象表示出来。

Vue 是数据驱动视图的，数据发生变化时视图就要随之更新，在更新视图的时候难免要操作 DOM,而操作真实 DOM 又是非常耗费性能的，替代方案就是：用 JS 的计算性能来换取操作 DOM 所消耗的性能。

更新视图必然要操作 DOM，但是我们为了性能考虑，可以尽量少去操作 DOM，通过对比数据变化前后的状态，计算出视图中哪些地方需要更新，只更新需要更新的地方，而不需要更新的地方则不需关心。

用 DOM-Diff 算法计算出需要更新的地方。对比新旧两份 VNode 并找出差异的过程就是所谓的 DOM-Diff 过程。

```typescript
class VNode {
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
    this.tag = tag; /*当前节点的标签名*/
    this.data =
      data; /*当前节点对应的对象，包含了具体的一些数据信息，是一个VNodeData类型，可以参考VNodeData类型中的数据信息*/
    this.children = children; /*当前节点的子节点，是一个数组*/
    this.text = text; /*当前节点的文本*/
    this.elm = elm; /*当前虚拟节点对应的真实dom节点*/
    this.ns = undefined; /*当前节点的名字空间*/
    this.context = context; /*当前组件节点对应的Vue实例*/
    this.fnContext = undefined; /*函数式组件对应的Vue实例*/
    this.fnOptions = undefined;
    this.fnScopeId = undefined;
    this.key = data && data.key; /*节点的key属性，被当作节点的标志，用以优化*/
    this.componentOptions = componentOptions; /*组件的option选项*/
    this.componentInstance = undefined; /*当前节点对应的组件的实例*/
    this.parent = undefined; /*当前节点的父节点*/
    this.raw =
      false; /*简而言之就是是否为原生HTML或只是普通文本，innerHTML的时候为true，textContent的时候为false*/
    this.isStatic = false; /*静态节点标志*/
    this.isRootInsert = true; /*是否作为跟节点插入*/
    this.isComment = false; /*是否为注释节点*/
    this.isCloned = false; /*是否为克隆节点*/
    this.isOnce = false; /*是否有v-once指令*/
    this.asyncFactory = asyncFactory;
    this.asyncMeta = undefined;
    this.isAsyncPlaceholder = false;
  }

  get child(): Component | void {
    return this.componentInstance;
  }
}
```

# DOM-Diff

以新的 VNode 为基准，改造旧的 oldVNode 使之成为跟新的 VNode 一样，这就是 patch 过程要干的事。

- 创建节点：新的 VNode 中有而旧的 oldVNode 中没有，就在旧的 oldVNode 中创建。
- 删除节点：新的 VNode 中没有而旧的 oldVNode 中有，就从旧的 oldVNode 中删除。
- 更新节点：新的 VNode 和旧的 oldVNode 中都有，就以新的 VNode 为准，更新旧的 oldVNode。

```javascript
function createElm(vnode, parentElm, refElm) {}
```
