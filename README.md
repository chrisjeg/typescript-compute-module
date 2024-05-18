# @chrisjeg/compute-module

![NPM Version](https://img.shields.io/npm/v/%40chrisjeg%2Fcompute-module)

Simple implementation of the Compute Module interface.

## Basic usage

```ts
import { ComputeModule } from "@chrisjeg/compute-module";

interface Definitions {
  addOne: {
    query: number;
    response: number;
  };
  stringify: {
    query: number;
    response: string;
  };
}

const myModule = new ComputeModule<Definitions>({
  logger: console,
});

myModule
  .on("addOne", async (n) => n + 1)
  .on("stringify", async (n) => "" + n)
  .default(() => ({ error: "Unsupported query name" }));
```
