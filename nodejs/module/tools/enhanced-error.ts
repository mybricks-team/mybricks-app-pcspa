export default class EnhancedError extends Error {
  errorDetailMessage: string;
  comId: string;
  constructor(errMsg: string, { errorDetailMessage, comId }: { errorDetailMessage: string, comId?: string }) {
    super(errMsg);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnhancedError);
    }

    this.name = "EnhancedError";
    this.errorDetailMessage = errorDetailMessage;
    this.comId = comId;
  }
}