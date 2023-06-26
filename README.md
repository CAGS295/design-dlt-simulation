# Model-based simulation for blockchain.

## TLDR:
- Initial assessment indicates that DevnetJS may be too slow for fuzz testing.
- Implementing tests in TypeScript, close to the source, can be beneficial. This allows people to test their smart contracts using the provided test suite as examples.
- The core of the test suite can be built using Clarinet's Deno tools and 'fast-check'.
- The suite should include useful tools ranging from unit testing to long-running simulation.
- A model-based approach can be adopted to simulate traffic, monitor stability, and assess performance.
- Breaking up the model into submodels can help track invariants more effectively and expose corner cases more frequently.
- To handle non-embarrassing parallelism, a pub-sub pattern or actors can be used.

The main component of the suite is a lightweight simulation suite that consists of reusable middleware components. These components generate and monitor modeled behavior, enabling anomaly detection.
While fuzz testing is effective in detecting input-induced undefined behavior, it does not replace unit testing or integration testing. HAving the three, it is convenient to reuse tools across all three types of testing.
However, fuzzing alone may not accurately model side effects caused by concurrency and partial observability in a distributed system. Therefore, a long-running simulation tool that serves the dual purpose of integration testing and invariant testing fits well into the development cycle. By sharing the same tools, tests can be seamlessly implemented across unit testing, regression testing, fuzzing, invariant testing, and model-based testing.

When considering unit testing, regression testing, and fuzzing, it is important to pay close attention to read-write differences and cyclomatic complexity differences in smart contracts. These factors can complement code coverage and help identify when additional tests are needed. Currently, there are no known tools specifically designed for this purpose. In the Substrate framework, benchmarking contracts were annotated with the reads/writes for each address in the on-chain address space.

## High-level Requirements
- The simulation suite should be flexible and modular to cover a wide range of use cases with minimal developer friction.
- It should provide primitives for testing stress, security, atomicity, consistency, performance, and correctness in end-to-end QA pipelines.
- The suite should support a CI mode with early exits, allowing the system to exit with an error when an anomaly is detected.
- Long-running simulation mode should be available, where failures are handled without aborting the application. Traces and diagnostics should be captured for analysis.
- The behavior of the system should be traceable.
- TypeScript should be the primary language for implementation.

# Design patterns.

Clarinet can be used for testing smart contracts as it offers a fast runtime and user-friendly tools. Other smart contract developers will find tests written in TypeScript valuable as examples.
'fast-check' integrates well with Deno and Clarinet. A [Ping-Pong](contracts/ping-pong.clar) contract and two 'fast-check' examples are provided. One example demonstrates regular [unit-testing/regression-testing](tests/ping-pong_unit_test.ts), while the other showcases [model-based/invariant](tests/ping-pong_model_test.ts) testing.
If necessary, the generator primitives in 'fast-check' can be used to build a custom simulation engine, although this is unlikely to be required. To support non-trivial parallelism, it is recommended to adopt a common and flexible pattern such as actors with channels or a pub-sub pattern. An example of event-driven pub-sub can be found in [actors.ts](src/actors.ts). This pattern enables communication between composable tasks. The provided example has a round trip time of 2ms, making it suitable for light performance profiling or other non-performance-critical tasks.

### Model-based simulation and testing.

Modeling invariant testing can be challenging with a single model. The distribution of events can be highly skewed, and critical events may not be sampled frequently enough. Additionally, maintaining a large and complex model can be burdensome. One approach is to model the system as a directed graph and break it down into well-connected subgraphs. This enables parallel sampling, where two different models can simultaneously search for exploits using different strategies. The concept of [strongly connected components](https://cdn.programiz.com/sites/tutorial2program/files/scc-strongly-connected-components.png) can be used as a reference for splitting the model. Alternatively, unsupervised clustering can be considered if a suitable distance metric can be identified. To effectively utilize submodels, it is important to prune vertices while still generating variates according to the conditional probabilities of the pruned subgraph. For example, if vertices X, Y, and Z connected to vertex A are pruned, A should generate variates based on the probability P(A | X, Y, Z). Failing to consider this can lead to divergence between the submodel and the complete model, resulting in the loss of corner cases and different test results.

'fast-check' provides built-in replay strings. Although no example is provided, the reduced case and replay path should be included in the test. Additionally, a context is available to append logs to the counterexamples for debugging local state. When verbose logging is enabled, the complete command execution list can be obtained if needed.

## Methodology

To simplify the system into a model, start by creating a detailed description of how the smart contract behaves, including side effects. Consider pre- and post-conditions as well as invariants. Define transitions between states, where edges represent smart contract calls or external events. If the model becomes too complex, it can be broken down into submodels. The missing transitions should be filled by the connecting vertex, following the same generation pattern as the pruned graph, for each vertex that affects the conditional probability of the connecting vertex.

Implement one test per submodel. Once the submodels are well-defined, optionally, connect the vertices to enable better exploration (in fast-check terms always return true from the 'check()'). However, keep in mind that this approach requires handling a quadratic number of states, as any vertex can transition to other states. 'fast-check' can provide insights into the distribution of generators through 'fc.statistics' and 'fc.sample'. One useful technique that can be explored is duplicating commands in model-based tests to skew the event distribution. It should be noted that the generation process can be wasteful at times. For example, permutations or combinations may be required, but the generators explored so far may naively generate values.

If properties involve block height, it may be necessary to explore batching multiple transactions (events) per block, considering that height is monotonically increasing. It is important to test the feasibility of finding corner cases before running out of space, although this is unlikely. No sequence of dependent events can be excessively long and also depend on block height.

### Event-driven: pub-sub/channels

Looking at DevnetJS, it appears that independent callbacks are preferred, as evidenced by the frequent use of channels to allow for spawning and forgetting threads.
There are multiple ways to implement the same functionality. Independent tasks are ideal, with options for forking, joining, or respawning when necessary, especially if task lifetimes overlap. Another alternative is to use actors when long-lived parallel routines with background I/O are required. Actors can be implemented on top of channels, such as 'amqplib', or by leveraging existing libraries like 'Nact'.
An example of a minimal event-driven implementation is provided, demonstrating pub-sub communication using RxJS. The actor example showcases reusability and simple communication patterns for scenarios involving heavy parallelism.

### Requirements
- Each test should have command transitions modeled for property testing, including fuzzing and beyond.
- Clarinet provides a smart contract runtime for testing.
- Chain interaction should be explicit and on-demand, including:
    - Calling readonly state
    - Advancing block height with empty blocks
    - Advancing height with a filled block
    - Fast-forwarding height
    - Switching epochs
- Burner chain state should be available if required or actively faked.
- Shrinking capabilities are not necessary.
- Data structure generators should be provided.
- Data generators should be available.
- Pre and post-setup should be easy and fast.
- Model-based and below latency should be below one second.
- Users should have the ability to define runs and replay capabilities.
- Parallelism should be supported at all levels of testing.

## Reference

[Niko's fast-check integration examples](https://blog.nikosbaxevanis.com/2022/03/15/clarity-clarity-model-based-testing-primer/#how-typescript-types-map-into-clarity-types)

[stacks-e2e-testing repo](https://github.com/hirosystems/stacks-e2e-testing)

[stacks-blockchain repo](https://github.com/stacks-network/stacks-blockchain)

[clarity docs](https://docs.stacks.co/docs/clarity)

[fast-check docs](https://fast-check.dev/docs/introduction)

[Aaron's and Niko's discussion](https://github.com/stacks-network/stacks-blockchain/discussions/3732)

