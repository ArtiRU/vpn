export enum PaymentProviderType {
    STRIPE = 'stripe',
    ANTILOPAY = 'antilopay',
    MANUAL = 'manual',
}

export enum PaymentStatusType {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
}
