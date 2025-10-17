import { z } from 'zod';

// Base event
const EventBase = z.object({
  type: z.string(), // will refine in specific events
  time: z.number(),
});

// Document-related base
const DocumentEventBase = EventBase.extend({
  documentUri: z.string(),
  documentText: z.string().optional(),
});

// IChangeEvent schema
const IChangeEvent = z.object({
  text: z.string(),
  rangeLength: z.number(),
  rangeOffset: z.number(),
});

// Specific event schemas

export const EditEvent = DocumentEventBase.extend({
  type: z.literal('EditEvent'),
  contentChanges: z.array(IChangeEvent),
  isUndoOrRedo: z.boolean().optional(),
});

export const CopyEvent = EventBase.extend({
  type: z.literal('CopyEvent'),
  copiedText: z.string(),
});

export const SaveEvent = DocumentEventBase.extend({
  type: z.literal('SaveEvent'),
  documentText: z.string(), // required on save
});

export const FocusDocumentEvent = DocumentEventBase.extend({
  type: z.literal('FocusDocumentEvent'),
});

// Discriminated union of all events
export const LogEvent = z.discriminatedUnion('type', [
  EditEvent,
  CopyEvent,
  SaveEvent,
  FocusDocumentEvent,
]);

// TypeScript types inferred from Zod
export type IChangeEvent = z.infer<typeof IChangeEvent>;
export type EditEvent = z.infer<typeof EditEvent>;
export type CopyEvent = z.infer<typeof CopyEvent>;
export type SaveEvent = z.infer<typeof SaveEvent>;
export type FocusDocumentEvent = z.infer<typeof FocusDocumentEvent>;
export type LogEvent = z.infer<typeof LogEvent>;
