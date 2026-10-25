export interface PhotoSaveDependencies {
  upload: () => Promise<void>;
  attach: () => Promise<void>;
  readAttached: () => Promise<boolean>;
  cleanup: () => Promise<void>;
}

/** Resolve ambiguous network results before removing an object or retrying a save. */
export async function saveStudentPhoto(deps: PhotoSaveDependencies) {
  try {
    await deps.upload();
    await deps.attach();
  } catch (failure) {
    let attached: boolean;
    try { attached = await deps.readAttached(); } catch {
      throw new Error('Could not confirm the photograph save. Keep this form open and retry when your connection returns.');
    }
    if (attached) return;
    try { await deps.cleanup(); } catch {
      throw new Error('The student is saved, but photograph cleanup is pending. Retry without registering another student.');
    }
    throw failure;
  }
}