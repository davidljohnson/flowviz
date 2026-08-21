/**
 * The relationship verbs offered when labelling an edge, shared by the
 * double-click editor and the edge inspector.
 *
 * Sentence case, because it is the analysis that writes most of the edges in
 * any real flow and it writes "Uses" - a hand-labelled edge sitting among
 * eleven generated ones should not be the one that looks different. The
 * assistant prompt already asks for this shape, so this is the third place
 * agreeing rather than a new convention.
 *
 * Only the first word is capitalised: these are labels on a diagram, not
 * titles. Free text is left exactly as typed.
 *
 * Case carries no meaning downstream - the STIX exporter lowercases before
 * matching relationship types - so this is presentation, and changing it
 * cannot break an export.
 */
export const RELATIONSHIP_SUGGESTIONS = [
  'Uses',
  'Targets',
  'Delivers',
  'Drops',
  'Downloads',
  'Exploits',
  'Hosts',
  'Communicates with',
  'Connects to',
  'Controls',
  'Indicates',
  'Impersonates',
  'Leads to',
  'Enables',
  'Requires',
  'Affects',
];
