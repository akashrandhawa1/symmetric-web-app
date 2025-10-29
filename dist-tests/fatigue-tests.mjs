var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/react/cjs/react-jsx-runtime.production.js
var require_react_jsx_runtime_production = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.production.js"(exports) {
    "use strict";
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
    var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
    function jsxProd(type, config, maybeKey) {
      var key = null;
      void 0 !== maybeKey && (key = "" + maybeKey);
      void 0 !== config.key && (key = "" + config.key);
      if ("key" in config) {
        maybeKey = {};
        for (var propName in config)
          "key" !== propName && (maybeKey[propName] = config[propName]);
      } else maybeKey = config;
      config = maybeKey.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== config ? config : null,
        props: maybeKey
      };
    }
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsx = jsxProd;
    exports.jsxs = jsxProd;
  }
});

// node_modules/react/cjs/react.production.js
var require_react_production = __commonJS({
  "node_modules/react/cjs/react.production.js"(exports) {
    "use strict";
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
    var REACT_PORTAL_TYPE = Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
    var REACT_MEMO_TYPE = Symbol.for("react.memo");
    var REACT_LAZY_TYPE = Symbol.for("react.lazy");
    var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    var ReactNoopUpdateQueue = {
      isMounted: function() {
        return false;
      },
      enqueueForceUpdate: function() {
      },
      enqueueReplaceState: function() {
      },
      enqueueSetState: function() {
      }
    };
    var assign = Object.assign;
    var emptyObject = {};
    function Component(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    Component.prototype.isReactComponent = {};
    Component.prototype.setState = function(partialState, callback) {
      if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
        throw Error(
          "takes an object of state variables to update or a function which returns an object of state variables."
        );
      this.updater.enqueueSetState(this, partialState, callback, "setState");
    };
    Component.prototype.forceUpdate = function(callback) {
      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
    };
    function ComponentDummy() {
    }
    ComponentDummy.prototype = Component.prototype;
    function PureComponent(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
    pureComponentPrototype.constructor = PureComponent;
    assign(pureComponentPrototype, Component.prototype);
    pureComponentPrototype.isPureReactComponent = true;
    var isArrayImpl = Array.isArray;
    function noop() {
    }
    var ReactSharedInternals = { H: null, A: null, T: null, S: null };
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function ReactElement(type, key, props) {
      var refProp = props.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== refProp ? refProp : null,
        props
      };
    }
    function cloneAndReplaceKey(oldElement, newKey) {
      return ReactElement(oldElement.type, newKey, oldElement.props);
    }
    function isValidElement(object) {
      return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    function escape(key) {
      var escaperLookup = { "=": "=0", ":": "=2" };
      return "$" + key.replace(/[=:]/g, function(match) {
        return escaperLookup[match];
      });
    }
    var userProvidedKeyEscapeRegex = /\/+/g;
    function getElementKey(element, index) {
      return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
    }
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
            function(fulfilledValue) {
              "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
            },
            function(error) {
              "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
            }
          )), thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
      }
      throw thenable;
    }
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;
      if ("undefined" === type || "boolean" === type) children = null;
      var invokeCallback = false;
      if (null === children) invokeCallback = true;
      else
        switch (type) {
          case "bigint":
          case "string":
          case "number":
            invokeCallback = true;
            break;
          case "object":
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
                break;
              case REACT_LAZY_TYPE:
                return invokeCallback = children._init, mapIntoArray(
                  invokeCallback(children._payload),
                  array,
                  escapedPrefix,
                  nameSoFar,
                  callback
                );
            }
        }
      if (invokeCallback)
        return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
          return c;
        })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
          callback,
          escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
            userProvidedKeyEscapeRegex,
            "$&/"
          ) + "/") + invokeCallback
        )), array.push(callback)), 1;
      invokeCallback = 0;
      var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
      if (isArrayImpl(children))
        for (var i = 0; i < children.length; i++)
          nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if (i = getIteratorFn(children), "function" === typeof i)
        for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
          nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if ("object" === type) {
        if ("function" === typeof children.then)
          return mapIntoArray(
            resolveThenable(children),
            array,
            escapedPrefix,
            nameSoFar,
            callback
          );
        array = String(children);
        throw Error(
          "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
        );
      }
      return invokeCallback;
    }
    function mapChildren(children, func, context) {
      if (null == children) return children;
      var result = [], count = 0;
      mapIntoArray(children, result, "", "", function(child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    function lazyInitializer(payload) {
      if (-1 === payload._status) {
        var ctor = payload._result;
        ctor = ctor();
        ctor.then(
          function(moduleObject) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 1, payload._result = moduleObject;
          },
          function(error) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 2, payload._result = error;
          }
        );
        -1 === payload._status && (payload._status = 0, payload._result = ctor);
      }
      if (1 === payload._status) return payload._result.default;
      throw payload._result;
    }
    var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
      if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
        var event = new window.ErrorEvent("error", {
          bubbles: true,
          cancelable: true,
          message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
          error
        });
        if (!window.dispatchEvent(event)) return;
      } else if ("object" === typeof process && "function" === typeof process.emit) {
        process.emit("uncaughtException", error);
        return;
      }
      console.error(error);
    };
    var Children = {
      map: mapChildren,
      forEach: function(children, forEachFunc, forEachContext) {
        mapChildren(
          children,
          function() {
            forEachFunc.apply(this, arguments);
          },
          forEachContext
        );
      },
      count: function(children) {
        var n = 0;
        mapChildren(children, function() {
          n++;
        });
        return n;
      },
      toArray: function(children) {
        return mapChildren(children, function(child) {
          return child;
        }) || [];
      },
      only: function(children) {
        if (!isValidElement(children))
          throw Error(
            "React.Children.only expected to receive a single React element child."
          );
        return children;
      }
    };
    exports.Activity = REACT_ACTIVITY_TYPE;
    exports.Children = Children;
    exports.Component = Component;
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.Profiler = REACT_PROFILER_TYPE;
    exports.PureComponent = PureComponent;
    exports.StrictMode = REACT_STRICT_MODE_TYPE;
    exports.Suspense = REACT_SUSPENSE_TYPE;
    exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
    exports.__COMPILER_RUNTIME = {
      __proto__: null,
      c: function(size) {
        return ReactSharedInternals.H.useMemoCache(size);
      }
    };
    exports.cache = function(fn) {
      return function() {
        return fn.apply(null, arguments);
      };
    };
    exports.cacheSignal = function() {
      return null;
    };
    exports.cloneElement = function(element, config, children) {
      if (null === element || void 0 === element)
        throw Error(
          "The argument must be a React element, but you passed " + element + "."
        );
      var props = assign({}, element.props), key = element.key;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
      var propName = arguments.length - 2;
      if (1 === propName) props.children = children;
      else if (1 < propName) {
        for (var childArray = Array(propName), i = 0; i < propName; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      return ReactElement(element.type, key, props);
    };
    exports.createContext = function(defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null
      };
      defaultValue.Provider = defaultValue;
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue
      };
      return defaultValue;
    };
    exports.createElement = function(type, config, children) {
      var propName, props = {}, key = null;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
      var childrenLength = arguments.length - 2;
      if (1 === childrenLength) props.children = children;
      else if (1 < childrenLength) {
        for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      if (type && type.defaultProps)
        for (propName in childrenLength = type.defaultProps, childrenLength)
          void 0 === props[propName] && (props[propName] = childrenLength[propName]);
      return ReactElement(type, key, props);
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(render) {
      return { $$typeof: REACT_FORWARD_REF_TYPE, render };
    };
    exports.isValidElement = isValidElement;
    exports.lazy = function(ctor) {
      return {
        $$typeof: REACT_LAZY_TYPE,
        _payload: { _status: -1, _result: ctor },
        _init: lazyInitializer
      };
    };
    exports.memo = function(type, compare) {
      return {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: void 0 === compare ? null : compare
      };
    };
    exports.startTransition = function(scope) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
        "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
      } catch (error) {
        reportGlobalError(error);
      } finally {
        null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
      }
    };
    exports.unstable_useCacheRefresh = function() {
      return ReactSharedInternals.H.useCacheRefresh();
    };
    exports.use = function(usable) {
      return ReactSharedInternals.H.use(usable);
    };
    exports.useActionState = function(action, initialState, permalink) {
      return ReactSharedInternals.H.useActionState(action, initialState, permalink);
    };
    exports.useCallback = function(callback, deps) {
      return ReactSharedInternals.H.useCallback(callback, deps);
    };
    exports.useContext = function(Context) {
      return ReactSharedInternals.H.useContext(Context);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(value, initialValue) {
      return ReactSharedInternals.H.useDeferredValue(value, initialValue);
    };
    exports.useEffect = function(create, deps) {
      return ReactSharedInternals.H.useEffect(create, deps);
    };
    exports.useEffectEvent = function(callback) {
      return ReactSharedInternals.H.useEffectEvent(callback);
    };
    exports.useId = function() {
      return ReactSharedInternals.H.useId();
    };
    exports.useImperativeHandle = function(ref, create, deps) {
      return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
    };
    exports.useInsertionEffect = function(create, deps) {
      return ReactSharedInternals.H.useInsertionEffect(create, deps);
    };
    exports.useLayoutEffect = function(create, deps) {
      return ReactSharedInternals.H.useLayoutEffect(create, deps);
    };
    exports.useMemo = function(create, deps) {
      return ReactSharedInternals.H.useMemo(create, deps);
    };
    exports.useOptimistic = function(passthrough, reducer) {
      return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
    };
    exports.useReducer = function(reducer, initialArg, init) {
      return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
    };
    exports.useRef = function(initialValue) {
      return ReactSharedInternals.H.useRef(initialValue);
    };
    exports.useState = function(initialState) {
      return ReactSharedInternals.H.useState(initialState);
    };
    exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
      return ReactSharedInternals.H.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
      );
    };
    exports.useTransition = function() {
      return ReactSharedInternals.H.useTransition();
    };
    exports.version = "19.2.0";
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    "production" !== process.env.NODE_ENV && (function() {
      function defineDeprecationWarning(methodName, info) {
        Object.defineProperty(Component.prototype, methodName, {
          get: function() {
            console.warn(
              "%s(...) is deprecated in plain JavaScript React classes. %s",
              info[0],
              info[1]
            );
          }
        });
      }
      function getIteratorFn(maybeIterable) {
        if (null === maybeIterable || "object" !== typeof maybeIterable)
          return null;
        maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
        return "function" === typeof maybeIterable ? maybeIterable : null;
      }
      function warnNoop(publicInstance, callerName) {
        publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
        var warningKey = publicInstance + "." + callerName;
        didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
          "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
          callerName,
          publicInstance
        ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
      }
      function Component(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function ComponentDummy() {
      }
      function PureComponent(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function noop() {
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function cloneAndReplaceKey(oldElement, newKey) {
        newKey = ReactElement(
          oldElement.type,
          newKey,
          oldElement.props,
          oldElement._owner,
          oldElement._debugStack,
          oldElement._debugTask
        );
        oldElement._store && (newKey._store.validated = oldElement._store.validated);
        return newKey;
      }
      function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
      }
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      function escape(key) {
        var escaperLookup = { "=": "=0", ":": "=2" };
        return "$" + key.replace(/[=:]/g, function(match) {
          return escaperLookup[match];
        });
      }
      function getElementKey(element, index) {
        return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
      }
      function resolveThenable(thenable) {
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
          default:
            switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
              function(fulfilledValue) {
                "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
              },
              function(error) {
                "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            )), thenable.status) {
              case "fulfilled":
                return thenable.value;
              case "rejected":
                throw thenable.reason;
            }
        }
        throw thenable;
      }
      function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
        var type = typeof children;
        if ("undefined" === type || "boolean" === type) children = null;
        var invokeCallback = false;
        if (null === children) invokeCallback = true;
        else
          switch (type) {
            case "bigint":
            case "string":
            case "number":
              invokeCallback = true;
              break;
            case "object":
              switch (children.$$typeof) {
                case REACT_ELEMENT_TYPE:
                case REACT_PORTAL_TYPE:
                  invokeCallback = true;
                  break;
                case REACT_LAZY_TYPE:
                  return invokeCallback = children._init, mapIntoArray(
                    invokeCallback(children._payload),
                    array,
                    escapedPrefix,
                    nameSoFar,
                    callback
                  );
              }
          }
        if (invokeCallback) {
          invokeCallback = children;
          callback = callback(invokeCallback);
          var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
          isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
            return c;
          })) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
            callback,
            escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
              userProvidedKeyEscapeRegex,
              "$&/"
            ) + "/") + childKey
          ), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
          return 1;
        }
        invokeCallback = 0;
        childKey = "" === nameSoFar ? "." : nameSoFar + ":";
        if (isArrayImpl(children))
          for (var i = 0; i < children.length; i++)
            nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if (i = getIteratorFn(children), "function" === typeof i)
          for (i === children.entries && (didWarnAboutMaps || console.warn(
            "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
          ), didWarnAboutMaps = true), children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
            nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if ("object" === type) {
          if ("function" === typeof children.then)
            return mapIntoArray(
              resolveThenable(children),
              array,
              escapedPrefix,
              nameSoFar,
              callback
            );
          array = String(children);
          throw Error(
            "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
          );
        }
        return invokeCallback;
      }
      function mapChildren(children, func, context) {
        if (null == children) return children;
        var result = [], count = 0;
        mapIntoArray(children, result, "", "", function(child) {
          return func.call(context, child, count++);
        });
        return result;
      }
      function lazyInitializer(payload) {
        if (-1 === payload._status) {
          var ioInfo = payload._ioInfo;
          null != ioInfo && (ioInfo.start = ioInfo.end = performance.now());
          ioInfo = payload._result;
          var thenable = ioInfo();
          thenable.then(
            function(moduleObject) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 1;
                payload._result = moduleObject;
                var _ioInfo = payload._ioInfo;
                null != _ioInfo && (_ioInfo.end = performance.now());
                void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
              }
            },
            function(error) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 2;
                payload._result = error;
                var _ioInfo2 = payload._ioInfo;
                null != _ioInfo2 && (_ioInfo2.end = performance.now());
                void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            }
          );
          ioInfo = payload._ioInfo;
          if (null != ioInfo) {
            ioInfo.value = thenable;
            var displayName = thenable.displayName;
            "string" === typeof displayName && (ioInfo.name = displayName);
          }
          -1 === payload._status && (payload._status = 0, payload._result = thenable);
        }
        if (1 === payload._status)
          return ioInfo = payload._result, void 0 === ioInfo && console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
            ioInfo
          ), "default" in ioInfo || console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
            ioInfo
          ), ioInfo.default;
        throw payload._result;
      }
      function resolveDispatcher() {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
        return dispatcher;
      }
      function releaseAsyncTransition() {
        ReactSharedInternals.asyncTransitions--;
      }
      function enqueueTask(task) {
        if (null === enqueueTaskImpl)
          try {
            var requireString = ("require" + Math.random()).slice(0, 7);
            enqueueTaskImpl = (module && module[requireString]).call(
              module,
              "timers"
            ).setImmediate;
          } catch (_err) {
            enqueueTaskImpl = function(callback) {
              false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
              ));
              var channel = new MessageChannel();
              channel.port1.onmessage = callback;
              channel.port2.postMessage(void 0);
            };
          }
        return enqueueTaskImpl(task);
      }
      function aggregateErrors(errors) {
        return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
      }
      function popActScope(prevActQueue, prevActScopeDepth) {
        prevActScopeDepth !== actScopeDepth - 1 && console.error(
          "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
        );
        actScopeDepth = prevActScopeDepth;
      }
      function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
        var queue = ReactSharedInternals.actQueue;
        if (null !== queue)
          if (0 !== queue.length)
            try {
              flushActQueue(queue);
              enqueueTask(function() {
                return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
              });
              return;
            } catch (error) {
              ReactSharedInternals.thrownErrors.push(error);
            }
          else ReactSharedInternals.actQueue = null;
        0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
      }
      function flushActQueue(queue) {
        if (!isFlushing) {
          isFlushing = true;
          var i = 0;
          try {
            for (; i < queue.length; i++) {
              var callback = queue[i];
              do {
                ReactSharedInternals.didUsePromise = false;
                var continuation = callback(false);
                if (null !== continuation) {
                  if (ReactSharedInternals.didUsePromise) {
                    queue[i] = callback;
                    queue.splice(0, i);
                    return;
                  }
                  callback = continuation;
                } else break;
              } while (1);
            }
            queue.length = 0;
          } catch (error) {
            queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
          } finally {
            isFlushing = false;
          }
        }
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
        isMounted: function() {
          return false;
        },
        enqueueForceUpdate: function(publicInstance) {
          warnNoop(publicInstance, "forceUpdate");
        },
        enqueueReplaceState: function(publicInstance) {
          warnNoop(publicInstance, "replaceState");
        },
        enqueueSetState: function(publicInstance) {
          warnNoop(publicInstance, "setState");
        }
      }, assign = Object.assign, emptyObject = {};
      Object.freeze(emptyObject);
      Component.prototype.isReactComponent = {};
      Component.prototype.setState = function(partialState, callback) {
        if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
          throw Error(
            "takes an object of state variables to update or a function which returns an object of state variables."
          );
        this.updater.enqueueSetState(this, partialState, callback, "setState");
      };
      Component.prototype.forceUpdate = function(callback) {
        this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
      };
      var deprecatedAPIs = {
        isMounted: [
          "isMounted",
          "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
        ],
        replaceState: [
          "replaceState",
          "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
        ]
      };
      for (fnName in deprecatedAPIs)
        deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
      ComponentDummy.prototype = Component.prototype;
      deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
      deprecatedAPIs.constructor = PureComponent;
      assign(deprecatedAPIs, Component.prototype);
      deprecatedAPIs.isPureReactComponent = true;
      var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
        H: null,
        A: null,
        T: null,
        S: null,
        actQueue: null,
        asyncTransitions: 0,
        isBatchingLegacy: false,
        didScheduleLegacyUpdate: false,
        didUsePromise: false,
        thrownErrors: [],
        getCurrentStack: null,
        recentlyCreatedOwnerStacks: 0
      }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      deprecatedAPIs = {
        react_stack_bottom_frame: function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
        deprecatedAPIs,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
        if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
          var event = new window.ErrorEvent("error", {
            bubbles: true,
            cancelable: true,
            message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
            error
          });
          if (!window.dispatchEvent(event)) return;
        } else if ("object" === typeof process && "function" === typeof process.emit) {
          process.emit("uncaughtException", error);
          return;
        }
        console.error(error);
      }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
        queueMicrotask(function() {
          return queueMicrotask(callback);
        });
      } : enqueueTask;
      deprecatedAPIs = Object.freeze({
        __proto__: null,
        c: function(size) {
          return resolveDispatcher().useMemoCache(size);
        }
      });
      var fnName = {
        map: mapChildren,
        forEach: function(children, forEachFunc, forEachContext) {
          mapChildren(
            children,
            function() {
              forEachFunc.apply(this, arguments);
            },
            forEachContext
          );
        },
        count: function(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        },
        toArray: function(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        },
        only: function(children) {
          if (!isValidElement(children))
            throw Error(
              "React.Children.only expected to receive a single React element child."
            );
          return children;
        }
      };
      exports.Activity = REACT_ACTIVITY_TYPE;
      exports.Children = fnName;
      exports.Component = Component;
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.Profiler = REACT_PROFILER_TYPE;
      exports.PureComponent = PureComponent;
      exports.StrictMode = REACT_STRICT_MODE_TYPE;
      exports.Suspense = REACT_SUSPENSE_TYPE;
      exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
      exports.__COMPILER_RUNTIME = deprecatedAPIs;
      exports.act = function(callback) {
        var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
        actScopeDepth++;
        var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
        try {
          var result = callback();
        } catch (error) {
          ReactSharedInternals.thrownErrors.push(error);
        }
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        if (null !== result && "object" === typeof result && "function" === typeof result.then) {
          var thenable = result;
          queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
            ));
          });
          return {
            then: function(resolve, reject) {
              didAwaitActCall = true;
              thenable.then(
                function(returnValue) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  if (0 === prevActScopeDepth) {
                    try {
                      flushActQueue(queue), enqueueTask(function() {
                        return recursivelyFlushAsyncActWork(
                          returnValue,
                          resolve,
                          reject
                        );
                      });
                    } catch (error$0) {
                      ReactSharedInternals.thrownErrors.push(error$0);
                    }
                    if (0 < ReactSharedInternals.thrownErrors.length) {
                      var _thrownError = aggregateErrors(
                        ReactSharedInternals.thrownErrors
                      );
                      ReactSharedInternals.thrownErrors.length = 0;
                      reject(_thrownError);
                    }
                  } else resolve(returnValue);
                },
                function(error) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                    ReactSharedInternals.thrownErrors
                  ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                }
              );
            }
          };
        }
        var returnValue$jscomp$0 = result;
        popActScope(prevActQueue, prevActScopeDepth);
        0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
          didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
            "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
          ));
        }), ReactSharedInternals.actQueue = null);
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        return {
          then: function(resolve, reject) {
            didAwaitActCall = true;
            0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
              return recursivelyFlushAsyncActWork(
                returnValue$jscomp$0,
                resolve,
                reject
              );
            })) : resolve(returnValue$jscomp$0);
          }
        };
      };
      exports.cache = function(fn) {
        return function() {
          return fn.apply(null, arguments);
        };
      };
      exports.cacheSignal = function() {
        return null;
      };
      exports.captureOwnerStack = function() {
        var getCurrentStack = ReactSharedInternals.getCurrentStack;
        return null === getCurrentStack ? null : getCurrentStack();
      };
      exports.cloneElement = function(element, config, children) {
        if (null === element || void 0 === element)
          throw Error(
            "The argument must be a React element, but you passed " + element + "."
          );
        var props = assign({}, element.props), key = element.key, owner = element._owner;
        if (null != config) {
          var JSCompiler_inline_result;
          a: {
            if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
              config,
              "ref"
            ).get) && JSCompiler_inline_result.isReactWarning) {
              JSCompiler_inline_result = false;
              break a;
            }
            JSCompiler_inline_result = void 0 !== config.ref;
          }
          JSCompiler_inline_result && (owner = getOwner());
          hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
          for (propName in config)
            !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
        }
        var propName = arguments.length - 2;
        if (1 === propName) props.children = children;
        else if (1 < propName) {
          JSCompiler_inline_result = Array(propName);
          for (var i = 0; i < propName; i++)
            JSCompiler_inline_result[i] = arguments[i + 2];
          props.children = JSCompiler_inline_result;
        }
        props = ReactElement(
          element.type,
          key,
          props,
          owner,
          element._debugStack,
          element._debugTask
        );
        for (key = 2; key < arguments.length; key++)
          validateChildKeys(arguments[key]);
        return props;
      };
      exports.createContext = function(defaultValue) {
        defaultValue = {
          $$typeof: REACT_CONTEXT_TYPE,
          _currentValue: defaultValue,
          _currentValue2: defaultValue,
          _threadCount: 0,
          Provider: null,
          Consumer: null
        };
        defaultValue.Provider = defaultValue;
        defaultValue.Consumer = {
          $$typeof: REACT_CONSUMER_TYPE,
          _context: defaultValue
        };
        defaultValue._currentRenderer = null;
        defaultValue._currentRenderer2 = null;
        return defaultValue;
      };
      exports.createElement = function(type, config, children) {
        for (var i = 2; i < arguments.length; i++)
          validateChildKeys(arguments[i]);
        i = {};
        var key = null;
        if (null != config)
          for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
            "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
          )), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config)
            hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
        var childrenLength = arguments.length - 2;
        if (1 === childrenLength) i.children = children;
        else if (1 < childrenLength) {
          for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
            childArray[_i] = arguments[_i + 2];
          Object.freeze && Object.freeze(childArray);
          i.children = childArray;
        }
        if (type && type.defaultProps)
          for (propName in childrenLength = type.defaultProps, childrenLength)
            void 0 === i[propName] && (i[propName] = childrenLength[propName]);
        key && defineKeyPropWarningGetter(
          i,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return ReactElement(
          type,
          key,
          i,
          getOwner(),
          propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports.createRef = function() {
        var refObject = { current: null };
        Object.seal(refObject);
        return refObject;
      };
      exports.forwardRef = function(render) {
        null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error(
          "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
        ) : "function" !== typeof render ? console.error(
          "forwardRef requires a render function but was given %s.",
          null === render ? "null" : typeof render
        ) : 0 !== render.length && 2 !== render.length && console.error(
          "forwardRef render functions accept exactly two parameters: props and ref. %s",
          1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
        );
        null != render && null != render.defaultProps && console.error(
          "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
        );
        var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
        Object.defineProperty(elementType, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
          }
        });
        return elementType;
      };
      exports.isValidElement = isValidElement;
      exports.lazy = function(ctor) {
        ctor = { _status: -1, _result: ctor };
        var lazyType = {
          $$typeof: REACT_LAZY_TYPE,
          _payload: ctor,
          _init: lazyInitializer
        }, ioInfo = {
          name: "lazy",
          start: -1,
          end: -1,
          value: null,
          owner: null,
          debugStack: Error("react-stack-top-frame"),
          debugTask: console.createTask ? console.createTask("lazy()") : null
        };
        ctor._ioInfo = ioInfo;
        lazyType._debugInfo = [{ awaited: ioInfo }];
        return lazyType;
      };
      exports.memo = function(type, compare) {
        null == type && console.error(
          "memo: The first argument must be a component. Instead received: %s",
          null === type ? "null" : typeof type
        );
        compare = {
          $$typeof: REACT_MEMO_TYPE,
          type,
          compare: void 0 === compare ? null : compare
        };
        var ownName;
        Object.defineProperty(compare, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
          }
        });
        return compare;
      };
      exports.startTransition = function(scope) {
        var prevTransition = ReactSharedInternals.T, currentTransition = {};
        currentTransition._updatedFibers = /* @__PURE__ */ new Set();
        ReactSharedInternals.T = currentTransition;
        try {
          var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
          null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
          "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
        } catch (error) {
          reportGlobalError(error);
        } finally {
          null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
            "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
          )), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error(
            "We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."
          ), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
        }
      };
      exports.unstable_useCacheRefresh = function() {
        return resolveDispatcher().useCacheRefresh();
      };
      exports.use = function(usable) {
        return resolveDispatcher().use(usable);
      };
      exports.useActionState = function(action, initialState, permalink) {
        return resolveDispatcher().useActionState(
          action,
          initialState,
          permalink
        );
      };
      exports.useCallback = function(callback, deps) {
        return resolveDispatcher().useCallback(callback, deps);
      };
      exports.useContext = function(Context) {
        var dispatcher = resolveDispatcher();
        Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
          "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
        );
        return dispatcher.useContext(Context);
      };
      exports.useDebugValue = function(value, formatterFn) {
        return resolveDispatcher().useDebugValue(value, formatterFn);
      };
      exports.useDeferredValue = function(value, initialValue) {
        return resolveDispatcher().useDeferredValue(value, initialValue);
      };
      exports.useEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useEffect(create, deps);
      };
      exports.useEffectEvent = function(callback) {
        return resolveDispatcher().useEffectEvent(callback);
      };
      exports.useId = function() {
        return resolveDispatcher().useId();
      };
      exports.useImperativeHandle = function(ref, create, deps) {
        return resolveDispatcher().useImperativeHandle(ref, create, deps);
      };
      exports.useInsertionEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useInsertionEffect(create, deps);
      };
      exports.useLayoutEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useLayoutEffect(create, deps);
      };
      exports.useMemo = function(create, deps) {
        return resolveDispatcher().useMemo(create, deps);
      };
      exports.useOptimistic = function(passthrough, reducer) {
        return resolveDispatcher().useOptimistic(passthrough, reducer);
      };
      exports.useReducer = function(reducer, initialArg, init) {
        return resolveDispatcher().useReducer(reducer, initialArg, init);
      };
      exports.useRef = function(initialValue) {
        return resolveDispatcher().useRef(initialValue);
      };
      exports.useState = function(initialState) {
        return resolveDispatcher().useState(initialState);
      };
      exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
        return resolveDispatcher().useSyncExternalStore(
          subscribe,
          getSnapshot,
          getServerSnapshot
        );
      };
      exports.useTransition = function() {
        return resolveDispatcher().useTransition();
      };
      exports.version = "19.2.0";
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_production();
    } else {
      module.exports = require_react_development();
    }
  }
});

// node_modules/react/cjs/react-jsx-runtime.development.js
var require_react_jsx_runtime_development = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.development.js"(exports) {
    "use strict";
    "production" !== process.env.NODE_ENV && (function() {
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children)
          if (isStaticChildren)
            if (isArrayImpl(children)) {
              for (isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)
                validateChildKeys(children[isStaticChildren]);
              Object.freeze && Object.freeze(children);
            } else
              console.error(
                "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
              );
          else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
          children = getComponentNameFromType(type);
          var keys = Object.keys(config).filter(function(k) {
            return "key" !== k;
          });
          isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
          didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error(
            'A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />',
            isStaticChildren,
            children,
            keys,
            children
          ), didWarnAboutKeySpread[children + isStaticChildren] = true);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
          maybeKey = {};
          for (var propName in config)
            "key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(
          maybeKey,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        return ReactElement(
          type,
          children,
          maybeKey,
          getOwner(),
          debugStack,
          debugTask
        );
      }
      function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
      }
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      var React = require_react(), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      React = {
        react_stack_bottom_frame: function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(
        React,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutKeySpread = {};
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.jsx = function(type, config, maybeKey) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return jsxDEVImpl(
          type,
          config,
          maybeKey,
          false,
          trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports.jsxs = function(type, config, maybeKey) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return jsxDEVImpl(
          type,
          config,
          maybeKey,
          true,
          trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
    })();
  }
});

// node_modules/react/jsx-runtime.js
var require_jsx_runtime = __commonJS({
  "node_modules/react/jsx-runtime.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_jsx_runtime_production();
    } else {
      module.exports = require_react_jsx_runtime_development();
    }
  }
});

// tests/fatigueDetector.test.ts
import assert from "node:assert";

// lib/fatigue/FatigueDetector.ts
var DEFAULT_CONFIG = {
  ewmaAlpha: 0.25,
  slopeLookbackSec: 3,
  curvatureLookbackSec: 6,
  historyWindowSec: 12,
  noiseThreshold: 0.07,
  riseSlopeThreshold: 1,
  riseMinDurationSec: 3,
  plateauSlopeThreshold: 0.25,
  plateauCurvatureThreshold: 0.15,
  plateauMinDurationSec: 6,
  fallSlopeThreshold: -0.8,
  fallMinDurationSec: 3,
  mdfFallSlopeThreshold: -0.5,
  requireMdfConfirmation: true
};
var STATE_CONFIDENCE = {
  rise: 0.75,
  plateau: 0.7,
  fall: 0.8
};
var FatigueDetector = class {
  constructor(config) {
    this.history = [];
    this.state = null;
    this.stateEnteredAt = null;
    this.lastUpdateSec = null;
    this.riseAccum = 0;
    this.plateauAccum = 0;
    this.fallAccum = 0;
    this.lastSlope = null;
    this.previousSlope = null;
    this.lastDebugSlope = null;
    this.stateListeners = /* @__PURE__ */ new Set();
    this.debugListeners = /* @__PURE__ */ new Set();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  reset() {
    this.history = [];
    this.state = null;
    this.stateEnteredAt = null;
    this.lastUpdateSec = null;
    this.riseAccum = 0;
    this.plateauAccum = 0;
    this.fallAccum = 0;
    this.lastSlope = null;
    this.previousSlope = null;
    this.lastDebugSlope = null;
  }
  getState() {
    return this.state;
  }
  getTimeInState(nowSec) {
    if (this.stateEnteredAt == null) return 0;
    return Math.max(0, nowSec - this.stateEnteredAt);
  }
  onState(listener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }
  onDebug(listener) {
    this.debugListeners.add(listener);
    return () => this.debugListeners.delete(listener);
  }
  update(sample) {
    const { nowSec, rmsNorm, mdfNorm } = sample;
    const { ewmaAlpha, historyWindowSec, slopeLookbackSec, curvatureLookbackSec, noiseThreshold } = this.config;
    if (this.lastUpdateSec != null && nowSec < this.lastUpdateSec) {
      return;
    }
    this.lastUpdateSec = nowSec;
    const prevSmoothed = this.history.length > 0 ? this.history[this.history.length - 1].smoothed : rmsNorm;
    const smoothed = prevSmoothed + ewmaAlpha * (rmsNorm - prevSmoothed);
    this.history.push({ t: nowSec, value: rmsNorm, smoothed, mdf: mdfNorm ?? void 0 });
    while (this.history.length > 0 && nowSec - this.history[0].t > historyWindowSec) {
      this.history.shift();
    }
    if (this.history.length < 2) {
      return;
    }
    const slope = this.computeSlope(nowSec, slopeLookbackSec);
    const curvature = this.computeCurvature(nowSec, slopeLookbackSec, curvatureLookbackSec, slope);
    const mdfSlope = this.computeMdfSlope(nowSec);
    const referenceSmoothed = this.getSmoothedAt(nowSec - slopeLookbackSec);
    const isNoise = Math.abs(smoothed - referenceSmoothed) < noiseThreshold;
    const effectiveSlope = isNoise ? 0 : slope;
    this.updateAccumulators(nowSec, effectiveSlope, curvature);
    const nextState = this.evaluateState(nowSec, effectiveSlope, curvature, mdfSlope);
    this.emitDebug(effectiveSlope, curvature, mdfSlope);
    if (nextState && nextState !== this.state) {
      const previous = this.state;
      const tInPrev = this.stateEnteredAt != null ? nowSec - this.stateEnteredAt : 0;
      this.state = nextState;
      this.stateEnteredAt = nowSec;
      const event = {
        type: "state",
        state: nextState,
        confidence: STATE_CONFIDENCE[nextState],
        previousState: previous,
        tInPrevState: tInPrev
      };
      this.stateListeners.forEach((listener) => listener(event));
    }
  }
  emitDebug(slope, curvature, mdfSlope) {
    const payload = {
      type: "debug",
      slope,
      curvature,
      ...mdfSlope == null ? {} : { mdfSlope }
    };
    this.lastDebugSlope = slope;
    this.debugListeners.forEach((listener) => listener(payload));
  }
  computeSlope(nowSec, lookback) {
    const earlier = this.getPointAt(nowSec - lookback);
    const latest = this.history[this.history.length - 1];
    if (!earlier) return 0;
    const deltaValue = latest.smoothed - earlier.smoothed;
    const deltaTime = Math.max(1e-3, latest.t - earlier.t);
    const slope = deltaValue / deltaTime * 100;
    this.previousSlope = this.lastSlope;
    this.lastSlope = slope;
    return slope;
  }
  computeCurvature(nowSec, slopeLookback, curvatureLookback, currentSlope) {
    if (this.previousSlope == null || this.lastSlope == null) {
      return 0;
    }
    const deltaSlope = this.lastSlope - this.previousSlope;
    const previousPoint = this.history.length >= 2 ? this.history[this.history.length - 2] : null;
    const deltaTime = previousPoint ? nowSec - previousPoint.t : curvatureLookback;
    return deltaSlope / Math.max(1e-3, deltaTime);
  }
  computeMdfSlope(nowSec) {
    const latest = this.history[this.history.length - 1];
    if (latest.mdf == null) return null;
    const lookback = 8;
    const earlier = this.getPointAt(nowSec - lookback);
    if (!earlier || earlier.mdf == null) return null;
    const delta = latest.mdf - earlier.mdf;
    const deltaTime = Math.max(1e-3, latest.t - earlier.t);
    return delta / deltaTime * 100;
  }
  getPointAt(targetTime) {
    if (this.history.length === 0) return null;
    for (let i = this.history.length - 1; i >= 0; i -= 1) {
      if (this.history[i].t <= targetTime) {
        return this.history[i];
      }
    }
    return this.history[0];
  }
  getSmoothedAt(targetTime) {
    const point = this.getPointAt(targetTime);
    return point ? point.smoothed : this.history[this.history.length - 1].smoothed;
  }
  updateAccumulators(nowSec, slope, curvature) {
    const { riseSlopeThreshold, plateauSlopeThreshold, plateauCurvatureThreshold, fallSlopeThreshold } = this.config;
    const previousPoint = this.history.length >= 2 ? this.history[this.history.length - 2] : null;
    const deltaTime = previousPoint ? nowSec - previousPoint.t : 0;
    if (slope >= riseSlopeThreshold) {
      this.riseAccum += deltaTime;
    } else {
      this.riseAccum = 0;
    }
    if (Math.abs(slope) <= plateauSlopeThreshold && Math.abs(curvature) <= plateauCurvatureThreshold) {
      this.plateauAccum += deltaTime;
    } else {
      this.plateauAccum = 0;
    }
    if (slope <= fallSlopeThreshold) {
      this.fallAccum += deltaTime;
    } else {
      this.fallAccum = 0;
    }
  }
  evaluateState(nowSec, slope, curvature, mdfSlope) {
    const {
      riseMinDurationSec,
      plateauMinDurationSec,
      fallMinDurationSec,
      requireMdfConfirmation,
      mdfFallSlopeThreshold
    } = this.config;
    const totalDelta = Math.abs(this.history[this.history.length - 1].smoothed - this.history[0].smoothed);
    if (totalDelta < this.config.noiseThreshold) {
      return this.state;
    }
    if (this.fallAccum >= fallMinDurationSec) {
      if (!requireMdfConfirmation || mdfSlope == null || mdfSlope <= mdfFallSlopeThreshold) {
        return "fall";
      }
    }
    if (this.riseAccum >= riseMinDurationSec) {
      return "rise";
    }
    if (this.plateauAccum >= plateauMinDurationSec) {
      return "plateau";
    }
    return this.state;
  }
};

// tests/fatigueDetector.test.ts
var BASELINE_NOW = 0;
function advance(detector, samples) {
  samples.forEach(({ t, value }) => {
    detector.update({ nowSec: BASELINE_NOW + t, rmsNorm: value });
  });
}
async function testRiseTransition() {
  const detector = new FatigueDetector({
    ewmaAlpha: 1,
    slopeLookbackSec: 1,
    curvatureLookbackSec: 2,
    plateauCurvatureThreshold: 10,
    plateauSlopeThreshold: 1,
    riseMinDurationSec: 1,
    plateauMinDurationSec: 0.1,
    fallMinDurationSec: 1,
    requireMdfConfirmation: false
  });
  let riseDetected = false;
  detector.onState((event) => {
    if (event.state === "rise") {
      riseDetected = true;
    }
  });
  advance(detector, [
    { t: 0, value: 0 },
    { t: 1, value: 0.2 },
    { t: 2, value: 0.4 },
    { t: 3, value: 0.6 },
    { t: 4, value: 0.8 },
    { t: 5, value: 1 }
  ]);
  assert.ok(riseDetected || detector.getState() === "rise", "Expected state to transition to rise");
}
async function testPlateauTransition() {
  const detector = new FatigueDetector({
    ewmaAlpha: 1,
    slopeLookbackSec: 1,
    curvatureLookbackSec: 2,
    plateauCurvatureThreshold: 1,
    plateauSlopeThreshold: 0.5,
    riseMinDurationSec: 1,
    plateauMinDurationSec: 1,
    fallMinDurationSec: 1,
    requireMdfConfirmation: false,
    noiseThreshold: 0.01
  });
  let plateauDetected = false;
  detector.onState((event) => {
    if (event.state === "plateau") {
      plateauDetected = true;
    }
  });
  for (let i = 0; i < 6; i += 1) {
    detector.update({ nowSec: i, rmsNorm: i * 0.08 });
  }
  for (let i = 6; i < 30; i += 1) {
    detector.update({ nowSec: i, rmsNorm: 0.48 + Math.sin(i) * 3e-3 });
  }
  assert.ok(plateauDetected || detector.getState() === "plateau", "Expected plateau to be detected");
}
async function testFallTransition() {
  const detector = new FatigueDetector({
    ewmaAlpha: 1,
    slopeLookbackSec: 1,
    curvatureLookbackSec: 2,
    plateauCurvatureThreshold: 1,
    plateauSlopeThreshold: 0.5,
    riseMinDurationSec: 1,
    plateauMinDurationSec: 1,
    fallMinDurationSec: 1,
    requireMdfConfirmation: false,
    noiseThreshold: 0.01
  });
  let fallDetected = false;
  detector.onState((event) => {
    if (event.state === "fall") {
      fallDetected = true;
    }
  });
  for (let i = 0; i < 6; i += 1) {
    detector.update({ nowSec: i, rmsNorm: i * 0.05 });
  }
  for (let i = 6; i < 14; i += 1) {
    detector.update({ nowSec: i, rmsNorm: 0.35 });
  }
  for (let i = 14; i < 18; i += 1) {
    detector.update({ nowSec: i, rmsNorm: 0.35 - (i - 13) * 0.06 });
  }
  assert.ok(fallDetected, "Expected fall to be detected");
}
async function testNoiseGuard() {
  const detector = new FatigueDetector({
    ewmaAlpha: 1,
    slopeLookbackSec: 1,
    curvatureLookbackSec: 2,
    riseMinDurationSec: 1,
    plateauMinDurationSec: 1,
    fallMinDurationSec: 1,
    requireMdfConfirmation: false,
    noiseThreshold: 0.01
  });
  let stateChanges = 0;
  detector.onState(() => {
    stateChanges += 1;
  });
  for (let i = 0; i < 20; i += 1) {
    detector.update({ nowSec: i * 0.5, rmsNorm: 2e-3 * Math.sin(i) });
  }
  assert.strictEqual(stateChanges, 0, "Noise should not trigger state changes");
}
async function runTests() {
  await testRiseTransition();
  await testPlateauTransition();
  await testFallTransition();
  await testNoiseGuard();
}

// tests/coachOrchestrator.test.ts
import assert2 from "node:assert";

// stub-genai:stub-genai
var GoogleGenAI = class {
  constructor() {
  }
  models = {
    generateContent: async () => {
      throw new Error("Gemini client is stubbed in tests");
    }
  };
};

// constants.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var FEATURE_FATIGUE_DETECTOR = typeof import.meta !== "undefined" && import.meta?.env?.VITE_FEATURE_FATIGUE_DETECTOR != null ? import.meta.env.VITE_FEATURE_FATIGUE_DETECTOR === "true" || import.meta.env.VITE_FEATURE_FATIGUE_DETECTOR === true : true;
var FEATURE_COACH_LLM_GUARDED = typeof import.meta !== "undefined" && import.meta?.env?.VITE_FEATURE_COACH_LLM_GUARDED != null ? import.meta.env.VITE_FEATURE_COACH_LLM_GUARDED === "true" || import.meta.env.VITE_FEATURE_COACH_LLM_GUARDED === true : true;

// services.ts
var FEW_SHOT_EXAMPLES = [
  {
    user: [
      "Use the system instruction to produce either a daily banner or a Q&A answer.",
      "",
      "MODE: daily_banner",
      "",
      "CONTEXT:",
      "- postSessionStatus: recovered_24h",
      "- readinessNow: 88",
      "- baselineReadiness: 72",
      "- recoverySlopePerHr: 0.6",
      "- nextOptimalMinutes: 45",
      "- symmetryTrendPct: 93",
      "- strain24h: 18",
      "- notes: had coffee",
      "",
      "LAST_SESSION:",
      "- fatigueDetected: true",
      "- readiness: 90",
      "- symmetryPct: 94",
      "",
      "USER_QUESTION (only if MODE=qa):",
      "",
      "CONSTRAINTS:",
      "- Plain text only.",
      "- If MODE=daily_banner: 1\u20132 short sentences; include day color implicitly via guidance (green/yellow/red logic).",
      "- If MODE=qa: 2\u20135 short sentences; give specific, safe, actionable suggestions; adapt to context if present.",
      "- Mention nextOptimalMinutes if > 0.",
      "- Add a symmetry cue only if < 90%.",
      "- No invented numbers or medical advice."
    ].join("\n"),
    assistant: `You\u2019re in a green day and last time was productive fatigue\u2014nice dose. In ~45 minutes you\u2019ll be in an even better pocket; hit a focused main lift with clean reps and stop before it turns grindy.`
  },
  {
    user: [
      "Use the system instruction to produce either a daily banner or a Q&A answer.",
      "",
      "MODE: qa",
      "",
      "CONTEXT:",
      "- postSessionStatus: just_finished",
      "- readinessNow: 74",
      "- baselineReadiness: 70",
      "- recoverySlopePerHr: null",
      "- nextOptimalMinutes: null",
      "- symmetryTrendPct: 94",
      "- strain24h: 32",
      "- notes: null",
      "",
      "LAST_SESSION:",
      "- fatigueDetected: true",
      "- readiness: 76",
      "- symmetryPct: 92",
      "",
      "USER_QUESTION (only if MODE=qa):",
      "How can I recover faster?",
      "",
      "CONSTRAINTS:",
      "- Plain text only.",
      "- If MODE=daily_banner: 1\u20132 short sentences; include day color implicitly via guidance (green/yellow/red logic).",
      "- If MODE=qa: 2\u20135 short sentences; give specific, safe, actionable suggestions; adapt to context if present.",
      "- Mention nextOptimalMinutes if > 0.",
      "- Add a symmetry cue only if < 90%.",
      "- No invented numbers or medical advice."
    ].join("\n"),
    assistant: `Great question\u2014focus on the basics: 7\u20139h sleep, steady hydration, and a balanced meal with protein and carbs. Add 10\u201315 minutes of easy movement or mobility to get blood flowing, and if anything feels grindy, keep it short and clean today.`
  }
];
function normaliseGeminiError(label, error) {
  const result = { label };
  if (error instanceof Error) {
    result.message = error.message;
    result.name = error.name;
    result.stack = error.stack;
  } else {
    result.raw = error;
    try {
      result.serialised = JSON.parse(JSON.stringify(error));
    } catch {
    }
  }
  if (typeof window !== "undefined") {
    window.__lastGeminiError = result;
  }
  return result;
}
function resolveGeminiApiKey() {
  try {
    const metaEnv = typeof import.meta !== "undefined" ? import.meta?.env : void 0;
    const keyFromMeta = metaEnv?.VITE_GEMINI_API_KEY ?? metaEnv?.VITE_API_KEY ?? metaEnv?.GEMINI_API_KEY;
    if (typeof keyFromMeta === "string" && keyFromMeta.trim()) {
      return keyFromMeta.trim();
    }
    if (typeof globalThis !== "undefined") {
      const globalKey = globalThis?.__GEMINI_KEY__ ?? globalThis?.GEMINI_API_KEY;
      if (typeof globalKey === "string" && globalKey.trim()) {
        return globalKey.trim();
      }
    }
    if (typeof localStorage !== "undefined") {
      const storedKey = localStorage.getItem("GEMINI_API_KEY") ?? localStorage.getItem("VITE_GEMINI_API_KEY");
      if (typeof storedKey === "string" && storedKey.trim()) {
        return storedKey.trim();
      }
    }
    if (typeof process !== "undefined" && typeof process?.env === "object") {
      const {
        GEMINI_API_KEY,
        VITE_GEMINI_API_KEY,
        VITE_API_KEY,
        API_KEY
      } = process.env;
      const keyFromProcess = GEMINI_API_KEY ?? VITE_GEMINI_API_KEY ?? VITE_API_KEY ?? API_KEY;
      if (typeof keyFromProcess === "string" && keyFromProcess.trim()) {
        return keyFromProcess.trim();
      }
    }
  } catch (error) {
    console.warn("Unable to resolve Gemini API key:", error);
  }
  return null;
}
var geminiClient;
var geminiKeyCheckLogged = false;
var getGeminiClient = () => {
  if (geminiClient !== void 0) {
    return geminiClient;
  }
  const apiKey = resolveGeminiApiKey();
  if (!geminiKeyCheckLogged) {
    console.info("[Gemini] API key resolved?", Boolean(apiKey));
    geminiKeyCheckLogged = true;
  }
  if (!apiKey) {
    geminiClient = null;
    return geminiClient;
  }
  try {
    geminiClient = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialise Gemini client:", error);
    geminiClient = null;
  }
  return geminiClient;
};
var extractText = async (result) => {
  if (!result) return "";
  if (typeof result === "string") {
    return result;
  }
  if (typeof result?.text === "string") {
    return result.text;
  }
  if (typeof result?.text === "function") {
    try {
      return await result.text();
    } catch (error) {
      console.warn("Failed to read text() from Gemini result:", error);
    }
  }
  const response = result.response ?? result;
  if (response) {
    if (typeof response?.text === "string") {
      return response.text;
    }
    if (typeof response?.text === "function") {
      try {
        return await response.text();
      } catch (error) {
        console.warn("Failed to read response.text() from Gemini result:", error);
      }
    }
    const candidates = response.candidates ?? response.output ?? [];
    if (Array.isArray(candidates) && candidates.length > 0) {
      const parts = candidates[0]?.content?.parts ?? candidates[0]?.parts ?? [];
      if (Array.isArray(parts)) {
        const textPart = parts.find((part) => typeof part?.text === "string");
        if (textPart?.text) {
          return textPart.text;
        }
      }
    }
  }
  return "";
};

// lib/coach/LlmOrchestrator.ts
var CONF_THRESHOLDS = {
  rise: 0.6,
  plateau: 0.6,
  fall: 0.7
};
var SYSTEM_PROMPT = `You are a sports scientist coaching an athlete BETWEEN SETS.

TONE
- Natural, human, and encouraging\u2014like a smart coach standing next to the rack.
- Evidence-based but plainspoken. Use contractions. No emojis, no hype.

OUTPUT
- ONE block of text, at most TWO short sentences total.
- Output PLAIN TEXT ONLY (no JSON, no quotes, no bullets).

DATA YOU MAY USE (will be provided in the user message)
- phase: Rise | Plateau | Fall
- readiness: 0\u2013100 (current neuromuscular readiness)
- baselineReadiness: 0\u2013100 (typical recent baseline)
- fatigueDetected: true/false
- rir: integer or null
- symmetryPct: percent or null
- rorTrend: "up" | "flat" | "down" | null
- strain: 0\u2013100 or null
- restSeconds: seconds or 0
- notes: short context like "had coffee", "short sleep" (optional)

STRICT RULES
- Never invent numbers or causes. If notes exist, you may mention them once.
- Safety first: if fatigueDetected=true or phase=Fall \u2192 advise stopping and recovering.
- If symmetryPct < 90 \u2192 briefly cue a setup/stance fix.
- If rorTrend="down" \u2192 cue a sharper first second next set.
- If phase\u2260Fall and fatigueDetected=false and rir\u22651 \u2192 you may suggest 1\u20132 clean reps max, only if form stays crisp.
- If restSeconds>0, include it naturally (e.g., "Rest 90s ...").
- Avoid robotic words like "execute/cap/bank"; prefer "finish there," "let's rack," "keep it smooth".

FATIGUE-IN-CONTEXT FRAMING (apply exactly)
- If fatigueDetected=true:
  - readiness \u2265 85 \u2192 call it "productive fatigue" (good dose at high readiness; stop now to bank quality).
  - 65 \u2264 readiness < 85 \u2192 "borderline fatigue" (okay work; stop now and protect form).
  - readiness < 65 \u2192 "unproductive fatigue" (shut it down; lengthen rest or reduce demand next set).
- If fatigueDetected=false:
  - readiness \u2265 85 \u2192 "plenty in the tank" (optional 1\u20132 clean reps if form stays crisp).
  - 65 \u2264 readiness < 85 \u2192 "steady and workable" (stay precise; same plan).
  - readiness < 65 \u2192 "low readiness" (keep it conservative; clean reps over grind).

STYLE PATTERN
- Sentence 1: What you noticed (fatigue status + how that ranks given readiness, or steady state).
- Sentence 2: The next best move (rest, form cue, tiny rep guidance).`;
var FEW_SHOT_EXAMPLES2 = [
  `Example 1 \u2014 Productive fatigue (high readiness)

PHASE: Fall
SIGNALS: readiness 89, baselineReadiness 72, fatigueDetected true, rir 0, symmetryPct 95, rorTrend "flat", strain 52, restSeconds 120, notes "had coffee"
EXPECTED STYLE:
That was productive fatigue at a high-readiness state\u2014nice work finding the line. Let's rack there, rest 120s, and go again once it feels sharp.`,
  `Example 2 \u2014 Borderline fatigue (mid readiness) + symmetry drift

PHASE: Fall
SIGNALS: readiness 74, baselineReadiness 68, fatigueDetected true, rir 0, symmetryPct 87, rorTrend "down", strain 60, restSeconds 120, notes null
EXPECTED STYLE:
Borderline fatigue showed and Left/Right drifted (~87%)\u2014that's our stop. Rest 120s, rebuild your setup, and open the next set with a sharper first second.`
];
function toPhaseLabel(state, explicit) {
  if (explicit === "Rise" || explicit === "Plateau" || explicit === "Fall") {
    return explicit;
  }
  switch (state) {
    case "rise":
      return "Rise";
    case "plateau":
      return "Plateau";
    default:
      return "Fall";
  }
}
function formatSignalValue(value, fallback = "null") {
  if (value === null || value === void 0) {
    return fallback;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return String(Math.round((value + Number.EPSILON) * 100) / 100);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  const stringified = String(value).trim();
  return stringified.length > 0 ? stringified : fallback;
}
function buildUserPrompt(context) {
  const phase = toPhaseLabel(context.state, context?.phase);
  const readiness = formatSignalValue(context.readiness ?? null);
  const baselineReadiness = formatSignalValue(context.baselineReadiness ?? null);
  const fatigueDetected = formatSignalValue(
    context.fatigueDetected ?? context.state === "fall",
    "false"
  );
  const rir = formatSignalValue(context.rir ?? null);
  const symmetryDiff = context.metrics.symmetry_pct_diff;
  const computedSymmetry = symmetryDiff != null && Number.isFinite(symmetryDiff) ? 100 - Math.abs(symmetryDiff) : null;
  const symmetrySource = context.symmetryPct ?? computedSymmetry;
  const symmetryPct = formatSignalValue(symmetrySource);
  const rorTrend = formatSignalValue(
    context.rorTrend ?? context.metrics.ror_trend ?? null
  );
  const strain = formatSignalValue(context.strain ?? null);
  const restSeconds = formatSignalValue(context.restSeconds ?? null, "0");
  const notes = formatSignalValue(context.notes ?? null);
  return [
    "Write one between-set coaching message using the system instruction.",
    "",
    `PHASE: ${phase}`,
    "",
    "SIGNALS:",
    `- readiness: ${readiness}`,
    `- baselineReadiness: ${baselineReadiness}`,
    `- fatigueDetected: ${fatigueDetected}`,
    `- rir: ${rir}`,
    `- symmetryPct: ${symmetryPct}`,
    `- rorTrend: ${rorTrend}`,
    `- strain: ${strain}`,
    `- restSeconds: ${restSeconds}`,
    `- notes: ${notes}`,
    "",
    "CONSTRAINTS:",
    "- Two short sentences max, plain text only.",
    "- Use the Fatigue-in-Context Framing exactly as written in the system instruction.",
    "- If restSeconds > 0, include it naturally.",
    "- If symmetryPct < 90, add a brief setup/stance cue.",
    "- No jargon; sound like a calm, human coach."
  ].join("\n");
}
function defaultNowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}
function clampMetric(value) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}
var CoachInsightOrchestrator = class {
  constructor(options) {
    this.lastInsightAtMs = Number.NEGATIVE_INFINITY;
    this.insightsThisSet = 0;
    this.lastState = null;
    this.lastReason = null;
    this.client = options?.client;
    this.nowFn = options?.now ?? defaultNowMs;
    this.logger = options?.logger;
  }
  resetForNewSet() {
    this.lastInsightAtMs = Number.NEGATIVE_INFINITY;
    this.insightsThisSet = 0;
    this.lastState = null;
    this.lastReason = null;
  }
  getLastInsightTimestamp() {
    return this.lastInsightAtMs;
  }
  async generateInsight(context, trigger, options) {
    if (options?.signal?.aborted) {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      throw abortError;
    }
    const evalResult = this.evaluateContext(context);
    this.log("coach_insight_evaluated", {
      trigger,
      action: evalResult.action,
      reason: evalResult.reason ?? null,
      state: context.state,
      confidence: context.confidence,
      insightsThisSet: this.insightsThisSet
    });
    if (evalResult.action === "skip") {
      return null;
    }
    const now = this.nowFn();
    let reason = evalResult.reason ?? null;
    let insight = null;
    const shouldAbort = () => Boolean(options?.signal?.aborted);
    if (evalResult.action === "fallback") {
      if (shouldAbort()) {
        const abortError = new Error("Aborted");
        abortError.name = "AbortError";
        throw abortError;
      }
      insight = this.buildFallback(context, reason ?? "error");
    } else {
      try {
        insight = await this.invokeGemini(context, options?.signal);
        if (!insight) {
          reason = "error";
          insight = this.buildFallback(context, "error");
        }
      } catch (error) {
        if (shouldAbort()) {
          const abortError = new Error("Aborted");
          abortError.name = "AbortError";
          throw abortError;
        }
        const normalised = normaliseGeminiError("coach_insight", error);
        console.error("[coach-orchestrator]", normalised);
        reason = error?.message === "Gemini timeout" ? "timeout" : "error";
        insight = this.buildFallback(context, reason === "timeout" ? "error" : reason);
      }
    }
    if (!insight) {
      return null;
    }
    this.lastInsightAtMs = now;
    this.insightsThisSet += 1;
    this.lastState = context.state;
    this.lastReason = reason;
    return insight;
  }
  evaluateContext(context) {
    if (context.exercise.phase !== "set") {
      return { action: "skip" };
    }
    if (this.insightsThisSet >= context.limits.max_messages_per_set) {
      return { action: "skip" };
    }
    const now = this.nowFn();
    if (now - this.lastInsightAtMs < context.limits.speak_min_gap_sec * 1e3) {
      return { action: "skip" };
    }
    const artifact = clampMetric(context.metrics.motion_artifact) ?? 0;
    if (artifact >= context.limits.artifact_threshold) {
      return { action: "fallback", reason: "artifact" };
    }
    const threshold = CONF_THRESHOLDS[context.state];
    if (context.confidence < threshold) {
      return { action: "fallback", reason: "low_confidence" };
    }
    const rms = clampMetric(context.metrics.rms_change_pct_last_8s);
    if (rms == null) {
      return { action: "fallback", reason: "no_signal" };
    }
    if (Math.abs(rms) < 7) {
      return { action: "fallback", reason: "noise" };
    }
    return { action: "call" };
  }
  resolveClient() {
    if (this.client === void 0) {
      this.client = getGeminiClient();
    }
    return this.client ?? null;
  }
  async invokeGemini(context, externalSignal) {
    const client = this.resolveClient();
    if (!client) {
      throw new Error("Gemini client unavailable");
    }
    const userPrompt = [
      SYSTEM_PROMPT,
      "",
      buildUserPrompt(context)
    ].join("\n\n");
    const contents = [
      { role: "user", parts: [{ text: userPrompt }] }
    ];
    for (const example of FEW_SHOT_EXAMPLES2) {
      contents.push({ role: "user", parts: [{ text: example }] });
    }
    const abortController = new AbortController();
    let didTimeOut = false;
    const timeoutId = setTimeout(() => {
      didTimeOut = true;
      abortController.abort();
    }, 600);
    const handleExternalAbort = () => {
      abortController.abort();
    };
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        const abortError = new Error("Aborted");
        abortError.name = "AbortError";
        throw abortError;
      }
      externalSignal.addEventListener("abort", handleExternalAbort);
    }
    try {
      const response = await client.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents,
        config: {
          abortSignal: abortController.signal,
          temperature: 0.4,
          responseMimeType: "text/plain",
          maxOutputTokens: 120
        }
      });
      const raw = await extractText(response);
      const parsed = this.parseModelResponse(raw);
      if (!parsed) {
        return null;
      }
      return this.normaliseModelResponse(parsed, context);
    } catch (error) {
      if (error?.name === "AbortError" || abortController.signal.aborted) {
        if (externalSignal?.aborted && !didTimeOut) {
          const abortError = new Error("Aborted");
          abortError.name = "AbortError";
          throw abortError;
        }
        if (didTimeOut) {
          throw new Error("Gemini timeout");
        }
        throw error;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", handleExternalAbort);
      }
    }
  }
  parseModelResponse(raw) {
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    if (!trimmed) {
      return null;
    }
    const sanitizeTags = (input) => {
      if (!Array.isArray(input)) return void 0;
      const valid = input.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter((tag) => ["Rise", "Plateau", "Fall", "SymmetryOff", "NoFatigue"].includes(tag));
      return valid.length > 0 ? valid : void 0;
    };
    const sanitizeActions = (input) => {
      if (!Array.isArray(input)) return void 0;
      const valid = [];
      for (const item of input) {
        if (item === "continue_anyway" || item === "end_set") {
          valid.push(item);
        }
      }
      return valid;
    };
    const sanitizeMetric = (input) => {
      if (!input || typeof input !== "object") {
        return input === null ? null : void 0;
      }
      const record = input;
      const name = record.name;
      const value = record.value;
      if ((name === "RMS" || name === "MDF" || name === "RoR" || name === "Symmetry") && typeof value === "string" && value.trim().length > 0) {
        return { name, value: value.trim() };
      }
      return null;
    };
    try {
      const data = JSON.parse(trimmed);
      if (typeof data === "string") {
        const headline = data.trim();
        return headline ? { headline } : null;
      }
      if (typeof data !== "object" || data === null) {
        return null;
      }
      const record = data;
      const rawHeadline = typeof record.headline === "string" && record.headline.trim() || typeof record.primary === "string" && record.primary.trim() || typeof record.text === "string" && record.text.trim();
      if (!rawHeadline) {
        return null;
      }
      const subline = typeof record.subline === "string" && record.subline.trim() || typeof record.secondary === "string" && record.secondary.trim() || void 0;
      const tip = typeof record.tip === "string" && record.tip.trim().length > 0 ? record.tip : void 0;
      const tags = sanitizeTags(record.tags);
      const actions = sanitizeActions(record.actions);
      const restSeconds = typeof record.rest_seconds === "number" ? record.rest_seconds : typeof record.restSeconds === "number" ? record.restSeconds : void 0;
      const type = record.type === "info" || record.type === "suggestion" || record.type === "caution" ? record.type : void 0;
      const metric = sanitizeMetric(record.metric_cited) ?? sanitizeMetric(record.metricCited);
      return {
        headline: rawHeadline,
        subline,
        tip,
        tags,
        actions,
        rest_seconds: restSeconds,
        type,
        metric_cited: metric
      };
    } catch {
      return { headline: trimmed };
    }
  }
  normaliseModelResponse(parsed, context) {
    const tags = parsed.tags && parsed.tags.length > 0 ? parsed.tags : [toPhaseLabel(context.state)];
    const restSeconds = typeof parsed.rest_seconds === "number" && Number.isFinite(parsed.rest_seconds) ? parsed.rest_seconds : Math.max(0, Number(context.restSeconds ?? 0));
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const filteredActions = actions.filter(
      (action) => action === "continue_anyway" || action === "end_set"
    );
    const inferredType = parsed.type ?? (filteredActions.includes("end_set") ? "caution" : "suggestion");
    const metric = parsed.metric_cited ?? null;
    const headlineParts = [
      typeof parsed.headline === "string" ? parsed.headline.trim() : "",
      typeof parsed.subline === "string" ? parsed.subline.trim() : ""
    ].filter((part) => part.length > 0);
    const combinedHeadline = headlineParts.join(" ").replace(/\s+/g, " ").trim();
    const safeHeadline = combinedHeadline.length > 0 ? combinedHeadline : "Hold that quality\u2014rest up and stay sharp.";
    return {
      source: "llm",
      state: context.state,
      type: inferredType,
      headline: safeHeadline,
      subline: void 0,
      tip: void 0,
      tags,
      actions: filteredActions,
      rest_seconds: restSeconds,
      confidence: context.confidence,
      metric_cited: metric
    };
  }
  buildFallback(context, reason) {
    const state = context.state;
    const confidence = Math.max(0, Math.min(1, context.confidence));
    const lines = [];
    if (reason === "artifact") {
      lines.push("Signal is noisy.");
      lines.push("Reset contact and keep it smooth next set.");
    } else if (reason === "low_confidence" || reason === "noise" || reason === "no_signal") {
      lines.push("Not enough signal yet\u2014hold your form steady.");
      lines.push("We\u2019ll flag the moment the data stabilizes.");
    } else if (state === "rise") {
      lines.push("Drive is climbing and pattern looks good.");
      lines.push("Bank the quality and stay crisp.");
    } else if (state === "plateau") {
      lines.push("You're holding steady and pacing well.");
      lines.push("Keep it tidy and stay smooth.");
    } else if (state === "fall") {
      lines.push("Quality is slipping\u2014activation is falling.");
      lines.push("Let\u2019s rack there to protect output.");
    } else {
      lines.push("Nice work. Keep things smooth between reps.");
    }
    const combinedHeadline = lines.join(" ").replace(/\s+/g, " ").trim();
    const tags = [
      toPhaseLabel(state)
    ];
    const actions = state === "fall" ? ["end_set"] : [];
    const type = state === "fall" ? "caution" : reason === "artifact" || reason === "low_confidence" || reason === "noise" || reason === "no_signal" ? "info" : "suggestion";
    const restSeconds = Math.max(0, Number(context.restSeconds ?? 0));
    return {
      source: "fallback",
      state,
      type,
      headline: combinedHeadline || "Hold steady and reset for your next clean reps.",
      subline: void 0,
      tip: void 0,
      tags,
      actions,
      rest_seconds: restSeconds,
      confidence,
      metric_cited: null
    };
  }
  log(event, payload) {
    if (this.logger) {
      this.logger(event, payload);
    }
  }
};

// tests/coachOrchestrator.test.ts
var StubGeminiClient = class {
  constructor(responses) {
    this.calls = 0;
    this.models = {
      generateContent: (_args) => this.handleGenerateContent()
    };
    this.responses = [...responses];
  }
  async handleGenerateContent() {
    this.calls += 1;
    if (this.responses.length === 0) {
      return { text: "" };
    }
    const next = this.responses.shift();
    if (!next) {
      return { text: "" };
    }
    if (next instanceof Error) {
      throw next;
    }
    return { text: next };
  }
};
function buildContext(overrides = {}) {
  const base = {
    user: { id: "anon", experience: "intermediate" },
    exercise: { name: "Back Squat", phase: "set", rep: 7 },
    state: "rise",
    confidence: 0.75,
    metrics: {
      rms_change_pct_last_8s: 12.4,
      mdf_change_pct_last_8s: null,
      ror_trend: "up",
      symmetry_pct_diff: null,
      motion_artifact: 0.05
    },
    limits: {
      speak_min_gap_sec: 6,
      max_messages_per_set: 3,
      artifact_threshold: 0.3
    }
  };
  return {
    ...base,
    ...overrides,
    user: { ...base.user, ...overrides.user ?? {} },
    exercise: { ...base.exercise, ...overrides.exercise ?? {} },
    metrics: { ...base.metrics, ...overrides.metrics ?? {} },
    limits: { ...base.limits, ...overrides.limits ?? {} },
    state: overrides.state ?? base.state,
    confidence: overrides.confidence ?? base.confidence
  };
}
async function testRiseWithCleanSignal() {
  const stub = new StubGeminiClient([
    JSON.stringify({
      primary: "Recruitment increasing. Nice control.",
      secondary: "Activation up ~12% in 8s.",
      tags: ["Rise"],
      rest_seconds: 0
    })
  ]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub, now: () => clock.value });
  const context = buildContext({
    state: "rise",
    confidence: 0.78,
    metrics: { rms_change_pct_last_8s: 12.1, motion_artifact: 0.1 }
  });
  const insight = await orchestrator.generateInsight(context, "state");
  assert2.ok(insight, "Expected an insight for rise state");
  assert2.strictEqual(insight?.source, "llm");
  assert2.ok(insight?.headline.includes("Recruitment increasing. Nice control."), "Expected combined headline to include first sentence");
  assert2.ok(insight?.headline.includes("Activation up ~12% in 8s."), "Expected combined headline to include second sentence");
  assert2.strictEqual(insight?.subline, void 0);
  assert2.deepStrictEqual(insight?.tags, ["Rise"]);
  assert2.deepStrictEqual(insight?.actions, []);
}
async function testPlateauLowConfidenceFallback() {
  const stub = new StubGeminiClient([]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub, now: () => clock.value });
  const context = buildContext({
    state: "plateau",
    confidence: 0.5,
    metrics: { rms_change_pct_last_8s: 9.2 }
  });
  const insight = await orchestrator.generateInsight(context, "state");
  assert2.ok(insight, "Expected fallback insight for low confidence plateau");
  assert2.strictEqual(stub.calls, 0, "Gemini should not be called when confidence is below threshold");
  assert2.strictEqual(insight?.source, "fallback");
  assert2.ok(insight?.headline.includes("Not enough signal yet"), "Expected fallback headline to mention lack of signal");
  assert2.strictEqual(insight?.subline, void 0);
  assert2.deepStrictEqual(insight?.tags, ["Plateau"]);
  assert2.deepStrictEqual(insight?.actions, []);
}
async function testFallHighConfidenceCaution() {
  const stub = new StubGeminiClient([
    JSON.stringify({
      primary: "Quality dipping (activation \u2193 ~14%).",
      secondary: "Rec: end set to protect output.",
      tags: ["Fall"],
      actions: ["end_set"],
      rest_seconds: 0
    })
  ]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub, now: () => clock.value });
  const context = buildContext({
    state: "fall",
    confidence: 0.82,
    metrics: { rms_change_pct_last_8s: -13.6 }
  });
  const insight = await orchestrator.generateInsight(context, "state");
  assert2.ok(insight, "Expected caution insight for fall state");
  assert2.ok(insight?.headline.includes("Quality dipping (activation \u2193 ~14%)."), "Expected fall headline to include activation drop");
  assert2.ok(insight?.headline.includes("Rec: end set to protect output."), "Expected combined headline to include end-set guidance");
  assert2.strictEqual(insight?.subline, void 0);
  assert2.deepStrictEqual(insight?.tags, ["Fall"]);
  assert2.deepStrictEqual(insight?.actions, ["end_set"]);
}
async function testHighArtifactFallback() {
  const stub = new StubGeminiClient([]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub, now: () => clock.value });
  const context = buildContext({
    state: "plateau",
    metrics: { motion_artifact: 0.4 }
  });
  const insight = await orchestrator.generateInsight(context, "checkpoint");
  assert2.ok(insight, "Expected fallback insight for noisy signal");
  assert2.strictEqual(stub.calls, 0);
  assert2.ok(insight?.headline.includes("Signal is noisy"), "Expected artifact fallback to mention noisy signal");
  assert2.strictEqual(insight?.subline, void 0);
  assert2.deepStrictEqual(insight?.tags, ["Plateau"]);
}
async function testRateLimitMinGap() {
  const stub = new StubGeminiClient([
    JSON.stringify({
      primary: "Recruitment increasing. Nice control.",
      secondary: "Activation up ~12% in 8s.",
      tags: ["Rise"],
      rest_seconds: 0
    })
  ]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub, now: () => clock.value });
  const context = buildContext({
    state: "rise",
    confidence: 0.78,
    metrics: { rms_change_pct_last_8s: 12.2 }
  });
  const first = await orchestrator.generateInsight(context, "state");
  assert2.ok(first, "Expected first insight to be generated");
  clock.value += 1e3;
  const second = await orchestrator.generateInsight(context, "checkpoint");
  assert2.strictEqual(second, null, "Second insight should be suppressed by min gap");
  assert2.strictEqual(stub.calls, 1, "Gemini should only be called once");
}
async function testInvalidJsonFallback() {
  const stub = new StubGeminiClient(["not-json"]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub, now: () => clock.value });
  const context = buildContext({
    state: "rise",
    confidence: 0.8,
    metrics: { rms_change_pct_last_8s: 15.4 }
  });
  const insight = await orchestrator.generateInsight(context, "state");
  assert2.ok(insight, "Expected insight when JSON invalid");
  assert2.strictEqual(insight?.source, "llm");
  assert2.ok(insight?.headline.length > 0, "Headline should not be empty");
  assert2.deepStrictEqual(insight?.tags, ["Rise"]);
}
async function testNewPromptAndSchema() {
  const stub = new StubGeminiClient([
    JSON.stringify({
      primary: "You're in the zone now. Looking strong and steady.",
      secondary: "I'd say you've got about 1 to 3 more good reps in you.",
      tags: ["Plateau"],
      rest_seconds: 0
    })
  ]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub, now: () => clock.value });
  const context = buildContext({
    state: "plateau",
    confidence: 0.8,
    metrics: { rms_change_pct_last_8s: 2.1 }
  });
  const insight = await orchestrator.generateInsight(context, "state");
  assert2.ok(insight, "Expected an insight for plateau state with new schema");
  assert2.strictEqual(insight?.source, "fallback");
  assert2.ok(insight?.headline.length > 0, "Fallback headline should not be empty");
  assert2.deepStrictEqual(insight?.tags, ["Plateau"]);
}
async function runTests2() {
  await testRiseWithCleanSignal();
  await testPlateauLowConfidenceFallback();
  await testFallHighConfidenceCaution();
  await testHighArtifactFallback();
  await testRateLimitMinGap();
  await testInvalidJsonFallback();
  await testNewPromptAndSchema();
  console.log("Coach orchestrator tests passed.");
}

// tests/voice.offers.test.ts
import assert3 from "node:assert";

// lib/coach/voice.ts
var PERSONAS = ["calm", "direct", "playful"];
var CUES = ["brace", "path", "tempo", "breath", "symmetry"];
var CoachConfig = {
  thresholds: {
    readiness: { high: 85, low: 65 },
    balance: { strong: 75, moderate: 85 }
  },
  restBumps: {
    recovery: [30, 60],
    foundation: [15, 30],
    efficiency: 15
  },
  maxChars: 140
};
var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
var averageTuple = (range) => Math.round((range[0] + range[1]) / 2);
var clampRest = (value) => clamp(Math.round(value / 5) * 5, 45, 180);
var clampLine = (text, limit) => {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  const breakpoints = [". ", "; ", ", ", "\u2014", "-", " "];
  for (const breakpoint of breakpoints) {
    const idx = slice.lastIndexOf(breakpoint);
    if (idx > 0 && idx > limit - 35) {
      return `${slice.slice(0, idx).trimEnd()}\u2026`;
    }
  }
  return `${slice.trimEnd()}\u2026`;
};
var sanitizeReadiness = (value) => {
  if (!Number.isFinite(value)) return 0;
  return clamp(Math.round(value), 0, 100);
};
var sanitizeChange = (value) => Number.isFinite(value) ? Math.round(value) : 0;
var selectPersona = (profile2, fallback) => {
  const epsilon = profile2.explorationRate ?? 0.1;
  if (Math.random() < epsilon) {
    return PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
  }
  return profile2.preferredPersona ?? fallback;
};
var selectCue = (profile2, defaultCue) => {
  const epsilon = profile2.explorationRate ?? 0.1;
  if (Math.random() < epsilon) {
    return CUES[Math.floor(Math.random() * CUES.length)];
  }
  return profile2.preferredCue ?? defaultCue;
};
var determineDefaultCue = (plan) => {
  switch (plan) {
    case "drop5":
    case "drop10":
      return "brace";
    case "cap1":
      return "path";
    case "rest60":
      return "breath";
    case "technique":
      return "path";
    case "tempo212":
      return "tempo";
    case "hold":
    case "add12":
    default:
      return "brace";
  }
};
var deriveInputs = (ctx) => {
  const readiness = sanitizeReadiness(ctx.readinessNow);
  const readinessChange = sanitizeChange(ctx.readinessChangePct);
  const restTargetSec = clampRest(
    Number.isFinite(ctx.targetRestSec) && (ctx.targetRestSec ?? 0) > 0 ? ctx.targetRestSec : 90
  );
  const symmetryPct = clamp(Math.round(ctx.symmetryNow ?? 100), 0, 100);
  const rorTrend = ctx.historicalTrend ?? "flat";
  const isWarmup = ctx.sessionStage === "warmup";
  const isFirstSet = ctx.setNumber <= 1;
  return {
    readiness,
    readinessChange,
    fatigueFlag: Boolean(ctx.fatigueFlag),
    symmetryPct,
    rorTrend,
    restTargetSec,
    rir: ctx.rir ?? null,
    isWarmup,
    isFirstSet,
    suppressProgress: isFirstSet && !isWarmup
  };
};
var pickOfferType = (inputs) => {
  if (inputs.isWarmup) {
    return "foundation";
  }
  if (inputs.fatigueFlag || inputs.readiness < CoachConfig.thresholds.readiness.low) {
    return "recovery";
  }
  if (inputs.symmetryPct < CoachConfig.thresholds.balance.moderate) {
    return "efficiency";
  }
  const highReadiness = inputs.readiness >= CoachConfig.thresholds.readiness.high;
  if (!inputs.suppressProgress && highReadiness && inputs.rorTrend !== "down" && !inputs.fatigueFlag) {
    return "progress";
  }
  return "foundation";
};
var createPlan = (kind, params) => {
  if (params && Object.keys(params).length > 0) {
    return { kind, params };
  }
  return { kind };
};
var buildOfferContent = (inputs, offer) => {
  const restTarget = inputs.restTargetSec;
  const result = {
    message: { primary: "", secondary: "", planLine: "", feelTarget: "", variations: [] },
    plan: { kind: "hold" },
    judgement: "neutral",
    ctas: [],
    timerSubLabel: null,
    offer
  };
  switch (offer) {
    case "recovery": {
      const bump = averageTuple(CoachConfig.restBumps.recovery);
      const restSec = clampRest(restTarget + bump);
      const restDelta = restSec - restTarget;
      const useCap = inputs.rir != null && inputs.rir <= 1;
      const actionVerb = useCap ? "drop the reps a touch" : "drop the weight a little";
      const variations = [
        clampLine(
          `Alright, you're getting tired. Ease the weight and rest a bit longer so the next set keeps building strength.`,
          CoachConfig.maxChars
        ),
        clampLine(
          `Good work, energy's dipping. Let's ${actionVerb} and breathe so you stay on track getting stronger.`,
          CoachConfig.maxChars
        ),
        clampLine(
          `Okay, your fuel is low. Take a longer breather and lighten up so your next effort still builds strength.`,
          CoachConfig.maxChars
        )
      ];
      const params = {};
      if (restDelta !== 0) params.restBumpSec = restDelta;
      result.message = {
        primary: variations[0],
        secondary: "",
        planLine: "",
        feelTarget: "",
        variations
      };
      result.plan = createPlan(useCap ? "cap1" : "drop5", params);
      result.judgement = "protect";
      result.timerSubLabel = "Lock in gains";
      result.ctas = [
        {
          id: useCap ? "cap_reps_and_rest" : "drop_5_and_rest",
          label: useCap ? "Lock in Gains (Cap Reps)" : "Lock in Gains (Drop 5%)",
          action: "resume",
          emphasis: "primary"
        },
        {
          id: "continue_anyway",
          label: "Continue anyway",
          action: "resume_override",
          emphasis: "secondary"
        },
        {
          id: "end_after_next",
          label: "End After This Set",
          action: "end_session",
          emphasis: "secondary"
        }
      ];
      break;
    }
    case "efficiency": {
      const restSec = clampRest(restTarget + CoachConfig.restBumps.efficiency);
      const restDelta = restSec - restTarget;
      const severe = inputs.symmetryPct < CoachConfig.thresholds.balance.strong;
      const variations = [
        clampLine(
          `Nice work, but you're a bit off-balance. Slow the tempo so both sides stay even and your strength keeps climbing.`,
          CoachConfig.maxChars
        ),
        clampLine(
          `Alright, balance is drifting. Let's steady your pace so each rep keeps feeding that long-term strength.`,
          CoachConfig.maxChars
        ),
        clampLine(
          `Good set, one side is doing extra. Tighten the control so you build even power for future strength.`,
          CoachConfig.maxChars
        )
      ];
      const params = {};
      if (restDelta !== 0) params.restBumpSec = restDelta;
      if (severe) params.repDelta = -1;
      result.message = {
        primary: variations[0],
        secondary: "",
        planLine: "",
        feelTarget: "",
        variations
      };
      result.plan = createPlan("tempo212", params);
      result.judgement = "neutral";
      result.timerSubLabel = "Fix power leaks";
      result.ctas = [
        {
          id: "control_tempo_and_rest",
          label: "Fix Form & Continue",
          action: "resume",
          emphasis: "primary"
        }
      ];
      break;
    }
    case "progress": {
      const restSec = clampRest(restTarget);
      const restDelta = restSec - restTarget;
      const variations = [
        clampLine(
          `Okay, you're looking strong. Add one rep so this next set keeps stacking strength.`,
          CoachConfig.maxChars
        ),
        clampLine(
          `Nice work, plenty of energy. Let's squeeze in one extra rep to push your strength forward.`,
          CoachConfig.maxChars
        ),
        clampLine(
          `Alright, tank is full. Take the same weight and chase an extra rep so your strength jumps.`,
          CoachConfig.maxChars
        )
      ];
      const params = {};
      if (restDelta !== 0) params.restBumpSec = restDelta;
      result.message = {
        primary: variations[0],
        secondary: "",
        planLine: "",
        feelTarget: "",
        variations
      };
      result.plan = createPlan("add12", params);
      result.judgement = "productive";
      result.timerSubLabel = "Chase the window";
      result.ctas = [
        {
          id: "start_next_set",
          label: "Add 1 Rep & Go",
          action: "resume",
          emphasis: "primary"
        }
      ];
      break;
    }
    case "foundation":
    default: {
      const isWarmup = inputs.isWarmup;
      const bump = averageTuple(CoachConfig.restBumps.foundation);
      const preferredRest = isWarmup ? Math.max(restTarget, 60) : restTarget + bump;
      const restSec = clampRest(preferredRest);
      const restDelta = restSec - restTarget;
      const variations = isWarmup ? [
        clampLine(
          `Good work. Rest a bit and match the reps so the next warm-up keeps your strength rolling.`,
          CoachConfig.maxChars
        ),
        clampLine(
          `Nice start. Let's breathe, keep the weight steady, and set up another clean rep to build strength.`,
          CoachConfig.maxChars
        ),
        clampLine(
          `Alright, warm-up feels good. Hold the plan and rest so the next set keeps your strength climbing.`,
          CoachConfig.maxChars
        )
      ] : [
        clampLine(
          `Good set. Keep the weight and reps steady so your base keeps getting stronger.`,
          CoachConfig.maxChars
        ),
        clampLine(
          `Nice work. Match the reps again after this rest so you stay on the path to more strength.`,
          CoachConfig.maxChars
        ),
        clampLine(
          `Alright, stay smooth. Same plan next set so you keep building strength the right way.`,
          CoachConfig.maxChars
        )
      ];
      const params = {};
      if (restDelta !== 0) params.restBumpSec = restDelta;
      result.message = {
        primary: variations[0],
        secondary: "",
        planLine: "",
        feelTarget: "",
        variations
      };
      result.plan = createPlan("hold", params);
      result.judgement = "neutral";
      result.timerSubLabel = isWarmup ? "Prime the engine" : "Bank this work";
      result.ctas = [
        {
          id: "start_next_set",
          label: "Bank Next Set",
          action: "resume",
          emphasis: "primary"
        }
      ];
      break;
    }
  }
  return result;
};
function judgeFatigue(ctx) {
  const inputs = deriveInputs(ctx);
  const offer = pickOfferType(inputs);
  switch (offer) {
    case "recovery":
      return "protect";
    case "progress":
      return "productive";
    default:
      return "neutral";
  }
}
function generatePersonalizedFeedback(rawCtx, userProfile) {
  const inputs = deriveInputs(rawCtx);
  const offer = pickOfferType(inputs);
  const built = buildOfferContent(inputs, offer);
  const defaultCue = determineDefaultCue(built.plan.kind);
  const persona = selectPersona(userProfile, "calm");
  const cue = selectCue(userProfile, defaultCue);
  return {
    message: built.message,
    plan: built.plan.kind,
    appliedPlan: built.plan,
    personalization: { persona, cue },
    judgment: built.judgement,
    timerSubLabel: built.timerSubLabel,
    offerType: built.offer,
    ctas: built.ctas
  };
}
function computeReward(signal) {
  let reward = 0;
  if (signal.planFollowed) reward += 1;
  if (signal.qualityImproved) reward += 0.8;
  if (signal.readinessRebounded) reward += 0.5;
  if (signal.thumbsUp) reward += 0.5;
  if ((signal.dwellMs ?? 0) > 2500) reward += 0.2;
  return reward;
}

// tests/voice.offers.test.ts
var baseProfile = {
  userId: "test-user",
  preferredPersona: "calm",
  preferredCue: "brace",
  explorationRate: 0
};
var baseContext = {
  exerciseName: "Back Squat",
  setNumber: 2,
  readinessNow: 78,
  readinessChangePct: -3,
  setVolume: { reps: 5 },
  targetRestSec: 90,
  historicalTrend: "flat"
};
var buildContext2 = (overrides) => ({
  ...baseContext,
  ...overrides,
  setVolume: overrides.setVolume ?? baseContext.setVolume
});
var hasPrimaryCta = (label, ctas) => ctas.some((cta) => cta.emphasis === "primary" && cta.label.includes(label));
function testRecoveryOffer() {
  const context = buildContext2({
    readinessNow: 58,
    readinessChangePct: -8,
    fatigueFlag: true
  });
  const output = generatePersonalizedFeedback(context, baseProfile);
  assert3.strictEqual(output.offerType, "recovery");
  assert3.ok(output.message.primary.includes("you're getting tired"), "recovery message should note fatigue");
  assert3.ok(output.message.primary.includes("rest a bit longer") || output.message.primary.includes("rest longer"), "recovery message should explain rest bump");
  assert3.ok(output.plan === "drop5" || output.plan === "cap1", "plan should guide drop or cap");
  assert3.ok(hasPrimaryCta("Lock in Gains", output.ctas), "primary CTA should lock in gains");
  assert3.ok(output.message.primary.length <= 140, "message respects character limit");
  assert3.ok(output.message.variations && output.message.variations.length >= 3);
  for (const line of output.message.variations ?? []) {
    assert3.ok(line.length <= 140, "variation too long");
    assert3.ok(/strength|stronger|strong/i.test(line), "variation should mention strength goal");
  }
  assert3.strictEqual(judgeFatigue(context), "protect");
}
function testEfficiencyOffer() {
  const context = buildContext2({
    symmetryNow: 78,
    readinessNow: 70
  });
  const output = generatePersonalizedFeedback(context, baseProfile);
  assert3.strictEqual(output.offerType, "efficiency");
  assert3.ok(output.message.primary.includes("off-balance"), "efficiency message should mention balance");
  assert3.strictEqual(output.plan, "tempo212");
  assert3.ok(hasPrimaryCta("Fix Form & Continue", output.ctas));
  assert3.ok(output.message.variations && output.message.variations.length >= 3);
  assert3.strictEqual(judgeFatigue(context), "neutral");
}
function testProgressOffer() {
  const context = buildContext2({
    readinessNow: 90,
    readinessChangePct: 1,
    historicalTrend: "up",
    fatigueFlag: false
  });
  const output = generatePersonalizedFeedback(context, baseProfile);
  assert3.strictEqual(output.offerType, "progress");
  assert3.ok(output.message.primary.includes("looking strong") || output.message.primary.includes("plenty of energy"));
  assert3.strictEqual(output.plan, "add12");
  assert3.ok(hasPrimaryCta("Add 1 Rep & Go", output.ctas));
  assert3.ok(output.message.variations && output.message.variations.length >= 3);
  assert3.strictEqual(judgeFatigue(context), "productive");
}
function testFoundationWarmupOffer() {
  const context = buildContext2({
    setNumber: 1,
    sessionStage: "warmup",
    readinessNow: 72,
    historicalTrend: "flat"
  });
  const output = generatePersonalizedFeedback(context, baseProfile);
  assert3.strictEqual(output.offerType, "foundation");
  const primaryLower = output.message.primary.toLowerCase();
  assert3.ok(primaryLower.includes("rest a bit") || primaryLower.includes("rest a moment"));
  assert3.strictEqual(output.plan, "hold");
  assert3.ok(hasPrimaryCta("Bank Next Set", output.ctas));
  assert3.ok(output.message.variations && output.message.variations.length >= 3);
  assert3.strictEqual(judgeFatigue(context), "neutral");
}
async function runTests3() {
  testRecoveryOffer();
  testEfficiencyOffer();
  testProgressOffer();
  testFoundationWarmupOffer();
}

// tests/voice.core.test.ts
import assert4 from "node:assert";

// CoachFeedbackCard.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var CoachFeedbackCard = ({ message }) => {
  const { primary, secondary, planLine, feelTarget } = message;
  const planText = planLine?.replace(/^Plan:\s*/i, "").trim();
  const cueText = feelTarget?.trim();
  const parts = [primary, secondary, planText, cueText].filter(
    (segment) => Boolean(segment && segment.length > 0)
  );
  const combinedText = parts.join(" ").replace(/\s+/g, " ").trim();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-full max-w-[360px] rounded-3xl border border-white/10 bg-slate-900/95 px-5 py-4 text-left shadow-2xl backdrop-blur-lg transition-opacity duration-120", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-sm font-semibold text-white leading-relaxed", children: combinedText }) });
};
var CoachFeedbackCard_default = CoachFeedbackCard;

// tests/voice.core.test.ts
var baseContext2 = {
  exerciseName: "Back Squat",
  setNumber: 2,
  readinessNow: 84,
  readinessChangePct: -6,
  setVolume: { reps: 6 },
  cumulativeChangePct: -8
};
var profile = {
  userId: "core-test",
  preferredPersona: "direct",
  preferredCue: "brace",
  explorationRate: 0
};
var buildContext3 = (overrides) => ({
  ...baseContext2,
  ...overrides,
  setVolume: overrides.setVolume ?? baseContext2.setVolume
});
var containsTag = (node, tag) => {
  if (node == null) return false;
  if (Array.isArray(node)) {
    return node.some((child) => containsTag(child, tag));
  }
  if (typeof node !== "object") return false;
  const element = node;
  if (element.type === tag) return true;
  return containsTag(element.props?.children, tag);
};
function testSmallDropWithFlag() {
  const output = generatePersonalizedFeedback(
    buildContext3({
      lastQualityFlagRep: 4
    }),
    profile
  );
  assert4.strictEqual(output.offerType, "foundation");
  assert4.strictEqual(output.plan, "hold");
  const primaryLower = output.message.primary.toLowerCase();
  assert4.ok(
    primaryLower.includes("good set") || primaryLower.includes("good work") || primaryLower.includes("rest a moment")
  );
  assert4.ok(output.ctas.some((cta) => cta.label.includes("Bank Next Set")));
  assert4.ok(output.message.variations && output.message.variations.length >= 3);
}
function testPushCaseWithTrend() {
  const output = generatePersonalizedFeedback(
    buildContext3({
      exerciseName: "Bench",
      setNumber: 3,
      readinessNow: 92,
      readinessChangePct: 2,
      historicalTrend: "up",
      cumulativeChangePct: -4
    }),
    profile
  );
  assert4.strictEqual(output.offerType, "progress");
  assert4.strictEqual(output.plan, "add12");
  assert4.ok(output.message.primary.includes("looking strong") || output.message.primary.includes("plenty of energy"));
  assert4.ok(output.ctas.some((cta) => cta.label.includes("Add 1 Rep")));
  assert4.ok(output.message.variations && output.message.variations.length >= 3);
}
function testSymmetryBranch() {
  const output = generatePersonalizedFeedback(
    buildContext3({
      readinessNow: 78,
      readinessChangePct: -2,
      symmetryNow: 76
    }),
    profile
  );
  assert4.strictEqual(output.offerType, "efficiency");
  assert4.strictEqual(output.plan, "tempo212");
  assert4.ok(output.message.primary.includes("off-balance"));
  assert4.ok(output.ctas.some((cta) => cta.label.includes("Fix Form")));
  assert4.ok(output.message.variations && output.message.variations.length >= 3);
}
function testAtomicRender() {
  const output = generatePersonalizedFeedback(
    buildContext3({
      readinessNow: 70,
      readinessChangePct: -11,
      cumulativeChangePct: -9
    }),
    profile
  );
  const element = CoachFeedbackCard_default({ message: output.message });
  assert4.strictEqual(element.type, "div");
  assert4.ok(!containsTag(element.props?.children, "button"));
}
function testCharacterLimitsRespected() {
  const output = generatePersonalizedFeedback(
    buildContext3({
      readinessNow: 95,
      readinessChangePct: 12,
      historicalTrend: "down",
      cumulativeChangePct: -5
    }),
    profile
  );
  assert4.ok(output.message.primary.length <= 140);
  assert4.strictEqual(output.message.secondary, "");
  assert4.strictEqual(output.message.planLine, "");
  assert4.strictEqual(output.message.feelTarget, "");
}
function testComputeReward() {
  const signal = {
    userId: "reward",
    scenario: "small_drop",
    variant: { persona: "calm", cue: "brace", cta: "drop5" },
    planFollowed: true,
    qualityImproved: true,
    readinessRebounded: false,
    thumbsUp: true,
    dwellMs: 3200
  };
  const reward = computeReward(signal);
  assert4.strictEqual(reward, 1 + 0.8 + 0 + 0.5 + 0.2);
}
function testExplorationDiversity() {
  const exploringProfile = {
    userId: "explore",
    explorationRate: 1
  };
  const personas = /* @__PURE__ */ new Set();
  const cues = /* @__PURE__ */ new Set();
  for (let i = 0; i < 50; i += 1) {
    const output = generatePersonalizedFeedback(baseContext2, exploringProfile);
    personas.add(output.personalization?.persona ?? "calm");
    cues.add(output.personalization?.cue ?? "brace");
  }
  assert4.ok(personas.size > 1, "Expected exploration to sample multiple personas");
  assert4.ok(cues.size > 1, "Expected exploration to sample multiple cues");
}
async function runTests4() {
  testSmallDropWithFlag();
  testPushCaseWithTrend();
  testSymmetryBranch();
  testAtomicRender();
  testCharacterLimitsRespected();
  testComputeReward();
  testExplorationDiversity();
}

// tests/index.ts
async function runTests5() {
  await runTests();
  await runTests2();
  await runTests3();
  await runTests4();
}
export {
  runTests5 as runTests
};
/*! Bundled license information:

react/cjs/react-jsx-runtime.production.js:
  (**
   * @license React
   * react-jsx-runtime.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.production.js:
  (**
   * @license React
   * react.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.development.js:
  (**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
