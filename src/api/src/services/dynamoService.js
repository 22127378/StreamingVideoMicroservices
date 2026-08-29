/**
 * DynamoDB Data Access Service
 * Handles CRUD and GSI Queries for Users, Channels, Streams, and Follows tables.
 */

const {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand
} = require('@aws-sdk/lib-dynamodb');
const { dynamoDocClient, AWS_CONFIG } = require('../config/aws');

class DynamoService {
  // ==========================================
  // USERS OPERATIONS
  // ==========================================

  async createUser(user) {
    const params = {
      TableName: AWS_CONFIG.tables.users,
      Item: {
        ...user,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      ConditionExpression: 'attribute_not_exists(user_id)'
    };
    await dynamoDocClient.send(new PutCommand(params));
    return params.Item;
  }

  async getUserById(userId) {
    const params = {
      TableName: AWS_CONFIG.tables.users,
      Key: { user_id: userId }
    };
    const result = await dynamoDocClient.send(new GetCommand(params));
    return result.Item || null;
  }

  async getUserByEmail(email) {
    const params = {
      TableName: AWS_CONFIG.tables.users,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email.toLowerCase() }
    };
    const result = await dynamoDocClient.send(new QueryCommand(params));
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  }

  async getUserByUsername(username) {
    const params = {
      TableName: AWS_CONFIG.tables.users,
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: { ':username': username.toLowerCase() }
    };
    const result = await dynamoDocClient.send(new QueryCommand(params));
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  }

  // ==========================================
  // CHANNELS OPERATIONS
  // ==========================================

  async createChannel(channel) {
    const params = {
      TableName: AWS_CONFIG.tables.channels,
      Item: {
        ...channel,
        is_live: channel.is_live || 'false',
        viewer_count: channel.viewer_count || 0,
        follower_count: channel.follower_count || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
    await dynamoDocClient.send(new PutCommand(params));
    return params.Item;
  }

  async getChannelById(channelId) {
    const params = {
      TableName: AWS_CONFIG.tables.channels,
      Key: { channel_id: channelId }
    };
    const result = await dynamoDocClient.send(new GetCommand(params));
    return result.Item || null;
  }

  async getChannelByStreamerId(streamerId) {
    const params = {
      TableName: AWS_CONFIG.tables.channels,
      IndexName: 'streamer_id-index',
      KeyConditionExpression: 'streamer_id = :s_id',
      ExpressionAttributeValues: { ':s_id': streamerId }
    };
    const result = await dynamoDocClient.send(new QueryCommand(params));
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  }

  async listLiveChannels(limit = 20) {
    const params = {
      TableName: AWS_CONFIG.tables.channels,
      IndexName: 'is_live-index',
      KeyConditionExpression: 'is_live = :live',
      ExpressionAttributeValues: { ':live': 'true' },
      Limit: limit
    };
    const result = await dynamoDocClient.send(new QueryCommand(params));
    return result.Items || [];
  }

  async listChannelsByCategory(category, limit = 20) {
    const params = {
      TableName: AWS_CONFIG.tables.channels,
      IndexName: 'category-index',
      KeyConditionExpression: 'category = :cat',
      ExpressionAttributeValues: { ':cat': category },
      Limit: limit
    };
    const result = await dynamoDocClient.send(new QueryCommand(params));
    return result.Items || [];
  }

  async updateChannel(channelId, updateFields) {
    const expressions = [];
    const attrNames = {};
    const attrValues = {};

    Object.keys(updateFields).forEach((key, index) => {
      const nameKey = `#field_${index}`;
      const valKey = `:val_${index}`;
      expressions.push(`${nameKey} = ${valKey}`);
      attrNames[nameKey] = key;
      attrValues[valKey] = updateFields[key];
    });

    expressions.push('#updated_at = :updated_at');
    attrNames['#updated_at'] = 'updated_at';
    attrValues[':updated_at'] = new Date().toISOString();

    const params = {
      TableName: AWS_CONFIG.tables.channels,
      Key: { channel_id: channelId },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: attrNames,
      ExpressionAttributeValues: attrValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDocClient.send(new UpdateCommand(params));
    return result.Attributes;
  }

  // ==========================================
  // STREAMS & VOD OPERATIONS
  // ==========================================

  async createStream(streamData) {
    const params = {
      TableName: AWS_CONFIG.tables.streams,
      Item: {
        ...streamData,
        status: streamData.status || 'PROCESSING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
    await dynamoDocClient.send(new PutCommand(params));
    return params.Item;
  }

  async getStreamById(streamId) {
    const params = {
      TableName: AWS_CONFIG.tables.streams,
      Key: { stream_id: streamId }
    };
    const result = await dynamoDocClient.send(new GetCommand(params));
    return result.Item || null;
  }

  async getStreamsByChannelId(channelId, limit = 20) {
    const params = {
      TableName: AWS_CONFIG.tables.streams,
      IndexName: 'channel_id-index',
      KeyConditionExpression: 'channel_id = :c_id',
      ExpressionAttributeValues: { ':c_id': channelId },
      Limit: limit
    };
    const result = await dynamoDocClient.send(new QueryCommand(params));
    return result.Items || [];
  }

  async updateStreamStatus(streamId, status, extraFields = {}) {
    const params = {
      TableName: AWS_CONFIG.tables.streams,
      Key: { stream_id: streamId },
      UpdateExpression: 'SET #s = :status, #u = :updated_at',
      ExpressionAttributeNames: {
        '#s': 'status',
        '#u': 'updated_at'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updated_at': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDocClient.send(new UpdateCommand(params));
    return result.Attributes;
  }

  // ==========================================
  // FOLLOWS OPERATIONS
  // ==========================================

  async followChannel(userId, channelId) {
    const params = {
      TableName: AWS_CONFIG.tables.follows,
      Item: {
        user_id: userId,
        channel_id: channelId,
        followed_at: new Date().toISOString()
      }
    };
    await dynamoDocClient.send(new PutCommand(params));
    return params.Item;
  }

  async unfollowChannel(userId, channelId) {
    const params = {
      TableName: AWS_CONFIG.tables.follows,
      Key: {
        user_id: userId,
        channel_id: channelId
      }
    };
    await dynamoDocClient.send(new DeleteCommand(params));
    return { success: true };
  }

  async isFollowing(userId, channelId) {
    const params = {
      TableName: AWS_CONFIG.tables.follows,
      Key: {
        user_id: userId,
        channel_id: channelId
      }
    };
    const result = await dynamoDocClient.send(new GetCommand(params));
    return !!result.Item;
  }
}

module.exports = new DynamoService();
