/**
 * Structured error handling for Lift MCP tools.
 * Provides consistent error responses with codes and context.
 */

export type McpErrorCode =
  | 'AUTH_REQUIRED'
  | 'WRITES_DISABLED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR';

export class McpError extends Error {
  constructor(
    message: string,
    public readonly code: McpErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'McpError';
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && Object.keys(this.details).length > 0 ? { details: this.details } : {}),
    };
  }
}

/** Create a structured error response for MCP tools. */
export function errorResponse(
  message: string,
  code: McpErrorCode = 'UNKNOWN_ERROR',
  details?: Record<string, unknown>,
): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  const error = new McpError(message, code, details);
  return {
    content: [{ type: 'text', text: JSON.stringify(error.toJSON(), null, 2) }],
    isError: true,
  };
}

/** Wrap database errors with context. */
export function dbError(operation: string, originalError: Error): ReturnType<typeof errorResponse> {
  return errorResponse(
    `Database error during ${operation}: ${originalError.message}`,
    'DATABASE_ERROR',
    {
      operation,
      originalMessage: originalError.message,
    },
  );
}

/** Validation error with field-level details. */
export function validationError(
  message: string,
  fields?: Record<string, string>,
): ReturnType<typeof errorResponse> {
  return errorResponse(message, 'VALIDATION_ERROR', fields ? { fields } : undefined);
}

/** Not found error with resource context. */
export function notFoundError(resourceType: string, identifier: string): ReturnType<typeof errorResponse> {
  return errorResponse(`${resourceType} not found: ${identifier}`, 'NOT_FOUND', {
    resourceType,
    identifier,
  });
}

/** Writes disabled error. */
export function writesDisabledError(): ReturnType<typeof errorResponse> {
  return errorResponse(
    'Write operations are disabled (LIFT_MCP_WRITES_ENABLED!=true). Enable writes to log data from Claude.',
    'WRITES_DISABLED',
  );
}
