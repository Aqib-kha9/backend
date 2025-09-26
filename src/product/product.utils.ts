// product.utils.ts
import { ProductSchema } from './schemas/product.schema';

export function getProductSchemaStructure() {
  const paths = ProductSchema.paths;
  const structure = {};

  for (const path in paths) {
    const field = paths[path];

    // Filter out internal fields like __v, _id
    if (['__v', '_id'].includes(path)) continue;

    structure[path] = {
      type: field.instance,
      required: ProductSchema.requiredPaths().includes(path),
    };
  }

  return structure;
}
