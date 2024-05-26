export interface Schema {
  name: string;
  inputType: StructType;
  outputType: DataType;
}

interface StructType {
  fields: Entry[];
}

interface Entry {
  name: string;
  type: DataType;
}

interface ListType {
  type: "listType";
  elementType: DataType;
}

type DataType = PrimitiveType | ComplexType | UnknownType;

interface PrimitiveType {
  type: "primitiveType";
  primitiveType: "BOOL" | "INT" | "FLOAT" | "STRING";
}

interface ComplexType {
  type: "complexType";
  complexType: StructType | ListType;
}

interface UnknownType {
  type: "unknownType";
  unknownType: {};
}
