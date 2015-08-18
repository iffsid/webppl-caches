"use strict"

/**
   Todo:
   - change recompProb to annealing rate based on collisions/recomputations
 **/

var LocalStorage = require('node-localstorage').LocalStorage;
var localStorage = new LocalStorage('/tmp/_localStorage'); // (location, quota)
var __globalCache__ = {};

function isERPString(s) {
  return s.search(/("val":).*("prob":)/) > 0
}

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
      _.each(__globalCache__, function(v, k) {
        localStorage.setItem(k, JSON.stringify(v));
      });
    } else {
      localStorage.setItem(label, JSON.stringify(__globalCache__[label]));
    }
    return k(s, undefined);
  }

  function restoreCacheFromStore(s, k, a, label) {
    var restoredString = localStorage.getItem(label);
    if (restoredString !== null) {
      __globalCache__[label] = isERPString(restoredString) ?
        erpFromString(restoredString) :
        JSON.parse(restoredString);
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
      var stringedArgs = JSON.stringify(args);
      var foundInCache = stringedArgs in c;
      if (foundInCache) {
        return k(s, c[stringedArgs]);
      } else {                           // recompute
        var newk = function(s, r) {
          if (stringedArgs in c) {
            // This can happen when cache is used on recursive functions
            console.log('Already in cache:', stringedArgs);
            if (JSON.stringify(c[stringedArgs]) !== JSON.stringify(r)) {
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
      var stringedArgs = JSON.stringify(args);
      var foundInCache = stringedArgs in c;
      var recomp = Math.random() < recompProb;
      if (foundInCache && !recomp) {      // return stored value
        return k(s, c[stringedArgs]);
      } else {                           // recompute
        var newk = function(s, r) {
          var prev = foundInCache ? c[stringedArgs] : null;
          var nk = function(s, v) {
            c[stringedArgs] = v;
            return k(s, v);
          };
          if (foundInCache) {           // aggregate with prev value
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

  return {
    localStorageClearAll: localStorageClearAll,
    localStorageClear: localStorageClear,
    saveCacheToStore: saveCacheToStore,
    restoreCacheFromStore: restoreCacheFromStore,
    cacheLS: cacheLS,
    stochasticCacheLS: stochasticCacheLS
  };
};
