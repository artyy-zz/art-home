type PerfContext = Record<string, string | number | boolean | null | undefined>;

function formatContext(context?: PerfContext) {
  if (!context) {
    return "";
  }

  const entries = Object.entries(context)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${String(value)}`);

  return entries.length > 0 ? ` ${entries.join(" ")}` : "";
}

export function perfLog(label: string, durationMs: number, context?: PerfContext) {
  console.log(`[PERF] ${label} ${durationMs.toFixed(1)}ms${formatContext(context)}`);
}

export function perfDetailLog(label: string, durationMs: number, context?: PerfContext) {
  console.log(`[PERF_DETAIL] ${label} ${durationMs.toFixed(1)}ms${formatContext(context)}`);
}

export async function measureAsync<T>(
  label: string,
  callback: () => Promise<T>,
  context?: PerfContext,
) {
  const startedAt = performance.now();

  try {
    return await callback();
  } finally {
    perfLog(label, performance.now() - startedAt, context);
  }
}

export function measureSync<T>(label: string, callback: () => T, context?: PerfContext) {
  const startedAt = performance.now();

  try {
    return callback();
  } finally {
    perfLog(label, performance.now() - startedAt, context);
  }
}

export async function measureDetailAsync<T>(
  label: string,
  callback: () => Promise<T>,
  context?: PerfContext,
) {
  const startedAt = performance.now();

  try {
    return await callback();
  } finally {
    perfDetailLog(label, performance.now() - startedAt, context);
  }
}

export function measureDetailSync<T>(
  label: string,
  callback: () => T,
  context?: PerfContext,
) {
  const startedAt = performance.now();

  try {
    return callback();
  } finally {
    perfDetailLog(label, performance.now() - startedAt, context);
  }
}

export function withPagePerf<TArgs extends unknown[], TResult>(
  label: string,
  handler: (...args: TArgs) => Promise<TResult>,
) {
  return async (...args: TArgs) =>
    measureAsync(`page.serverRender ${label}`, async () => {
      const props = args[0] as { params?: Promise<{ locale?: string }> } | undefined;
      if (props?.params) {
        await measureDetailAsync(
          `${label}.i18n/locale loading`,
          () => props.params as Promise<{ locale?: string }>,
        );
      }

      return handler(...args);
    });
}

export function withApiPerf<TArgs extends unknown[], TResult>(
  label: string,
  handler: (...args: TArgs) => Promise<TResult>,
) {
  return async (...args: TArgs) =>
    measureAsync(`api.request ${label}`, () => handler(...args));
}
