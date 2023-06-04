export class SecretProvider {
  constructor() {}

  async getSecret(secretId: string): Promise<string> {
    return process.env[secretId];
  }
}
