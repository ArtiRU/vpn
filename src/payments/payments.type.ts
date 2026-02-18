export enum PaymentProviderType {
  YOOKASSA = 'yookassa',
  MANUAL = 'manual',
}

export enum PaymentStatusType {
  PENDING = 'pending',
  WAITING_FOR_CAPTURE = 'waiting_for_capture',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
  FAILED = 'failed',
}
