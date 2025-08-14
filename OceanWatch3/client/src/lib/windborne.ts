import jwt from 'jsonwebtoken';
import axios, { AxiosResponse } from 'axios';

export class WindBorneClient {
  private clientId: string;
  private apiKey: string;
  private signedToken: string;

  constructor() {
    this.clientId = 'OceanWatch'
    this.apiKey = 'wb_d4b5469ee771db4967b8398f89436adc'

    if (!this.clientId || !this.apiKey) {
      throw new Error("WB_CLIENT_ID and WB_API_KEY must be set");
    }

    this.signedToken = this.generateSignedToken();
  }

  private generateSignedToken(): string {
    const payload = {
      client_id: this.clientId,
      iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, this.apiKey, { algorithm: "HS256" });
  }

  async getRequest(url: string): Promise<AxiosResponse> {
    return this.wbGetRequest(url);
  }

  async wbGetRequest(url: string): Promise<AxiosResponse> {
    if (!this.clientId || !this.apiKey) {
      throw new Error("WB_CLIENT_ID and WB_API_KEY must be set");
    }

    const authString = `${this.clientId}:${this.signedToken}`;
    const encodedAuth = typeof btoa !== "undefined"
      ? btoa(authString)
      : Buffer.from(authString).toString("base64");

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Basic ${encodedAuth}`,
        },
      });
      return response;
    } catch (error: any) {
      if (error.response) {
        const { status, statusText, data } = error.response;
        throw new Error(
          `Request failed: ${status} ${statusText} - ${typeof data === 'string' ? data : JSON.stringify(data)}`
        );
      }
      throw error;
    }
  }
}
