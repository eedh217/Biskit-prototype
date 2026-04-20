type GuardFn = () => boolean;

let _guard: GuardFn | null = null;

export const setNavigationGuard = (fn: GuardFn | null): void => {
  _guard = fn;
};

export const checkNavigationGuard = (): boolean => {
  if (!_guard) return true;
  return _guard();
};
