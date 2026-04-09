export class SpecialistError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SpecialistError';
  }
}

export class ValidationError extends SpecialistError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class ProviderError extends SpecialistError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PROVIDER_ERROR', details);
    this.name = 'ProviderError';
  }
}

export class PayloadBuildError extends SpecialistError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PAYLOAD_BUILD_ERROR', details);
    this.name = 'PayloadBuildError';
  }
}
