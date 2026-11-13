
export class ApiError extends Error {
    public readonly status?: number;
    public readonly code?: string;
    public readonly errors?: unknown[];

    constructor(
        message: string,
        status?: number,
        code?: string,
        errors?: unknown[],
    ) {
        super(message);

        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.errors = errors;

        Object.setPrototypeOf(this, ApiError.prototype);
    }
}
