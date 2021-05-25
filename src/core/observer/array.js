/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from "../util/index";

const arrayProto = Array.prototype;
// 创建一个对象作为拦截器
// Object.create()方法创建一个新对象，使用现有的对象来提供新创建的对象的__proto__
export const arrayMethods = Object.create(arrayProto);

const methodsToPatch = [
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
];

/**
 * Intercept mutating methods and emit events
 * 数组方法拦截器，多了一层代理，内部使用的还是原生的方法，代理用来发送变化通知
 *
 * 我们应该在拦截器里通知依赖，要想通知依赖，首先要能访问到依赖。
 * 要访问到依赖也不难，因为我们只要能访问到被转化成响应式的数据value即可，
 * 因为vaule上的__ob__就是其对应的Observer类实例，
 * 有了Observer类实例我们就能访问到它上面的依赖管理器，
 * 然后只需调用依赖管理器的dep.notify()方法，让它去通知依赖更新即可。
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method];
  def(arrayMethods, method, function mutator(...args) {
    const result = original.apply(this, args);
    // 在Vue中创建了一个数组方法拦截器，它拦截在数组实例与Array.prototype之间，
    // 在拦截器内重写了操作数组的一些方法，当数组实例使用操作数组方法时，
    // 其实使用的是拦截器中重写的方法，而不再使用Array.prototype上的原生方法。
    // 由于我们的拦截器是挂载到数组数据的原型上的，所以拦截器中的this就是数据value，
    // 拿到value上的Observer类实例，
    // 从而你就可以调用Observer类实例上面依赖管理器的dep.notify()方法，以达到通知依赖的目的。
    const ob = this.__ob__;
    let inserted;
    // 数组新增元素的侦测
    switch (method) {
      // 如果是push或unshift方法，那么传入参数就是新增的元素
      case "push":
      case "unshift":
        inserted = args;
        break;
      case "splice":
        // array.splice(index,howmany,item1,.....,itemX)
        // 如果是splice方法，那么传入参数列表中下标为2的就是新增的元素，item1,.....,itemX
        inserted = args.slice(2);
        break;
    }
    // 实际是 observe(inserted)
    if (inserted) ob.observeArray(inserted);
    // notify change
    ob.dep.notify();

    return result;
  });
});
