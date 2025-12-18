import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export class Client {
  private client: DocumentClient;
  constructor() {
    this.client = new DocumentClient();
  }
  async put(params: DocumentClient.PutItemInput) {
    return this.client.put(params).promise();
  }
}

export default new Client();
