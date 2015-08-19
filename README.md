## Caching functions for Webppl

Provides the following conveniences for caching in [WebPPL](http://webppl.org/)

#### `localStorageClearAll`

Webppl function to completely clear out the localStorage

#### `localStorageClear`

Webppl function to clear out particular elements from the localStorage

#### `saveCacheToStore`

Webppl function to save a particular function's cache to localStorage

#### `restoreCacheFromStore`

Webppl function to restore particular function's cache from localStorage

#### `cacheLS`

Webppl function memoizer that enables saving/resoring with localStorage

###### Example

``` js
var modelName = 'simple';

var _simpleConditioning = function(p) {
  return Enumerate(function() {
    var x = flip(p);
    var y = flip(p);
    factor((x || y) ? 0 : -Infinity);
    return x;
  })
};

// localStorageClear(modelName) // clears out persistent cache when required
restoreCacheFromStore(modelName);

var simpleConditioning = cacheLS(modelName, _simpleConditioning);
var p = 0.5;
var result = simpleConditioning(p);

saveCacheToStore(modelName);

// First run of this program will compute the value
// // Every subsequent invocation of program will reuse from cache
console.log('Distribution for filp-probability = ' + p + ' is:');
result.print();
```

#### `stochasticCacheLS`

Webppl function memoizer that is _aggregative_ and _stochastic_.

* _aggregative_: takes an aggregator that specifies how to combine previously
cached values and new value
* _stochastic_: takes a recomputation probability that is used to decide if,
  when a candidate value is present in the cache, whether to recompute and
  aggregate, or simply return cached value -- trading-off speed for convergence

###### Example

``` js
var modelName = 'gaussianMean';
var recomputeProb = 0.6;

var meanAgg = function(cachedV, newV) {
  var totalwt = cachedV.wt + newV.wt;
  return {mean: (cachedV.mean * cachedV.wt + newV.mean * newV.wt) / totalwt,
          wt: totalwt}
};

var myFn = function (mu) {
  var erpA = ParticleFilter(function() {
    var x = gaussian(mu, 2.0);
    return x
  }, 100);
  return {mean: expectation(erpA), wt: 1};
}

// localStorageClear(modelName); // clears out persistent cache when required
restoreCacheFromStore(modelName);

var myCachingFn = stochasticCacheLS(modelName, myFn, meanAgg, recomputeProb);
var result = myCachingFn(1.0);

saveCacheToStore(modelName);

// expection should converge to the mean over time (repeated invocation)
console.log('Expected Value of Model:', result.mean);
```

### Dependencies

- [`node-localstorage`](https://www.npmjs.com/package/node-localstorage)
