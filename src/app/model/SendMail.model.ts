export interface MailAttachment {
  filename: string;
  /** Contenu binaire encodé en base64, sans le préfixe `data:…;base64,`. */
  contentBase64: string;
}

export interface SendMailPayload {
  to: string;
  subject: string;
  text: string;
  attachments?: MailAttachment[];
}
