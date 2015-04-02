(function (angular) {
  'use strict';

  var mutagen = angular.module('fv.mutagen', []);

  var events = {
      added: 'addedNodes',
      removed: 'removedNodes'
    },
    configFlags = [
      'children',
      'attributes',
      'characterData'
    ],
    directives = {
      onAddNode: 'added',
      onRemoveNode: 'removed'
    };

  var createObserverFactory = function createObserverFactory($window) {
    var Observer = function Observer(element, opts) {
      opts = opts || {};
      this._flags = configFlags.filter(function (flag) {
        return opts[flag];
      });
      this._node = element[0];
      this._observer = $window.MutationObserver(this._mutationHandler);
      this._handlers = {};
      angular.forEach(events, function (event) {
        this._handlers[event] = [];
      }, this);
    };

    Observer.prototype = {
      _mutationHandler: function mutationHandler(mutations) {
        var flags = this._flags;

        mutations
          .filter(function (mutation) {
            return ~flags.indexOf(mutation.type);
          })
          .forEach(function (mutation) {
            angular.forEach(events, function (recordProp) {
              if (mutation[recordProp] !== null ||
                mutation[recordProp].length) {
                angular.forEach(this._handlers[recordProp],
                  function (handler) {
                    handler(mutation);
                  });
              }
            }, this);
          }, this);
      },
      connect: function connect() {
        if (!this._connected) {
          this._observer.observe(this._node, this._flags);
          this._connected = true;
        }
      },
      disconnect: function disconnect() {
        if (this._connected) {
          this._observer.disconnect();
        }
      },
      on: function on(event, callback) {
        var eventType = events[event];
        this._handlers[eventType].push(callback);
        return angular.bind(this, function (eventType, callback) {
          var handlers = this._handlers[eventType];
          handlers.splice(handlers.indexOf(callback), 1);
        }, eventType, callback);
      }
    };


    return function createObserver(element, opts) {
      return new Observer(element, opts || {});
    };
  };
  createObserverFactory.$inject = ['$window'];

  var bind = function bind(observer, event, scope, exp) {
    return observer.on(event, function () {
      scope.$apply(exp);
    });
  };

  angular.forEach(directives, function (attr, event) {
    mutagen.directive(attr, ['createObserver', function (createObserver) {
      return {
        compile: function (tElement) {
          var observer = createObserver(tElement, {
            children: true
          });
          return function (scope, element, attrs) {
            var handlers = [],
              exp = attrs[attr];

            if (exp) {
              handlers.push(bind(observer, event, scope, exp));
              observer.connect();
              scope.$on('$destroy', function () {
                observer.disconnect();
              });
            }
          };
        }
      };
    }]);
  });

}(window.angular));
