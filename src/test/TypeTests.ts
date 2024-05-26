import { Type } from "@sinclair/typebox";
import { ComputeModule } from "../ComputeModule";

describe("Type tests", () => {
  it("should have the same types", () => {
    const module = new ComputeModule({
      definitions: {
        isFirstName: {
          input: Type.Object({
            firstName: Type.String(),
          }),
          output: Type.Boolean(),
        },
      },
    });
    expect(module).toBeDefined();
  });
});
