const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config/config');

class DatabaseService {
  constructor() {
    this.db = null;
    this.init();
  }

  async init() {
    try {
      // Create database directory if it doesn't exist
      const dbPath = config.NODE_ENV === 'test' 
        ? ':memory:' 
        : path.join(__dirname, '../../data/notifications.db');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          throw err;
        }
        console.log('📊 Connected to SQLite database');
      });

      await this.createTables();
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createNotificationsTable = `
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          recipient TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          priority TEXT DEFAULT 'normal',
          status TEXT DEFAULT 'pending',
          metadata TEXT,
          providerResponse TEXT,
          error TEXT,
          retryCount INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          sentAt DATETIME,
          failedAt DATETIME
        )
      `;

      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
        CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(createdAt);
        CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
      `;

      this.db.exec(createNotificationsTable + '; ' + createIndexes, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
        } else {
          console.log('📋 Database tables created/verified');
          resolve();
        }
      });
    });
  }

  async saveNotification(notification) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO notifications (
          id, recipient, message, type, priority, status, metadata, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        notification.id,
        notification.recipient,
        notification.message,
        notification.type,
        notification.priority || 'normal',
        notification.status || 'pending',
        JSON.stringify(notification.metadata || {}),
        notification.timestamp || new Date().toISOString(),
        new Date().toISOString()
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Error saving notification:', err);
          reject(err);
        } else {
          console.log(`💾 Notification ${notification.id} saved to database`);
          resolve({ id: notification.id, changes: this.changes });
        }
      });
    });
  }

  async updateNotification(id, updates) {
    return new Promise((resolve, reject) => {
      const updateFields = [];
      const params = [];

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'metadata' || key === 'providerResponse') {
          updateFields.push(`${key} = ?`);
          params.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }

      updateFields.push('updatedAt = ?');
      params.push(new Date().toISOString());
      params.push(id);

      const sql = `UPDATE notifications SET ${updateFields.join(', ')} WHERE id = ?`;

      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Error updating notification:', err);
          reject(err);
        } else {
          console.log(`🔄 Notification ${id} updated in database`);
          resolve({ id, changes: this.changes });
        }
      });
    });
  }

  async getNotification(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM notifications WHERE id = ?';
      
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          console.error('Error getting notification:', err);
          reject(err);
        } else {
          if (row) {
            // Parse JSON fields
            row.metadata = row.metadata ? JSON.parse(row.metadata) : {};
            row.providerResponse = row.providerResponse ? JSON.parse(row.providerResponse) : null;
          }
          resolve(row);
        }
      });
    });
  }

  async getNotifications(options = {}) {
    return new Promise((resolve, reject) => {
      const {
        limit = 50,
        offset = 0,
        type,
        status,
        recipient,
        startDate,
        endDate
      } = options;

      let sql = 'SELECT * FROM notifications WHERE 1=1';
      const params = [];

      if (type) {
        sql += ' AND type = ?';
        params.push(type);
      }

      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }

      if (recipient) {
        sql += ' AND recipient LIKE ?';
        params.push(`%${recipient}%`);
      }

      if (startDate) {
        sql += ' AND createdAt >= ?';
        params.push(startDate);
      }

      if (endDate) {
        sql += ' AND createdAt <= ?';
        params.push(endDate);
      }

      sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Error getting notifications:', err);
          reject(err);
        } else {
          // Parse JSON fields for each row
          const notifications = rows.map(row => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            providerResponse: row.providerResponse ? JSON.parse(row.providerResponse) : null
          }));
          
          resolve({
            notifications,
            total: notifications.length,
            limit,
            offset
          });
        }
      });
    });
  }

  async getNotificationStatistics(timeframe = '24h') {
    return new Promise((resolve, reject) => {
      let timeCondition = '';
      
      // Calculate time condition based on timeframe
      switch (timeframe) {
        case '1h':
          timeCondition = "datetime('now', '-1 hour')";
          break;
        case '24h':
          timeCondition = "datetime('now', '-1 day')";
          break;
        case '7d':
          timeCondition = "datetime('now', '-7 days')";
          break;
        case '30d':
          timeCondition = "datetime('now', '-30 days')";
          break;
        default:
          timeCondition = "datetime('now', '-1 day')";
      }

      const sql = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN type = 'email' THEN 1 END) as email,
          COUNT(CASE WHEN type = 'sms' THEN 1 END) as sms,
          COUNT(CASE WHEN type = 'push' THEN 1 END) as push,
          COUNT(CASE WHEN type = 'webhook' THEN 1 END) as webhook,
          AVG(CASE 
            WHEN sentAt IS NOT NULL AND createdAt IS NOT NULL 
            THEN (julianday(sentAt) - julianday(createdAt)) * 24 * 60 * 60 
          END) as avgProcessingTimeSeconds
        FROM notifications 
        WHERE createdAt >= ${timeCondition}
      `;

      this.db.get(sql, [], (err, row) => {
        if (err) {
          console.error('Error getting notification statistics:', err);
          reject(err);
        } else {
          const stats = {
            ...row,
            successRate: row.total > 0 ? (row.sent / row.total * 100).toFixed(2) : 0,
            failureRate: row.total > 0 ? (row.failed / row.total * 100).toFixed(2) : 0
          };
          resolve(stats);
        }
      });
    });
  }

  async deleteOldNotifications(daysToKeep = 30) {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM notifications 
        WHERE createdAt < datetime('now', '-${daysToKeep} days')
      `;

      this.db.run(sql, [], function(err) {
        if (err) {
          console.error('Error deleting old notifications:', err);
          reject(err);
        } else {
          console.log(`🗑️ Deleted ${this.changes} old notifications`);
          resolve({ deleted: this.changes });
        }
      });
    });
  }

  async getFailedNotifications(limit = 100) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM notifications 
        WHERE status = 'failed' 
        ORDER BY failedAt DESC 
        LIMIT ?
      `;

      this.db.all(sql, [limit], (err, rows) => {
        if (err) {
          console.error('Error getting failed notifications:', err);
          reject(err);
        } else {
          const notifications = rows.map(row => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            providerResponse: row.providerResponse ? JSON.parse(row.providerResponse) : null
          }));
          resolve(notifications);
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
            reject(err);
          } else {
            console.log('📊 Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = DatabaseService;
