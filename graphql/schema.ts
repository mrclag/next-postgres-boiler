import { makeSchema, connectionPlugin } from 'nexus'
import { join } from "path";
import * as types from './types'

export const schema = makeSchema({
  types,
  plugins: [
    connectionPlugin(),
  ],
  outputs: {
    typegen: join(
      process.cwd(),
      // nextus generates types automatically - autocomplete, typesafety
      // index.d.ts is the declaration file for types
      "node_modules","@types","nexus-typegen","index.d.ts"
      ),
      // will see generated schema in the graphql directory
    schema: join(process.cwd(), "graphql", "schema.graphql"),
  },
  // importing context
  contextType: {
    export: "Context",
    module: join(process.cwd(), "graphql", "context.ts"),
  },
});