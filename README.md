# @chrisjeg/compute-module

[![npm version](https://img.shields.io/npm/v/%40chrisjeg%2Fcompute-module?style=flat)](https://www.npmjs.com/package/@chrisjeg/compute-module)

Node.JS compatible implementation of the Compute Module interface. Definitions are generated using [typebox](https://github.com/sinclairzx81/typebox) allowing the Compute Module to register functions at runtime, while maintaining typesafety at compile time.

This library is dependent on "Runtime V1", if not provided this will not work.

## Functions Mode

### Basic usage

This library can be used untyped with vanilla JavaScript to generate registerable functions in "Functions" execution mode.

```js
import { ComputeModule } from "@chrisjeg/compute-module";

new ComputeModule()
  .on("addOne", async (n) => n + 1)
  .on("stringify", async (n) => "" + n)
  .default(() => ({ error: "Unsupported query name" }));
```

### Schema registration

Definitions can be generated using [typebox](https://github.com/sinclairzx81/typebox) allowing the Compute Module to register functions at runtime, while maintaining typesafety at compile time.

```ts
import { ComputeModule } from "@chrisjeg/compute-module";
import { Type } from "@sinclair/typebox";

const myModule = new ComputeModule({
  logger: console,
  definitions: {
    addOne: {
      input: Type.Object({
        value: Type.Number(),
      }),
      output: Type.Object({ value: Type.Number() }),
    },
  },
});

myModule.on("addOne", async (n) => n + 1);
```

## Pipelines Mode

### Retrieving source credentials

Sources can be used to store secrets for use within a Compute Module, they prevent you from having to put secrets in your container or in plaintext in the job specification. Retrieving a source credential using this library is simple:

```ts
const myModule = new ComputeModule();
const myCredential = await myModule.getCredential(
  "mySourceApiName",
  "MyCredential"
);
```

As a file is mounted at runtime, getCredential returns a promise that will resolve once the file is mounted to avoid race conditions.
