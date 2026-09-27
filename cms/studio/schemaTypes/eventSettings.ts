import {defineField, defineType} from 'sanity'

const timezoneDescription = 'Choose the intended time and check the editor timezone. Sanity stores UTC. The website displays event dates in Europe/Berlin; countdowns use the exact stored instant.'
const validDate = (value: string | undefined) => Boolean(value && /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value)))

export const eventSettings = defineType({
  name: 'eventSettings',
  title: 'Event Settings',
  type: 'document',

  fields: [
    defineField({
      name: 'eventName',
      title: 'Event Name',
      type: 'string',
      validation: (rule) => rule.required().max(120).custom((value) => Boolean(value?.trim()) || 'Enter an event name.'),
    }),

    defineField({
      name: 'eventStartDate',
      title: 'Event Start Date',
      type: 'datetime',
      description: `First day of the event. ${timezoneDescription}`,
      validation: (rule) => rule.required().custom((value) => validDate(value) || 'Enter a valid datetime with a timezone.'),
    }),

    defineField({
      name: 'eventEndDate',
      title: 'Event End Date',
      type: 'datetime',
      description: `Last day of the event; use the same day for a single-day event. ${timezoneDescription}`,
      validation: (rule) => rule.required().custom((value, context) => {
        if (!validDate(value)) return 'Enter a valid datetime with a timezone.'
        const start = context.document?.eventStartDate
        if (typeof start === 'string' && validDate(start) && Date.parse(value!) < Date.parse(start)) {
          return 'The event end must be on or after its start.'
        }
        return true
      }),
    }),

    defineField({
      name: 'eventLocation',
      title: 'Event Location',
      type: 'string',
      description: 'Location displayed in the homepage hero event-information line.',
      validation: (rule) => rule.required().max(160).custom((value) => Boolean(value?.trim()) || 'Enter a location.'),
    }),

    defineField({
      name: 'countdownEnabled',
      title: 'Countdown Enabled',
      type: 'boolean',
      initialValue: true,
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'countdownTitle',
      title: 'Countdown Title',
      type: 'string',
      validation: (rule) => rule.max(120).custom((value, context) => context.document?.countdownEnabled !== true || Boolean(value?.trim()) || 'Enter a title when the countdown is enabled.'),
    }),

    defineField({
      name: 'countdownTarget',
      title: 'Countdown Target',
      type: 'datetime',
      description: timezoneDescription,
      validation: (rule) => rule.custom((value, context) => context.document?.countdownEnabled !== true || validDate(value) || 'Enter a valid target with a timezone when the countdown is enabled.'),
    }),

    defineField({
      name: 'countdownExpiredMessage',
      title: 'Countdown Expired Message',
      type: 'string',
      validation: (rule) => rule.max(240).custom((value, context) => context.document?.countdownEnabled !== true || Boolean(value?.trim()) || 'Enter an expired message when the countdown is enabled.'),
    }),
  ],
})
