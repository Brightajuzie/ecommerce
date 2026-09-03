import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { MulterError } from "multer";

// Multer's own upload-limit errors (LIMIT_FILE_SIZE and friends) are plain
// Errors, not HttpExceptions — without this, they'd fall through to a bare
// 500 "Internal server error" below, giving no hint that the fix is just
// "pick a smaller file" rather than a real server fault.
const MULTER_ERROR_MESSAGES: Partial<Record<MulterError["code"], string>> = {
  LIMIT_FILE_SIZE: "That file is too large — the limit is 150KB.",
  LIMIT_UNEXPECTED_FILE: "Unexpected file field.",
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const isMulterError = exception instanceof MulterError;

    const status = isHttpException
      ? exception.getStatus()
      : isMulterError
        ? HttpStatus.BAD_REQUEST
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = isHttpException
      ? typeof exceptionResponse === "string"
        ? exceptionResponse
        : ((exceptionResponse as { message?: string | string[] })?.message ??
          exception.message)
      : isMulterError
        ? (MULTER_ERROR_MESSAGES[exception.code] ?? exception.message)
        : "Internal server error";

    if (!isHttpException && !isMulterError) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
