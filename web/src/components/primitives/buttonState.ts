let primaryButtonMountedCount = 0;

export function resetPrimaryButtonCountForTesting() {
  primaryButtonMountedCount = 0;
}

export function getPrimaryButtonCount() {
  return primaryButtonMountedCount;
}

export function incrementPrimaryButtonCount() {
  primaryButtonMountedCount++;
  return primaryButtonMountedCount;
}

export function decrementPrimaryButtonCount() {
  primaryButtonMountedCount = Math.max(0, primaryButtonMountedCount - 1);
  return primaryButtonMountedCount;
}
