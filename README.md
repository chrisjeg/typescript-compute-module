# @chrisjeg/compute-module

[![npm version](https://img.shields.io/npm/v/%40chrisjeg%2Fcompute-module?style=flat)](https://www.npmjs.com/package/@chrisjeg/compute-module)

Simple implementation of the Compute Module interface. Definitions are generated using [typebox](https://github.com/sinclairzx81/typebox) allowing the Compute Module to register functions at runtime, while maintaining typesafety at compile time.

This library is dependent on "Runtime V1", if not provided this will not work

## Basic usage

```ts
import { ComputeModule } from "@chrisjeg/compute-module";
import { Type } from "@sinclair/typebox";

const myModule = new ComputeModule({
  logger: console,
  definitions: {
    addOne: {
      input: Type.Number(),
      output: Type.Number(),
    },
    stringify: {
      input: Type.Number(),
      output: Type.String(),
    },
  },
});

myModule
  .on("addOne", async (n) => n + 1)
  .on("stringify", async (n) => "" + n)
  .default(() => ({ error: "Unsupported query name" }));
```
