# Testing suite based on real-time simulation for blockchain.

The core of it is a lightweight simulation suite—reusable middleware components to generate and monitor modeled behavior and anomaly detection.

Fuzz testing is effective to catch input-induced undefined behavior. Side effects due to concurrency and partial observability in a distributed system are hard to model by fuzzing alone. 

The generative suite is ‘conceptually’ divided into actors and watchers. Actors work following a model and simulate users interacting with your system. Actors can follow an seemingly-random or a property-based action policy. Sometimes there are metrics and state changes that capture collective behavior modeled by actors, e.g. block production should not be stalled invariantly from independent and heterogenous user activity.

 Watchers track and observe the system-wide state, metrics, or Actors; looking for patterns, anomalies, asserting invariants, and postconditions outside of an Actor's scope. E.g. An actor may be transfering funds back and forth between Alice and Bob while a watcher tracks tps. This allows extending the simulation by adding new Actors without for free without changing logic pertaining system requirements.

## Requirements
 - The simulation suite should be flexible and modular to cover many usecases without much developer friction. 
 - Primitives to test Stress, Security, Atomicity, Consistency, Performance, Correctness in end-to-end QA pipelines.
 - CI mode with early exits. The system can exit with error when an anomaly is found. 
 - Long-running simulation mode. Failures are handled without aborting the application.
 - Traceable behavior. Watcher's can explain what led to its trigger.

 # Design patterns. 

 ### Event-driven: pub-sub.
 - Reusable Middleware to extend Actor's capabilities.
 - Build the simulation suite on top of fast-check to reuse smart-contracts property-based components.
 - Strategy: Implement independent fast-check classes to avoid nonce/ordering issues. Or else, synchronize nonces.

 ### Minimal actor implementation with pub-sub comunication with rxjs and worker_threads.

The suite can be used as a long-running process with a persistent network and/or integrated into CI. This is to accommodate different quality control stages in the pipeline. 

## Implementation patterns.

TODO: reference and answer concerns in #3207
Capture a test and migrate it to the new suite.

Pros and cons of simulation in different environments.
Production/Staging/Dev.

## Smart contract testing:
> clarinet test --cost

### Requirements
- Each test should have command transitions modeled for property testing.
- clarity runtime provided by Clarinet.
- 


    TODO: fast-check
    TODO: minimal example.
    TODO: explore lockups.

## Stress testing.

TODO explain what is the underlying task.

Define and implement happy paths for some unique tasks _S_ in an execution interface _E_. I.e. { Bob stakes., Bob transfers Alice.}.


### Load: 

Wrap the tasks in a middleware _D_ that executes the underlying _E_ and sleeps for _P(X)_ where _P_ is a probabilistic distribution.
Randomly generate _n_ instances of $D(E,P(X) | S, r)$ given _S_ and randomness source _r_. Spawn actors _D_ at a known cadence until you have _n_ long living actors to let the chain catch up.

Set watchers for metrics such as throughput, transactions per block and latency, transaction pool count.

### Spikes:

Wrap the tasks in a middleware _Sp_ that executes and times (_tock_ - _tick_) the underlying _E_ and sleeps/spins in a synchronized wall for $max(P(X)-Δ,0)$ where _P_ is a probabilistic distribution.
Randomly generate _n_ instances of $D(E,P(X) | S, r)$ given _S_ and shared randomness source _r_. Spawn actors _Sp_ at a known cadence until you have _n_ long living actors to let the chain catch up.

Set watchers for metrics such as throughput, transactions per block and latency, transaction pool count.

Implementation Patterns:
- Actor framework
- Event-bus


## Reference
[fast-check commands](https://blog.nikosbaxevanis.com/2022/03/15/clarity-clarity-model-based-testing-primer/#how-typescript-types-map-into-clarity-types)