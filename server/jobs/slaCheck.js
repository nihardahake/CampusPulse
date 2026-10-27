const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const Comment = require('../models/Comment');
const config = require('../config');

/**
 * Priority escalation map: bumps priority one level up.
 * CRITICAL stays CRITICAL.
 */
const PRIORITY_ESCALATION = {
  LOW: 'MEDIUM',
  MEDIUM: 'HIGH',
  HIGH: 'CRITICAL',
  CRITICAL: 'CRITICAL',
};

/**
 * Run the SLA check job. This function is IDEMPOTENT — the escalationLevel
 * field on each ticket prevents double-escalation.
 *
 * @returns {{ escalatedToLevel1: number, escalatedToLevel2: number, autoClosed: number }}
 */
async function runSlaCheck() {
  const now = new Date();
  let escalatedToLevel1 = 0;
  let escalatedToLevel2 = 0;
  let autoClosed = 0;

  // ─── 1. Escalation Level 0 → 1 ──────────────────────────────────────────
  const level0Tickets = await Ticket.find({
    status: { $nin: ['RESOLVED', 'CLOSED'] },
    slaDeadline: { $lt: now },
    escalationLevel: 0,
  });

  for (const ticket of level0Tickets) {
    const claimed = await Ticket.findOneAndUpdate({ _id: ticket._id, status: { $nin: ['RESOLVED', 'CLOSED'] }, escalationLevel: 0 }, { $set: { priority: PRIORITY_ESCALATION[ticket.priority] || ticket.priority, escalationLevel: 1 } }, { new: true });
    if (!claimed) continue;

    // Build list of users to notify: assigned staff + all admins
    const notifyUserIds = [];
    if (ticket.assignedTo) {
      notifyUserIds.push(ticket.assignedTo);
    }

    const admins = await User.find({ role: 'ADMIN' });
    for (const admin of admins) {
      // Avoid duplicate if assigned staff is also an admin
      if (!notifyUserIds.some((id) => id.toString() === admin._id.toString())) {
        notifyUserIds.push(admin._id);
      }
    }

    // Create notifications
    for (const userId of notifyUserIds) {
      await Notification.create({
        user: userId,
        ticket: ticket._id,
        message: `SLA breached for ticket: ${ticket.title}`,
      });
    }

    // Activity log
    await ActivityLog.create({
      ticket: claimed._id,
      action: 'SLA breached - escalated to level 1',
    });

    escalatedToLevel1++;
  }

  // ─── 2. Escalation Level 1 → 2 ──────────────────────────────────────────
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const level1Tickets = await Ticket.find({
    status: { $nin: ['RESOLVED', 'CLOSED'] },
    escalationLevel: 1,
  });

  for (const ticket of level1Tickets) {
    // Check if the level 1 escalation activity log was created more than 24h ago
    const escalationLog = await ActivityLog.findOne({
      ticket: ticket._id,
      action: 'SLA breached - escalated to level 1',
      createdAt: { $lt: twentyFourHoursAgo },
    });

    if (!escalationLog) continue;

    const claimed = await Ticket.findOneAndUpdate({ _id: ticket._id, status: { $nin: ['RESOLVED', 'CLOSED'] }, escalationLevel: 1 }, { $set: { priority: 'CRITICAL', escalationLevel: 2 } }, { new: true });
    if (!claimed) continue;

    // Notify all admins
    const admins = await User.find({ role: 'ADMIN' });
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        ticket: ticket._id,
        message: `Critical escalation for ticket: ${ticket.title}`,
      });
    }

    // Activity log
    await ActivityLog.create({
      ticket: claimed._id,
      action: 'Escalated to level 2 - critical',
    });

    escalatedToLevel2++;
  }

  // ─── 3. Auto-close resolved tickets after 72 hours ───────────────────────
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

  const resolvedTickets = await Ticket.find({
    status: 'RESOLVED',
    resolvedAt: { $exists: true, $lt: seventyTwoHoursAgo },
  });

  for (const ticket of resolvedTickets) {
    if (await Comment.exists({ ticket: ticket._id, author: ticket.createdBy, createdAt: { $gt: ticket.resolvedAt } })) continue;
    const claimed = await Ticket.findOneAndUpdate({ _id: ticket._id, status: 'RESOLVED', resolvedAt: { $lt: seventyTwoHoursAgo } }, { $set: { status: 'CLOSED', closedAt: now }, $push: { statusHistory: {
      from: 'RESOLVED',
      to: 'CLOSED',
      by: null,
      at: now,
      note: 'Auto-closed after 72h with no response',
    } } }, { new: true });
    if (!claimed) continue;

    // Notify the ticket creator
    await Notification.create({
      user: claimed.createdBy,
      ticket: claimed._id,
      message: `Your ticket "${claimed.title}" has been auto-closed after 72 hours`,
    });

    // Activity log
    await ActivityLog.create({
      ticket: claimed._id,
      action: 'Auto-closed',
    });

    autoClosed++;
  }

  console.log(
    `[SLA Check] Escalated L1: ${escalatedToLevel1}, Escalated L2: ${escalatedToLevel2}, Auto-closed: ${autoClosed}`
  );

  return { escalatedToLevel1, escalatedToLevel2, autoClosed };
}

/**
 * Start the SLA check cron job using the schedule from config.
 */
function startSlaJob() {
  const cronExpression = config.SLA_CRON;

  if (!cronExpression) {
    console.warn('⚠️  SLA_CRON not configured, SLA check job will not start');
    return;
  }

  cron.schedule(cronExpression, async () => {
    console.log(`[SLA Check] Running at ${new Date().toISOString()}`);
    try {
      await runSlaCheck();
    } catch (err) {
      console.error('[SLA Check] Error:', err.message);
    }
  });

  console.log(`⏰ SLA check job scheduled with cron: ${cronExpression}`);
}

module.exports = { runSlaCheck, startSlaJob };
