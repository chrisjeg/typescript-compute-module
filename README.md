# foundry-compute-module

## Basic usage

```ts
import { FoundryComputeModule } from "foundry-compute-module";

interface Functions {
  addOne: {
    query: number;
    response: number;
  };
  stringify: {
    query: number;
    response: string;
  };
}

const myModule = new FoundryComputeModule<Functions>({
  logger: console,
});

myModule
  .on("addOne", async (n) => n + 1)
  .on("stringify", async (n) => "" + n)
  .default(() => ({ __unsupported: true }));
```
