/* @flow */

import type Watcher from "./watcher";
import { remove } from "../util/index";
import config from "../config";

let uid = 0;
/**
 * 我们把"谁用到了这个数据"称为"谁依赖了这个数据",
 * 我们给每个数据都建一个依赖数组(因为一个数据可能被多处使用)，
 * 谁依赖了这个数据(即谁用到了这个数据)我们就把谁放入这个依赖数组中，
 * 那么当这个数据发生变化的时候，我们就去它对应的依赖数组中，
 * 把每个依赖都通知一遍，告诉他们："你们依赖的数据变啦，你们该更新啦！"。
 * 这个过程就是依赖收集。
 *
 * 所谓谁用到了这个数据，其实就是谁获取了这个数据，而可观测的数据被获取时会触发getter属性，
 * 那么我们就可以在getter中收集这个依赖。
 *
 * 当这个数据变化时会触发setter属性，那么我们就可以在setter中通知依赖更新。
 *
 * 在getter中收集依赖，在setter中通知依赖更新
 */
/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * 一个dep是一个可观察对象，可以有多个指令来订阅它。
 *
 * 为每一个数据都建立一个依赖管理器，把这个数据所有的依赖都管理起来。
 *
 * 依赖管理器Dep类。
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor() {
    this.id = uid++;
    this.subs = [];
  }

  addSub(sub: Watcher) {
    this.subs.push(sub);
  }

  removeSub(sub: Watcher) {
    remove(this.subs, sub);
  }

  // 在getter里会调用dep.depend()收集依赖
  depend() {
    // Watcher
    if (Dep.target) {
      Dep.target.addDep(this);
    }
  }

  /**
   * 当数据变化时，会触发数据的setter，在setter中调用了dep.notify()方法，
   * 在dep.notify()方法中，遍历所有依赖(即watcher实例)，执行依赖的update()方法，
   * 也就是Watcher类中的update()实例方法，
   * 在update()方法中调用数据变化的更新回调函数，从而更新视图。
   */
  notify() {
    // stabilize the subscriber list first
    // 先稳定用户列表，按id排序
    const subs = this.subs.slice();
    if (process.env.NODE_ENV !== "production" && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      // subs在调度程序未排序，如果不运行异步，我们需要排序，以确保他们在正确的顺序启动
      // 若 a 小于 b，在排序后的数组中 a 应该出现在 b 之前，则返回一个小于 0 的值。
      // 若 a 等于 b，则返回 0。
      // 若 a 大于 b，则返回一个大于 0 的值。
      subs.sort((a, b) => a.id - b.id);
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update();
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 正在评估的当前目标观察者。这是全局唯一的，因为一次只能计算一个监视程序。
Dep.target = null;
const targetStack = [];

export function pushTarget(target: ?Watcher) {
  targetStack.push(target);
  Dep.target = target;
}

export function popTarget() {
  targetStack.pop();
  Dep.target = targetStack[targetStack.length - 1];
}
