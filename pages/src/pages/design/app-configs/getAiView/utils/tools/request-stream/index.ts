import { createBaseRequestStream } from './base';
import { DEFAULT_RETRIES } from './constants';
import { wrapRequestStreamWithRetry } from './retry';
import type { CreateRequestStreamConfig, StreamRequestFn } from './types';

export * from './types';

export function createRequestStream(config: CreateRequestStreamConfig): StreamRequestFn {
  const baseRequest = createBaseRequestStream(config);
  return wrapRequestStreamWithRetry(
    baseRequest,
    { maxRetries: config.retries ?? DEFAULT_RETRIES },
    config.onRetry
  );
}
