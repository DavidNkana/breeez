export type ChildWriteError = { code?: string; message?: string };

type Operation = (rows: any[]) => Promise<{ error: ChildWriteError | null }>;

/** Replace both child collections, restoring the previous state if any write fails. */
export async function replaceProductChildren<TImage, TVariant>(input: {
  images: TImage[];
  previousImages: TImage[];
  variants: TVariant[];
  previousVariants: TVariant[];
  deleteImages: Operation;
  insertImages: Operation;
  deleteVariants: Operation;
  insertVariants: Operation;
}): Promise<void> {
  let imagesChanged = false;
  let variantsChanged = false;

  try {
    let result = await input.deleteImages([]);
    if (result.error) throw result.error;
    imagesChanged = true;

    result = await input.insertImages(input.images);
    if (result.error) throw result.error;

    result = await input.deleteVariants([]);
    if (result.error) throw result.error;
    variantsChanged = true;

    result = await input.insertVariants(input.variants);
    if (result.error) throw result.error;
  } catch (caught) {
    const error = asChildWriteError(caught);
    const rollbackErrors: string[] = [];

    if (variantsChanged) {
      const deleted = await input.deleteVariants([]);
      if (deleted.error) rollbackErrors.push(`variant cleanup failed: ${deleted.error.message || 'unknown error'}`);
      else {
        const restored = await input.insertVariants(input.previousVariants);
        if (restored.error) rollbackErrors.push(`variant restore failed: ${restored.error.message || 'unknown error'}`);
      }
    }
    if (imagesChanged) {
      const deleted = await input.deleteImages([]);
      if (deleted.error) rollbackErrors.push(`image cleanup failed: ${deleted.error.message || 'unknown error'}`);
      else {
        const restored = await input.insertImages(input.previousImages);
        if (restored.error) rollbackErrors.push(`image restore failed: ${restored.error.message || 'unknown error'}`);
      }
    }

    const suffix = rollbackErrors.length > 0 ? `; ${rollbackErrors.join('; ')}` : '';
    throw { ...error, message: `${error.message || 'Failed to save product children'}${suffix}` };
  }
}

function asChildWriteError(value: unknown): ChildWriteError {
  if (value && typeof value === 'object' && typeof (value as ChildWriteError).message === 'string') {
    return value as ChildWriteError;
  }
  return { message: 'Failed to save product children' };
}
