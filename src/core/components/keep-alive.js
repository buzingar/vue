/* @flow */

import { isRegExp, remove } from "shared/util";
import { getFirstComponentChild } from "core/vdom/helpers/index";

type VNodeCache = { [key: string]: ?VNode };

function getComponentName(opts: ?VNodeComponentOptions): ?string {
  return opts && (opts.Ctor.options.name || opts.tag);
}

/**
 * 是否匹配
 * @param {*} pattern 制定正则
 * @param {*} name 组件名称
 * @returns
 */
function matches(
  pattern: string | RegExp | Array<string>,
  name: string
): boolean {
  if (Array.isArray(pattern)) {
    return pattern.indexOf(name) > -1;
  } else if (typeof pattern === "string") {
    return pattern.split(",").indexOf(name) > -1;
  } else if (isRegExp(pattern)) {
    return pattern.test(name);
  }
  /* istanbul ignore next */
  return false;
}

// 在该函数内对this.cache对象进行遍历，取出每一项的name值，用其与新的缓存规则进行匹配，
// 如果匹配不上，则表示在新的缓存规则下该组件已经不需要被缓存，
// 则调用pruneCacheEntry函数将这个已经不需要缓存的组件实例先销毁掉，
// 然后再将其从this.cache对象中剔除。
// pruneCache(this, (name) => matches(val, name))
function pruneCache(keepAliveInstance: any, filter: Function) {
  const { cache, keys, _vnode } = keepAliveInstance;
  // cache是一个object，遍历得到key
  for (const key in cache) {
    const cachedNode: ?VNode = cache[key]; // cache[key] 是value，及缓存的node
    if (cachedNode) {
      // 如果存在缓存的node，获取缓存节点的name或tag
      const name: ?string = getComponentName(cachedNode.componentOptions);
      // 未匹配，返回false
      if (name && !filter(name)) {
        pruneCacheEntry(cache, key, keys, _vnode);
      }
    }
  }
}

// prune 删除；减少
function pruneCacheEntry(
  cache: VNodeCache,
  key: string,
  keys: Array<string>,
  current?: VNode
) {
  const cached = cache[key];
  // 判断当前没有处于被渲染状态的组件，将其销毁
  if (cached && (!current || cached.tag !== current.tag)) {
    cached.componentInstance.$destroy();
  }
  cache[key] = null;
  remove(keys, key);
}

const patternTypes: Array<Function> = [String, RegExp, Array];

/**
 * <keep-alive>是Vue中内置的一个抽象组件，它自身不会渲染一个 DOM 元素，也不会出现在父组件链中。
 * 当它包裹动态组件时，会缓存不活动的组件实例，而不是销毁它们。
 * 这样做可以保留组件的状态或避免多次重新渲染，以提高页面性能。
 */
/*
this: {
  name: string;
  abstract: boolean;
  props: {
      include: Function[];
      exclude: Function[];
      max: (StringConstructor | NumberConstructor)[];
  };
  created(): void;
  destroyed(): void;
  mounted(): void;
  render(): any;
}
*/
export default {
  name: "keep-alive",
  abstract: true,

  // 在props选项内接收传进来的三个属性：include、exclude、max
  // include 和 exclude 允许组件有条件地缓存
  // 二者都可以用逗号分隔字符串、正则表达式或一个数组来表示
  props: {
    include: patternTypes, // include - 字符串或正则表达式。只有名称匹配的组件会被缓存。
    exclude: patternTypes, // exclude - 字符串或正则表达式。任何名称匹配的组件都不会被缓存。
    max: [String, Number], // max - 数字。最多可以缓存多少组件实例。当我们缓存的组件很多的时候，会比较占用内存，用这个属性做限制。
  },

  // 在 created 钩子函数里定义并初始化了两个属性： this.cache 和 this.keys。
  created() {
    // this.cache是一个对象，用来存储需要缓存的组件
    this.cache = Object.create(null); // {}
    // this.keys是一个数组，用来存储每个需要缓存的组件的key，即对应this.cache对象中的键值。
    this.keys = [];
  },

  // 当<keep-alive>组件被销毁时，此时会调用destroyed钩子函数
  destroyed() {
    // 在该钩子函数里会遍历this.cache对象，然后将那些被缓存的并且当前没有处于被渲染状态的组件都销毁掉并将其从this.cache对象中剔除
    for (const key in this.cache) {
      // pruneCacheEntry函数，用于销毁组件实例
      pruneCacheEntry(this.cache, key, this.keys);
    }
  },

  // 在mounted钩子函数中观测 include 和 exclude 的变化
  // 如果include 或exclude 发生了变化，即表示定义需要缓存的组件的规则或者不需要缓存的组件的规则发生了变化，那么就执行pruneCache函数
  mounted() {
    // val:patternTypes(string,array,regExp)
    this.$watch("include", (val) => {
      pruneCache(this, (name) => matches(val, name));
    });
    this.$watch("exclude", (val) => {
      pruneCache(this, (name) => !matches(val, name));
    });
  },

  // 函数式组件
  render() {
    // <keep-alive> 只处理第一个子元素，所以一般和它搭配使用的有 component 动态组件
    // 或者是 router-view 获取默认插槽中的第一个组件节点
    const slot = this.$slots.default;
    const vnode: VNode = getFirstComponentChild(slot);
    // 获取该组件节点的componentOptions
    const componentOptions: ?VNodeComponentOptions =
      vnode && vnode.componentOptions;
    if (componentOptions) {
      // check pattern
      // 获取该组件节点的名称，优先获取组件的name字段，如果name不存在则获取组件的tag
      const name: ?string = getComponentName(componentOptions);
      const { include, exclude } = this;
      // 然后用组件名称跟 include、exclude 中的匹配规则去匹配
      // 如果name不在inlcude中或者存在于exlude中则表示不缓存，直接返回vnode
      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        return vnode;
      }

      const { cache, keys } = this;
      // 获取组件的key
      const key: ?string =
        vnode.key == null
          ? // same constructor may get registered as different local components
            // so cid alone is not enough (#3269)
            componentOptions.Ctor.cid +
            (componentOptions.tag ? `::${componentOptions.tag}` : "")
          : vnode.key;
      // 如果命中缓存，则直接从缓存中拿 vnode 的组件实例
      if (cache[key]) {
        vnode.componentInstance = cache[key].componentInstance;
        // make current key freshest
        // 缓存淘汰策略，调整该组件key的顺序，将其从原来的地方删掉并重新放在最后一个
        // LRU Least Recently Used 最近最少使用，最常使用放在keys最后
        remove(keys, key);
        keys.push(key);
      } else {
        // 如果没有命中缓存，则将其设置进缓存，添加缓存要注意是否设置max属性
        cache[key] = vnode;
        keys.push(key);
        // prune oldest entry
        // 如果配置了max并且缓存的长度超过了this.max，则从缓存中删除第一个
        if (this.max && keys.length > parseInt(this.max)) {
          // 删除第一个，即最少使用的那个
          pruneCacheEntry(cache, keys[0], keys, this._vnode);
        }
      }

      // 最后设置keepAlive标记位
      vnode.data.keepAlive = true;
    }
    return vnode || (slot && slot[0]);
  },
};

/*
缓存淘汰策略-LRU
LRU（Least recently used，最近最少使用）算法根据数据的历史访问记录来进行淘汰数据，其核心思想是“如果数据最近被访问过，那么将来被访问的几率也更高”。
1. 将新数据从尾部插入到this.keys中；
2. 每当缓存命中（即缓存数据被访问），则将数据移到this.keys的尾部；
3. 当this.keys满的时候，将头部的数据丢弃；
LRU的核心思想是如果数据最近被访问过，那么将来被访问的几率也更高，所以我们将命中缓存的组件key重新插入到this.keys的尾部，
这样一来，this.keys中越往头部的数据即将来被访问几率越低，
所以当缓存数量达到最大值时，我们就删除将来被访问几率最低的数据，即this.keys中第一个缓存的组件。
这也就之前加粗强调的已缓存组件中最久没有被访问的实例会被销毁掉的原因所在。
*/
