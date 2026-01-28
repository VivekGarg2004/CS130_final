export class ValidationError extends Error {
    public readonly status = 400;
    public readonly details: Record<string, string> | undefined;

    constructor(message: string, details?: Record<string, string>) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
    }
}

export class NotFoundError extends Error {
    public readonly status = 404;

    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

