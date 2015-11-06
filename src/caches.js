"use strict"

var LocalStorage = require('node-localstorage').LocalStorage;
var localStorage = new LocalStorage('/tmp/_localStorage'); // (location, quota)
var __globalCache__ = {};

module.exports = function(env) {

  function localStorageClearAll(s, k, a) {
    localStorage.clear();
    return k(s, undefined);
  }

  function localStorageClear(s, k, a, label) {
    localStorage.removeItem(label);
    return k(s, undefined);
  }

  function saveCacheToStore(s, k, a, label) {
    if (label === undefined) {  // save all of __globalStore__
      _.forEach(__globalCache__, function(v, k) {
        localStorage.setItem(k, util.serialize(v));
      });
    } else {
      localStorage.setItem(label, util.serialize(__globalCache__[label]));
    }
    return k(s, undefined);
  }

  function restoreCacheFromStore(s, k, a, label) {
    var restoredString = localStorage.getItem(label);
    if (restoredString !== null) {
      __globalCache__[label] = _.mapObject(util.deserialize(restoredString), function(v) {
        return _.has(v, 'probs') && _.has(v, 'support')
          ? makeCategoricalERP(v.probs, v.support, _.omit(v, 'probs', 'support'))
          : v;
      });
    }
    return k(s, undefined);
  }

  function cacheLS(s, k, a, label, f) {
    if (__globalCache__[label] === undefined) {
      __globalCache__[label] = {};
    }
    var c = __globalCache__[label];
    var cf = function(s, k, a) {
      var args = Array.prototype.slice.call(arguments, 3);
      var stringedArgs = util.serialize(args);
      var foundInCache = stringedArgs in c;
      if (foundInCache) {
        return k(s, c[stringedArgs]);
      } else {                           // recompute
        var newk = function(s, r) {
          if (stringedArgs in c) {
            // This can happen when cache is used on recursive functions
            console.log('Already in cache:', stringedArgs);
            if (util.serialize(c[stringedArgs]) !== util.serialize(r)) {
              console.log('OLD AND NEW CACHE VALUE DIFFER!');
              console.log('Old value:', c[stringedArgs]);
              console.log('New value:', r);
            }
          }
          c[stringedArgs] = r;
          return k(s, r);
        };
        return f.apply(this, [s, newk, a].concat(args));
      }
    };
    return k(s, cf);
  }

  function stochasticCacheLS(s, k, a, label, f, aggregator, recompProb) {
    if (__globalCache__[label] === undefined) {
      __globalCache__[label] = {};
    }
    var c = __globalCache__[label];
    var cf = function(s, k, a) {
      var args = Array.prototype.slice.call(arguments, 3);
      var stringedArgs = util.serialize(args);
      var foundInCache = stringedArgs in c;
      var recomp = Math.random() < recompProb;
      if (foundInCache && !recomp) {      // return stored value
        return k(s, c[stringedArgs]);
      } else {                           // recompute
        var newk = function(s, r) {
          var nk = function(s, v) {
            c[stringedArgs] = v;
            return k(s, v);
          };
          if (foundInCache) {           // aggregate with prev value
            var prev = c[stringedArgs];
            return aggregator.apply(this, [s, nk, a].concat([prev, r]))
          } else {                      // just return current value
            return nk(s, r);
          }
        };
        return f.apply(this, [s, newk, a].concat(args));
      }
    };
    return k(s, cf);
  }

  function annealingCacheLS(s, k, a, label, f, aggregator, annealingRate) {
    if (__globalCache__[label] === undefined) {
      __globalCache__[label] = {};
    }
    var c = __globalCache__[label];
    var cf = function(s, k, a) {
      var args = Array.prototype.slice.call(arguments, 3);
      var stringedArgs = util.serialize(args);
      var foundInCache = stringedArgs in c;
      var recomp = foundInCache ?
          Math.random() < Math.pow(annealingRate, c[stringedArgs].ctr) :
          true;
      if (foundInCache && !recomp) {      // return stored value
        return k(s, c[stringedArgs].value);
      } else {                           // recompute
        var newk = function(s, r) {
          var nk = function(s, v) {
            var ctr = prev ? prev.ctr + 1 : 1;
            c[stringedArgs] = {value: v, ctr: ctr};
            return k(s, v);
          };
          if (foundInCache) {           // aggregate with prev value
            var prev = c[stringedArgs];
            return aggregator.apply(this, [s, nk, a].concat([prev.value, r]))
          } else {                      // just return current value
            return nk(s, r);
          }
        };
        return f.apply(this, [s, newk, a].concat(args));
      }
    };
    return k(s, cf);
  }

  return {
    localStorageClearAll: localStorageClearAll,
    localStorageClear: localStorageClear,
    saveCacheToStore: saveCacheToStore,
    restoreCacheFromStore: restoreCacheFromStore,
    cacheLS: cacheLS,
    stochasticCacheLS: stochasticCacheLS,
    annealingCacheLS: annealingCacheLS
  };
};
