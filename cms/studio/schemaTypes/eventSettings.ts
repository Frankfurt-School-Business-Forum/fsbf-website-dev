import {defineField, defineType} from 'sanity'

export const eventSettings = defineType({
  name: 'eventSettings',
  title: 'Event Settings',
  type: 'document',

  fields: [
    defineField({
      name: 'eventName',
      title: 'Event Name',
      type: 'string',
    }),

    defineField({
      name: 'eventDate',
      title: 'Event Date',
      type: 'datetime',
    }),

    defineField({
      name: 'eventLocation',
      title: 'Event Location',
      type: 'string',
    }),

    defineField({
      name: 'countdownEnabled',
      title: 'Countdown Enabled',
      type: 'boolean',
      initialValue: true,
    }),

    defineField({
      name: 'countdownTitle',
      title: 'Countdown Title',
      type: 'string',
      initialValue: 'Next speaker wave reveals in',
    }),

    defineField({
      name: 'countdownTarget',
      title: 'Countdown Target',
      type: 'datetime',
    }),

    defineField({
      name: 'countdownExpiredMessage',
      title: 'Countdown Expired Message',
      type: 'string',
      initialValue: 'The next speaker wave is being revealed right now.',
    }),
  ],
})