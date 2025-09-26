// product.utils.ts
import { InventorySchema } from './schemas/inventory.schema';

export function getInventorySchemaStructure() {
  const paths = InventorySchema.paths;
  const structure = {};

  for (const path in paths) {
    const field = paths[path];

    // Filter out internal fields like __v, _id
    if (['__v', '_id'].includes(path)) continue;

    structure[path] = {
      type: field.instance,
      required: InventorySchema.requiredPaths().includes(path),
    };
  }

  return structure;
}
