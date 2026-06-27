import { SiteSettings } from '../models';

interface LegacyChristmasParty {
  enabled?: boolean;
  title?: string;
  date?: Date;
  note?: string;
  ticketUrl?: string;
}

function formatLegacyPartyDate(date?: Date | string): string {
  if (!date) return '';

  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

async function migrateLegacyChristmasParty(): Promise<void> {
  await SiteSettings.collection.updateMany(
    { 'announcement.linkTarget': 'Christmas Party' },
    { $set: { 'announcement.linkTarget': 'Featured' } }
  );

  const legacyDoc = await SiteSettings.collection.findOne({
    christmasParty: { $exists: true },
  });

  if (!legacyDoc) {
    return;
  }

  const legacy = legacyDoc.christmasParty as LegacyChristmasParty | undefined;

  await SiteSettings.collection.updateOne(
    { _id: legacyDoc._id },
    {
      $set: {
        featuredBanner: {
          enabled: Boolean(legacy?.enabled),
          title: legacy?.title?.trim() || 'Featured Event',
          subtitle: formatLegacyPartyDate(legacy?.date),
          note: legacy?.note?.trim() || '',
          buttonLabel: legacy?.ticketUrl?.trim() ? 'Learn More' : 'Learn More',
          buttonUrl: legacy?.ticketUrl?.trim() || '',
        },
      },
      $unset: { christmasParty: '' },
    }
  );
}

export async function ensureSettings(): Promise<void> {
  await migrateLegacyChristmasParty();

  const existing = await SiteSettings.findOne();

  if (!existing) {
    await SiteSettings.create({
      hours: [
        { label: 'Mon – Thu', value: '11AM – 2AM', order: 1 },
        { label: 'Fri – Sat', value: '11AM – 2:30AM', order: 2 },
        { label: 'Sun', value: '11AM – 2AM', order: 3 },
      ],
      contact: {
        address: '123 Main St, Your City, ST 12345',
        phone: '(555) 555-5555',
      },
    });
  }
}
