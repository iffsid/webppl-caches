### Caching functions for Webppl:

* `stochasticCacheLS` is a _aggregative_, _stochastic_ cache
* provides handles for saving (`saveCacheToStore`) and restoring
(`restoreCacheFromStore`) the accumulated cache to `localStore`, along with
means to clean up `localStore` when required (`localStorageClear` and
`localStorageClearAll`).

#### Cache properties:

* _aggregative_: takes an aggregator that specifies how to combine previously
cached values and new value
* _stochastic_: takes a recomputation probability that is used to decide if,
  when a candidate value is present in the cache, whether to recompute and
  aggregate, or simply return cached value -- trading-off speed for convergence

#### Example

Put this package in a location where `webppl` can pick it up (instructions [here](https://github.com/probmods/webppl#packages)).
If the following snippet is called `test.wppl`, then this package is used as:

    webppl --require webppl-caches test.wppl

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
