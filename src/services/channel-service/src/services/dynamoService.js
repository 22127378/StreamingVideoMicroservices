/**
 * channel-service — DynamoDB Service (Channels + Follows tables)
 */
const { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDocClient, AWS_CONFIG } = require('../../../shared/config/aws');

const CHANNELS = AWS_CONFIG.tables.channels;
const FOLLOWS  = AWS_CONFIG.tables.follows;
const USERS    = AWS_CONFIG.tables.users;

class ChannelDynamoService {
  // Required by authMiddleware factory
  async getUserById(userId) {
    const r = await dynamoDocClient.send(new GetCommand({ TableName: USERS, Key: { user_id: userId } }));
    return r.Item || null;
  }

  // ---- Channels ----
  async createChannel(channel) {
    const item = {
      ...channel,
      is_live: channel.is_live || 'false',
      viewer_count: channel.viewer_count || 0,
      follower_count: channel.follower_count || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await dynamoDocClient.send(new PutCommand({ TableName: CHANNELS, Item: item }));
    return item;
  }

  async getChannelById(channelId) {
    const r = await dynamoDocClient.send(new GetCommand({ TableName: CHANNELS, Key: { channel_id: channelId } }));
    return r.Item || null;
  }

  async getChannelByStreamerId(streamerId) {
    const r = await dynamoDocClient.send(new QueryCommand({
      TableName: CHANNELS,
      IndexName: 'streamer_id-index',
      KeyConditionExpression: 'streamer_id = :s',
      ExpressionAttributeValues: { ':s': streamerId }
    }));
    return r.Items?.[0] || null;
  }

  async listLiveChannels(limit = 20) {
    const r = await dynamoDocClient.send(new QueryCommand({
      TableName: CHANNELS,
      IndexName: 'is_live-index',
      KeyConditionExpression: 'is_live = :live',
      ExpressionAttributeValues: { ':live': 'true' },
      Limit: limit
    }));
    return r.Items || [];
  }

  async listChannelsByCategory(category, limit = 20) {
    const r = await dynamoDocClient.send(new QueryCommand({
      TableName: CHANNELS,
      IndexName: 'category-index',
      KeyConditionExpression: 'category = :cat',
      ExpressionAttributeValues: { ':cat': category },
      Limit: limit
    }));
    return r.Items || [];
  }

  async updateChannel(channelId, fields) {
    const expressions = [];
    const attrNames = {};
    const attrValues = {};
    Object.keys(fields).forEach((key, i) => {
      expressions.push(`#f${i} = :v${i}`);
      attrNames[`#f${i}`] = key;
      attrValues[`:v${i}`] = fields[key];
    });
    expressions.push('#ua = :ua');
    attrNames['#ua'] = 'updated_at';
    attrValues[':ua'] = new Date().toISOString();

    const r = await dynamoDocClient.send(new UpdateCommand({
      TableName: CHANNELS,
      Key: { channel_id: channelId },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: attrNames,
      ExpressionAttributeValues: attrValues,
      ReturnValues: 'ALL_NEW'
    }));
    return r.Attributes;
  }

  // ---- Follows ----
  async followChannel(userId, channelId) {
    const item = { user_id: userId, channel_id: channelId, followed_at: new Date().toISOString() };
    await dynamoDocClient.send(new PutCommand({ TableName: FOLLOWS, Item: item }));
    return item;
  }

  async unfollowChannel(userId, channelId) {
    await dynamoDocClient.send(new DeleteCommand({ TableName: FOLLOWS, Key: { user_id: userId, channel_id: channelId } }));
    return { success: true };
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

module.exports = new ChannelDynamoService();
