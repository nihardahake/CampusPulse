const { User, Ticket } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Auto-assign a ticket to the least-loaded staff member who handles the
 * given category.
 *
 * Selection strategy:
 *  1. Find all active STAFF users whose `categories` array includes `categoryId`.
 *  2. For each, count their tickets in ASSIGNED / IN_PROGRESS / REOPENED status.
 *  3. Pick the one with the fewest open tickets.
 *  4. Tie-break: choose the staff whose most recent ticket assignment is oldest
 *     (i.e. least recently assigned), ensuring fair round-robin distribution.
 *
 * @param  {import('mongoose').Document} ticket     - Ticket document (unsaved status = OPEN)
 * @param  {import('mongoose').Types.ObjectId|string} categoryId - Category ObjectId
 * @returns {Promise<object|null>} The assigned staff user, or null if none available
 */
async function autoAssignTicket(ticket, categoryId) {
  // 1. Find all eligible staff for this category
  const eligibleStaff = await User.find({
    role: 'STAFF',
    isActive: true,
    categories: categoryId,
  }).lean();

  if (eligibleStaff.length === 0) {
    return null;
  }

  // 2. For each staff member, count their active tickets and find last assignment time
  const activeStatuses = ['ASSIGNED', 'IN_PROGRESS', 'REOPENED'];

  const staffWorkloads = await Promise.all(
    eligibleStaff.map(async (staff) => {
      const [ticketCount, lastAssigned] = await Promise.all([
        // Count of tickets currently in active statuses
        Ticket.countDocuments({
          assignedTo: staff._id,
          status: { $in: activeStatuses },
        }),
        // Most recently assigned ticket (by updatedAt) for tie-breaking
        Ticket.findOne({ assignedTo: staff._id })
          .sort({ lastAssignedAt: -1 })
          .select('lastAssignedAt')
          .lean(),
      ]);

      return {
        staff,
        ticketCount,
        lastAssignedAt: lastAssigned ? lastAssigned.lastAssignedAt : new Date(0),
      };
    })
  );

  // 3. Sort: fewest tickets first, then oldest last-assignment first (tie-break)
  staffWorkloads.sort((a, b) => {
    if (a.ticketCount !== b.ticketCount) {
      return a.ticketCount - b.ticketCount;
    }
    // Tie-break: the one assigned longest ago gets the next ticket
    return new Date(a.lastAssignedAt) - new Date(b.lastAssignedAt);
  });

  const selected = staffWorkloads[0].staff;

  // 4. Assign the ticket
  ticket.assignedTo = selected._id;
  ticket.lastAssignedAt = new Date();
  ticket.status = 'ASSIGNED';

  // 5. Push status history entry (system-initiated, so `by` is null)
  ticket.statusHistory.push({
    from: 'OPEN',
    to: 'ASSIGNED',
    by: null,
    at: new Date(),
    note: 'Auto-assigned',
  });

  return selected;
}

/**
 * Reassign a ticket to a different staff member. Only admins should call this.
 *
 * @param  {import('mongoose').Document} ticket      - Ticket document
 * @param  {string}                      newStaffId  - ObjectId of the new staff
 * @param  {object}                      adminUser   - The admin performing the action
 * @returns {Promise<import('mongoose').Document>} The updated ticket (not yet saved)
 * @throws {ApiError} 400/404 on validation failures
 */
async function reassignTicket(ticket, newStaffId, adminUser) {
  // 1. Validate the new staff exists, is active, and has the STAFF role
  const newStaff = await User.findById(newStaffId);
  if (!newStaff) {
    throw new ApiError(404, 'Staff member not found');
  }
  if (!newStaff.isActive) {
    throw new ApiError(400, 'Cannot assign to an inactive staff member');
  }
  if (newStaff.role !== 'STAFF') {
    throw new ApiError(400, 'Ticket can only be assigned to a user with the STAFF role');
  }
  const categoryId = ticket.category && ticket.category._id ? ticket.category._id : ticket.category;
  if (!newStaff.categories.some((category) => category.toString() === categoryId.toString())) {
    throw new ApiError(400, 'Staff member does not handle this ticket category');
  }

  // 2. Validate ticket is not CLOSED
  if (ticket.status === 'CLOSED') {
    throw new ApiError(400, 'Cannot reassign a closed ticket');
  }

  const previousStatus = ticket.status;

  // 3. Update assignment
  ticket.assignedTo = newStaffId;
  ticket.lastAssignedAt = new Date();

  // 4. If ticket was OPEN, transition it to ASSIGNED
  if (previousStatus === 'OPEN') {
    ticket.status = 'ASSIGNED';
  }

  // 5. Record in status history
  ticket.statusHistory.push({
    from: previousStatus,
    to: ticket.status,
    by: adminUser._id,
    at: new Date(),
    note: `Reassigned to staff ${newStaff.name}`,
  });

  return ticket;
}

module.exports = {
  autoAssignTicket,
  reassignTicket,
};
