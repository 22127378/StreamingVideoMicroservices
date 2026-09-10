/**
 * auth-service — DynamoDB Service (Users table only)
 */
const { GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDocClient, AWS_CONFIG } = require('../../../shared/config/aws');

const TABLE = AWS_CONFIG.tables.users;

class AuthDynamoService {
  async createUser(user) {
    const item = { ...user, created_at: user.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
    await dynamoDocClient.send(new PutCommand({ TableName: TABLE, Item: item }));
    return item;
  }

  async getUserById(userId) {
    const r = await dynamoDocClient.send(new GetCommand({ TableName: TABLE, Key: { user_id: userId } }));
    return r.Item || null;
  }

  async getUserByEmail(email) {
    const r = await dynamoDocClient.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :e',
      ExpressionAttributeValues: { ':e': email.toLowerCase() }
    }));
    return r.Items?.[0] || null;
  }

  async getUserByUsername(username) {
    const r = await dynamoDocClient.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :u',
      ExpressionAttributeValues: { ':u': username.toLowerCase() }
    }));
    return r.Items?.[0] || null;
  }

  // Required by authMiddleware factory
  async updateUser(user) {
    const item = { ...user, updated_at: new Date().toISOString() };
    await dynamoDocClient.send(new PutCommand({ TableName: TABLE, Item: item }));
    return item;
  }
}

module.exports = new AuthDynamoService();
