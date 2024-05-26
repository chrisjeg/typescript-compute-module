import {
  TObject,
  TBoolean,
  TInteger,
  TNumber,
  TString,
  TArray,
  TSchema,
} from "@sinclair/typebox";
import { Schema } from "./schemaTypes";

export type SupportedTypeboxTypes =
  | TObject
  | TBoolean
  | TInteger
  | TNumber
  | TString
  | TArray;

// Function to convert JSON Schema to our custom Schema type
export function convertJsonSchemaToCustomSchema(
  schemaName: string,
  input: TObject,
  output: SupportedTypeboxTypes
): Schema {
  return {
    name: schemaName,
    inputType: convertPropertiesToStructType(input).structType,
    outputType: convertJsonType(output),
  };
}

function convertPropertiesToStructType({
  properties,
}: TObject): Schema.StructType {
  const entries: Schema.Entry[] = Object.keys(properties).map((key) => ({
    name: key,
    type: convertJsonType(properties[key]),
  }));
  return {
    type: "structType",
    structType: {
      fields: entries,
    },
  };
}

function convertJsonType(jsonType: TSchema): Schema.DataType {
  switch (jsonType.type) {
    case "object":
      return {
        type: "complexType",
        complexType: convertPropertiesToStructType(jsonType as TObject),
      };
    case "array":
      return {
        type: "complexType",
        complexType: {
          type: "listType",
          elementType: convertJsonType(jsonType.items),
        },
      };
    case "boolean":
      return { type: "primitiveType", primitiveType: "BOOL" };
    case "integer":
      return { type: "primitiveType", primitiveType: "INT" };
    case "number":
      return { type: "primitiveType", primitiveType: "FLOAT" };
    case "string":
      return { type: "primitiveType", primitiveType: "STRING" };
    default:
      return { type: "unknownType", unknownType: {} };
  }
}
