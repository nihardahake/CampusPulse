const ApiError = require('../utils/ApiError');
const { ActivityLog } = require('../models');
const { notifyTicketParties } = require('./notificationService');

// ---------------------------------------------------------------------------
// Transition table – defines allowed status transitions and who can perform them
// ---------------------------------------------------------------------------
const TRANSITIONS = {
  OPEN: {
    ASSIGNED: { roles: ['ADMIN'], description: 'Admin assigns ticket' },
  },
  ASSIGNED: {
    IN_PROGRESS: { roles: ['STAFF'], description: 'Staff starts work' },
  },
  IN_PROGRESS: {
    RESOLVED: { roles: ['STAFF'], description: 'Staff resolves ticket', requiresNote: true },
  },
  RESOLVED: {
    CLOSED: { roles: ['STUDENT'], description: 'Student confirms resolution' },
    REOPENED: { roles: ['STUDENT'], description: 'Student reopens ticket', requiresNote: true },
  },
  REOPENED: {
    IN_PROGRESS: { roles: ['STAFF'], description: 'Staff resumes work' },
  },
};

// Priority escalation ladder used when a ticket is reopened
const PRIORITY_ESCALATION = {
  LOW: 'MEDIUM',
  MEDIUM: 'HIGH',
  HIGH: 'CRITICAL',
  CRITICAL: 'CRITICAL', // already at max
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a transition from `fromStatus` to `toStatus` is permitted
 * for the given `userRole`.
 *
 * @param  {string} fromStatus - Current ticket status
 * @param  {string} toStatus   - Desired target status
 * @param  {string} userRole   - Role of the acting user (STUDENT | STAFF | ADMIN)
 * @returns {{ allowed: boolean, reason?: string }}
 */
function canTransition(fromStatus, toStatus, userRole) {
  const fromMap = TRANSITIONS[fromStatus];
  if (!fromMap || !fromMap[toStatus]) {
    return {
      allowed: false,
      reason: `Transition from ${fromStatus} to ${toStatus} is not allowed`,
    };
  }

  const rule = fromMap[toStatus];
  if (!rule.roles.includes(userRole)) {
    return {
      allowed: false,
      reason: `Role ${userRole} cannot transition a ticket from ${fromStatus} to ${toStatus}`,
    };
  }

  return { allowed: true };
}

/**
 * Return the list of statuses the given role can transition a ticket to from
 * its `currentStatus`.
 *
 * @param  {string}   currentStatus - Current ticket status
 * @param  {string}   userRole      - Role of the acting user
 * @returns {string[]} Array of reachable statuses
 */
function getAvailableTransitions(currentStatus, userRole) {
  const fromMap = TRANSITIONS[currentStatus];
  if (!fromMap) return [];

  return Object.keys(fromMap).filter((toStatus) =>
    fromMap[toStatus].roles.includes(userRole)
  );
}

/**
 * Validate and execute a status transition on the given ticket document.
 *
 * Side-effects applied on the ticket (in-memory) before saving:
 *  - RESOLVED → REOPENED : increment reopenCount, bump priority one level,
 *                          keep same assignedTo staff
 *  - any → RESOLVED      : set resolvedAt = now
 *  - any → CLOSED        : set closedAt   = now
 *  - Always pushes an entry to statusHistory
 *
 * @param  {import('mongoose').Document} ticket - Mongoose Ticket document
 * @param  {string} toStatus                   - Target status
 * @param  {object} user                       - Acting user (must have _id & role)
 * @param  {string} [note]                     - Optional note for the transition
 * @returns {Promise<import('mongoose').Document>} The saved ticket
 * @throws {ApiError} 400 when the transition is invalid
 */
async function executeTransition(ticket, toStatus, user, note) {
  const fromStatus = ticket.status;

  // 1. Validate that the transition is allowed for this user's role
  const check = canTransition(fromStatus, toStatus, user.role);
  if (!check.allowed) {
    throw new ApiError(400, check.reason);
  }

  // 2. Enforce requiresNote when the rule mandates it
  const rule = TRANSITIONS[fromStatus][toStatus];
  if (rule.requiresNote && !note) {
    throw new ApiError(400, `A note is required when transitioning from ${fromStatus} to ${toStatus}`);
  }

  // 3. Handle RESOLVED → REOPENED specifics
  if (fromStatus === 'RESOLVED' && toStatus === 'REOPENED') {
    ticket.reopenCount = (ticket.reopenCount || 0) + 1;
    ticket.priority = PRIORITY_ESCALATION[ticket.priority] || ticket.priority;
    // assignedTo stays the same (reassigned to same staff)
  }

  // 4. Timestamp markers
  if (toStatus === 'RESOLVED') {
    ticket.resolvedAt = new Date();
  }
  if (toStatus === 'CLOSED') {
    ticket.closedAt = new Date();
  }

  // 5. Push status history entry
  ticket.statusHistory.push({
    from: fromStatus,
    to: toStatus,
    by: user._id,
    at: new Date(),
    note: note || undefined,
  });

  // 6. Update the status
  ticket.status = toStatus;

  // 7. Persist and return
  await ticket.save();
  await ActivityLog.create({ ticket: ticket._id, action: `Status changed to ${toStatus}`, actor: user._id, meta: { from: fromStatus, note } });
  await notifyTicketParties(ticket, `Ticket “${ticket.title}” is now ${toStatus}`);
  return ticket;
}

module.exports = {
  canTransition,
  getAvailableTransitions,
  executeTransition,
  TRANSITIONS,
};
