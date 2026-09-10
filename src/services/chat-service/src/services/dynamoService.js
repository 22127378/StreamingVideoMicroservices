/**
 * chat-service — DynamoDB (Follows read-only + Users for JWT auth)
 */
const { GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDocClient, AWS_CONFIG } = require('../../../shared/config/aws');
const FOLLOWS = AWS_CONFIG.tables.follows;
const USERS   = AWS_CONFIG.tables.users;

class ChatDynamoService {
  async getUserById(userId) {
    const r = await dynamoDocClient.send(new GetCommand({ TableName: USERS, Key: { user_id: userId } }));
    return r.Item || null;
  }

  async isFollowing(userId, channelId) {
    const r = await dynamoDocClient.send(new GetCommand({ TableName: FOLLOWS, Key: { user_id: userId, channel_id: channelId } }));
    return !!r.Item;
  }

  async getFollowersByChannel(channelId) {
    const r = await dynamoDocClient.send(new QueryCommand({
      TableName: FOLLOWS,
      IndexName: 'channel_id-index',
      KeyConditionExpression: 'channel_id = :c',
      ExpressionAttributeValues: { ':c': channelId }
    }));
    return r.Items || [];
  }
}

module.exports = new ChatDynamoService();
