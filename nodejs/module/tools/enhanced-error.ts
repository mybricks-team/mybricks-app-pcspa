export default class EnhancedError extends Error {
  errorDetailMessage: string;
  constructor(errMsg: string, { errorDetailMessage }: { errorDetailMessage: string }) {
    super(errMsg);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnhancedError);
    }

    this.name = "EnhancedError";
    this.errorDetailMessage = errorDetailMessage;
  }
}