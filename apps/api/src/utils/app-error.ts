
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode = 500,
        isOperational = true,
    ) {
        super(message);

        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export interface ValidationErrorDetail {
    field: string;
    message: string;
}

export class RequestValidationError extends AppError {
    constructor(
        public readonly errors: ValidationErrorDetail[],
    ) {
        super("Validation failed", 400);
    }
}
