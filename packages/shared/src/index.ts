// ОБЯЗАТЕЛЬНО должно быть слово export
export interface UserDTO {
  id: string;
  username: string;
  createdAt: string;
}

export interface EncryptedMessageDTO {
  id: string;
  chatId: string;
  senderId: string;
  ciphertext: string;
  iv: string;
  createdAt: string;
}
