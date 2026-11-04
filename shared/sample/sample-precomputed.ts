// PRECOMPUTED DEMO OUTPUT. This is a hand-authored fixture shaped like a model
// response, NOT live AI output. The UI badges it "Sample dataset / precomputed
// demo, not live AI". It still passes through the same deterministic verifier
// (shared/verify.ts) as live results.
//
// It deliberately includes one altered quote (households_served) so the demo can
// show a fabricated citation being caught and then repaired by the second pass.
// documentId values are fixture keys; they are mapped to real IDs on load.

import type { ModelField, ModelOutput } from '../model-output'

export const PRECOMPUTED_FIRST_PASS: ModelOutput = {
  fields: [
    {
      fieldId: 'organization_name',
      status: 'supported',
      value: 'Harbor Light Community Kitchen',
      reason: 'All three documents name the organization.',
      evidence: [
        {
          documentId: 'application',
          quote: 'Harbor Light Community Kitchen is a volunteer-supported kitchen that prepares hot meals five days a week.',
          value: 'Harbor Light Community Kitchen',
        },
      ],
    },
    {
      fieldId: 'primary_contact_email',
      status: 'supported',
      value: 'ines.park@harborlight.example',
      reason: 'The narrative names Ines Park as primary contact with this email.',
      evidence: [
        {
          documentId: 'application',
          quote: 'Ines Park, Program Director, ines.park@harborlight.example, is the primary contact for this application.',
          value: 'ines.park@harborlight.example',
        },
      ],
    },
    {
      fieldId: 'fiscal_sponsor',
      status: 'missing',
      value: null,
      reason: 'No document mentions a fiscal sponsor.',
      evidence: [],
    },
    {
      fieldId: 'project_title',
      status: 'supported',
      value: 'Neighborhood Meal Delivery Expansion',
      reason: 'The narrative states the project title.',
      evidence: [
        {
          documentId: 'application',
          quote: 'Project title: Neighborhood Meal Delivery Expansion',
          value: 'Neighborhood Meal Delivery Expansion',
        },
      ],
    },
    {
      fieldId: 'project_location',
      status: 'supported',
      value: 'Millbrook district',
      reason: 'The narrative and board minutes place the route in the Millbrook district.',
      evidence: [
        {
          documentId: 'application',
          quote: 'will extend our home delivery route across the Millbrook district',
          value: 'Millbrook district',
        },
        {
          documentId: 'minutes',
          quote: 'the expanded delivery route will cover the Millbrook district',
          value: 'Millbrook district',
        },
      ],
    },
    {
      fieldId: 'households_served',
      status: 'supported',
      value: '320',
      reason: 'The narrative states 320 households and the minutes confirm it.',
      evidence: [
        {
          documentId: 'application',
          // Deliberately altered (not verbatim) to demonstrate fabricated-citation detection.
          quote: 'The program will deliver meals to 320 households every week in Millbrook.',
          value: '320',
        },
      ],
    },
    {
      fieldId: 'start_date',
      status: 'supported',
      value: '2027-03-03',
      reason: 'Both the narrative and the follow-up email give March 3, 2027.',
      evidence: [
        {
          documentId: 'application',
          quote: 'Delivery on the expanded route will begin on March 3, 2027.',
          value: '2027-03-03',
        },
        {
          documentId: 'followup',
          quote: 'Deliveries on the expanded route are still scheduled to start on March 3, 2027',
          value: '2027-03-03',
        },
      ],
    },
    {
      fieldId: 'application_type',
      status: 'supported',
      value: 'New',
      reason: 'The narrative states the application type is New.',
      evidence: [
        {
          documentId: 'application',
          quote: 'Application type: New.',
          value: 'New',
        },
      ],
    },
    {
      fieldId: 'requested_amount',
      status: 'conflicting',
      value: null,
      reason: 'The narrative requests $48,000 but the follow-up email revises it to $54,000.',
      evidence: [
        {
          documentId: 'application',
          quote: 'We request $48,000 to cover a part-time delivery coordinator',
          value: '48000',
        },
        {
          documentId: 'followup',
          quote: 'we are revising our total request to $54,000',
          value: '54000',
        },
      ],
    },
  ],
}

export const PRECOMPUTED_REPAIRS: Record<string, ModelField> = {
  households_served: {
    fieldId: 'households_served',
    status: 'supported',
    value: '320',
    reason: 'The narrative states the route will serve 320 households, confirmed in the minutes.',
    evidence: [
      {
        documentId: 'application',
        quote: 'The expanded route will serve 320 households in the Millbrook district during the first year.',
        value: '320',
      },
      {
        documentId: 'minutes',
        quote: 'The Program Director confirmed the figure of 320 households',
        value: '320',
      },
    ],
  },
}
