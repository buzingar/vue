/* @flow */

import Dep from "./dep";
import VNode from "../vdom/vnode";
import { arrayMethods } from "./array";
import {
  def, // src/core/util/lang.js
  warn,
  hasOwn,
  hasProto, // src/core/util/env.js
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering,
} from "../util/index";

// Object.getOwnPropertyNames()方法返回一个由指定对象的所有自身属性的属性名（包括不可枚举属性但不包括Symbol值作为名称的属性）组成的数组
const arrayKeys = Object.getOwnPropertyNames(arrayMethods);

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true;

export function toggleObserving(value: boolean) {
  shouldObserve = value;
}

/**
 * 其整个流程大致如下：
 * 1. Data通过observer转换成了getter/setter的形式来追踪变化。
 * 2. 当外界通过Watcher读取数据时，会触发getter从而将Watcher添加到依赖中。
 * 3. 当数据发生了变化时，会触发setter，从而向Dep中的依赖（即Watcher）发送通知。
 * 4. Watcher接收到通知后，会向外界发送通知，变化通知到外界后可能会触发视图更新，
 * 也有可能触发用户的某个回调函数等。
 */

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 * Observer类会通过递归的方式把一个对象的所有属性都转化成可观测对象
 * 只要我们将一个object传到observer中，那么这个object就会变成可观测的、响应式的object。
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor(value: any) {
    this.value = value;
    this.dep = new Dep();
    this.vmCount = 0;
    /* 
    给value新增一个__ob__属性，值为该value的Observer实例，
    相当于为value打上标记，表示它已经被转化成响应式了，避免重复操作
    def(obj, key, val, enumerable) -> Object.defineProperty(obj, key, {
      value: val,
      enumerable: !!enumerable,
      writable: true,
      configurable: true
    })
    */
    def(value, "__ob__", this);
    if (Array.isArray(value)) {
      // 能力检测：判断__proto__是否可用，因为有的浏览器不支持该属性
      // '__proto__' in {}
      if (hasProto) {
        // 把拦截器挂载到数组实例与Array.prototype之间，这样拦截器才能够生效。
        // 把数据的__proto__属性设置为拦截器arrayMethods即可
        // value.__proto__ = arrayMethods
        protoAugment(value, arrayMethods);
      } else {
        // 如果不支持，则调用copyAugment函数把拦截器中重写的7个方法循环加入到value上。
        // def(value, arrayKeys[i], arrayMethods[arrayKeys[i]])
        copyAugment(value, arrayMethods, arrayKeys);
      }
      // observe(value[i])
      this.observeArray(value);
    } else {
      // 只有object类型的数据才会调用walk将每一个属性转换成getter/setter的形式来侦测变化。
      this.walk(value);
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 遍历所有属性并将它们转换为getter/setter。仅当值类型为Object时才应调用此方法。
   */
  walk(obj: Object) {
    /*
    const obj = {a:'1',b:'2'};
    Object.keys(obj);
    // ["a", "b"] 对象里名的数组
    */
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      // (obj, key)
      defineReactive(obj, keys[i]);
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray(items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 * 通过使用__proto__拦截原型链来增加目标对象或数组
 */
function protoAugment(target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src;
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 * 通过定义隐藏属性来扩充目标对象或数组。
 */
/* istanbul ignore next */
function copyAugment(target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    def(target, key, src[key]);
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 *
 * 尝试为一个值创建一个观察者实例，如果被成功观察到，则返回新的观察者，
 * 如果该值已经有一个观察者，则返回现有的观察者。
 */
export function observe(value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return;
  }
  let ob: Observer | void;
  if (hasOwn(value, "__ob__") && value.__ob__ instanceof Observer) {
    ob = value.__ob__;
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value);
  }
  if (asRootData && ob) {
    ob.vmCount++;
  }
  return ob;
}

/**
 * Define a reactive property on an Object.
 * 使一个对象转化成可观测对象
 */
export function defineReactive(
  obj: Object, // obj 对象
  key: string, // key 对象的key
  val: any, // val 对象的某个key的值
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep();

  // Object.getOwnPropertyDescriptor() 方法返回指定对象上一个自有属性对应的属性描述符。
  const property = Object.getOwnPropertyDescriptor(obj, key);
  if (property && property.configurable === false) {
    return;
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get;
  const setter = property && property.set;
  // 如果只传了obj和key，那么val = obj[key]
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key];
  }

  let childOb = !shallow && observe(val);
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;
      if (Dep.target) {
        // 在getter中收集依赖
        dep.depend();
        if (childOb) {
          childOb.dep.depend();
          if (Array.isArray(value)) {
            dependArray(value);
          }
        }
      }
      return value;
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val;
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return;
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== "production" && customSetter) {
        customSetter();
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return;
      if (setter) {
        setter.call(obj, newVal);
      } else {
        val = newVal;
      }
      childOb = !shallow && observe(newVal);
      // 在setter中通知依赖更新
      dep.notify();
    },
  });
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 * 在对象上设置一个属性。添加新属性，如果属性不存在，则触发更改通知。
 *
 * 不足之处：
 * 虽然我们通过Object.defineProperty方法实现了对object数据的可观测，
 * 但是这个方法仅仅只能观测到object数据的取值及设置值，
 * 当我们向object数据里添加一对新的key/value或删除一对已有的key/value时，它是无法观测到的，
 * 导致当我们对object数据添加或删除值时，无法通知依赖，无法驱动视图进行响应式更新。
 *
 * 解决方案：
 * 为了解决这一问题，Vue增加了两个全局API:Vue.set和Vue.delete
 */
export function set(target: Array<any> | Object, key: any, val: any): any {
  if (
    process.env.NODE_ENV !== "production" &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(
      `Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`
    );
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    return val;
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val;
    return val;
  }
  const ob = (target: any).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== "production" &&
      warn(
        "Avoid adding reactive properties to a Vue instance or its root $data " +
          "at runtime - declare it upfront in the data option."
      );
    return val;
  }
  if (!ob) {
    target[key] = val;
    return val;
  }
  defineReactive(ob.value, key, val);
  ob.dep.notify();
  return val;
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del(target: Array<any> | Object, key: any) {
  if (
    process.env.NODE_ENV !== "production" &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(
      `Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`
    );
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1);
    return;
  }
  const ob = (target: any).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== "production" &&
      warn(
        "Avoid deleting properties on a Vue instance or its root $data " +
          "- just set it to null."
      );
    return;
  }
  if (!hasOwn(target, key)) {
    return;
  }
  delete target[key];
  if (!ob) {
    return;
  }
  ob.dep.notify();
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray(value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i];
    e && e.__ob__ && e.__ob__.dep.depend();
    if (Array.isArray(e)) {
      dependArray(e);
    }
  }
}
