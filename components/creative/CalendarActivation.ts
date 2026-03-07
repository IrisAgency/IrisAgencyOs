import { doc, writeBatch, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { CreativeCalendar, CreativeCalendarItem, CalendarMonth, CalendarItem, Client } from '../../types';

/**
 * Activates an approved creative calendar by copying its items into the
 * official Calendar Department collections (calendar_months + calendar_items).
 * Uses a Firestore writeBatch for atomicity.
 */
export async function activateCreativeCalendar(params: {
  creativeCalendar: CreativeCalendar;
  approvedItems: CreativeCalendarItem[];
  client: Client;
  creativeProjectId: string;
  userId: string;
}): Promise<{ calendarMonthId: string }> {
  const { creativeCalendar, approvedItems, client, creativeProjectId, userId } = params;
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  // 1. Create calendar_months document
  const calendarMonthRef = doc(collection(db, 'calendar_months'));
  const clientCode = (client as any).code || client.name?.substring(0, 3).toUpperCase() || 'CLI';
  
  const calendarMonthData: Omit<CalendarMonth, 'id'> = {
    clientId: creativeCalendar.clientId,
    monthKey: creativeCalendar.monthKey,
    title: `${clientCode} - ${creativeCalendar.monthKey} (Creative)`,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
  batch.set(calendarMonthRef, calendarMonthData);

  // 2. Create calendar_items for each approved creative calendar item
  // Group by type for sequential numbering
  const typeCounters: Record<string, number> = { VIDEO: 0, PHOTO: 0, MOTION: 0 };

  for (const item of approvedItems) {
    typeCounters[item.type] = (typeCounters[item.type] || 0) + 1;
    const seqNumber = typeCounters[item.type];
    const autoName = `${clientCode} - ${creativeCalendar.monthKey} - ${item.type} - ${String(seqNumber).padStart(2, '0')}`;

    const calendarItemRef = doc(collection(db, 'calendar_items'));
    const calendarItemData: Omit<CalendarItem, 'id'> = {
      calendarMonthId: calendarMonthRef.id,
      clientId: creativeCalendar.clientId,
      monthKey: creativeCalendar.monthKey,
      type: item.type,
      seqNumber,
      autoName,
      primaryBrief: item.briefDescription || item.mainIdea || '',
      notes: item.notes || '',
      referenceLinks: item.referenceLinks || [],
      referenceFiles: item.referenceFiles || [],
      publishAt: item.publishAt || '',
      // Calendar → Creative revision workflow linking
      linkedCreativeCalendarId: creativeCalendar.id,
      linkedCreativeItemId: item.id,
      revisionStatus: 'NONE',
      revisionCount: 0,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(calendarItemRef, calendarItemData);
  }

  // 3. Update creative_calendar status to APPROVED
  const creativeCalendarRef = doc(db, 'creative_calendars', creativeCalendar.id);
  batch.update(creativeCalendarRef, {
    status: 'APPROVED',
    lastReviewedAt: now,
    updatedAt: now,
    updatedBy: userId,
  });

  // 4. Update creative_project status to APPROVED
  const creativeProjectRef = doc(db, 'creative_projects', creativeProjectId);
  batch.update(creativeProjectRef, {
    status: 'APPROVED',
    updatedAt: now,
  });

  await batch.commit();
  return { calendarMonthId: calendarMonthRef.id };
}
