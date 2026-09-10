const { GetCommand, PutCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDocClient, AWS_CONFIG } = require('../../../shared/config/aws');
const STREAMS = AWS_CONFIG.tables.streams;
const CHANNELS = AWS_CONFIG.tables.channels;
const USERS = AWS_CONFIG.tables.users;

class VodDynamoService {
  async getUserById(userId) {
    const r = await dynamoDocClient.send(new GetCommand({ TableName: USERS, Key: { user_id: userId } }));
    return r.Item || null;
  }
  async getChannelByStreamerId(streamerId) {
    const r = await dynamoDocClient.send(new QueryCommand({
      TableName: CHANNELS, IndexName: 'streamer_id-index',
      KeyConditionExpression: 'streamer_id = :s',
      ExpressionAttributeValues: { ':s': streamerId }
    }));
    return r.Items?.[0] || null;
  }
  async createStream(data) {
    const item = { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await dynamoDocClient.send(new PutCommand({ TableName: STREAMS, Item: item }));
    return item;
  }
  async getStreamById(id) {
    const r = await dynamoDocClient.send(new GetCommand({ TableName: STREAMS, Key: { stream_id: id } }));
    return r.Item || null;
  }
  async getStreamsByChannelId(channelId, limit = 20) {
    const r = await dynamoDocClient.send(new QueryCommand({
      TableName: STREAMS, IndexName: 'channel_id-index',
      KeyConditionExpression: 'channel_id = :c',
      ExpressionAttributeValues: { ':c': channelId },
      Limit: limit
    }));
    return r.Items || [];
  }
}

module.exports = new VodDynamoService();
