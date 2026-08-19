/**
 * Your own person, one tap away.
 *
 * The escalation ladder rings on-call operators. **Most operators have no on-call anybody**
 * — they patrol alone, or their squad is asleep — so for them this is not the third rung of
 * anything. It is the whole safety net.
 *
 * Device-initiated, which the spec prefers for a reason worth restating: the number never
 * reaches the node, a relay, or anyone else's machine. It is on this phone, which already
 * has it in the address book, and nowhere else. There is no roster of operators' personal
 * contacts for a seizure or a subpoena to find, because there is no roster.
 *
 * **What it cannot do**, and the screen says so plainly: send itself. A web app can open a
 * message ready to go, but somebody has to tap send. So this is not cover for being
 * unconscious — which `declined.md` already says this system does not cover. It is a lone
 * operator, at the moment they are already acting, with their person one tap away instead of
 * four screens and a remembered number.
 *
 * Stored in the accruing tier: an operator who panic-wipes on a bad night must not find
 * their safety net gone the next time out. Burn takes it, and the wipe screen says so.
 */

import { get, set, clearField } from './storage';

export interface EmergencyContact {
  /** What the operator calls them. Never required to be a legal name. */
  label: string;
  /** Kept exactly as entered — the operator knows what their own dialler accepts. */
  number: string;
}

const FIELD = 'emergency_contact';

export function loadContact(): EmergencyContact | null {
  const c = get<EmergencyContact>('accruing', FIELD);
  return c && c.number ? c : null;
}

export class ContactError extends Error {}

export function saveContact(label: string, number: string): EmergencyContact {
  const name = label.trim();
  const num = number.trim();
  if (!name) throw new ContactError('Give them a name, so you know who you are about to text.');
  // Deliberately permissive. Numbers vary by country and by dialler, and an operator who
  // cannot save their own contact because a regex disagreed has been failed by this app in
  // the one place it must not fail them.
  if (!/[0-9]/.test(num)) throw new ContactError('That does not look like a number.');
  const contact = { label: name, number: num };
  set('accruing', FIELD, contact);
  return contact;
}

export function clearContact(): void {
  clearField('accruing', FIELD);
}

export interface DistressNote {
  callsign: string | null;
  area: string | null;
  at: Date;
}

/**
 * The message their person receives.
 *
 * Short, because it is an SMS and because it will be read on a lock screen by somebody who
 * was asleep. It names the app so the recipient knows what this is, says plainly that it is
 * not automatic, and gives them the two facts that help: where and when.
 */
export function distressMessage(note: DistressNote): string {
  const who = note.callsign ? `${note.callsign} here.` : 'This is me.';
  const when = note.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const where = note.area ? ` I was around ${note.area}.` : '';
  return (
    `${who} I need help — I sent this from NavCom at ${when}.${where} ` +
    `I pressed this myself, it is not automatic.`
  );
}

/**
 * A link that opens the messaging app with the text ready to send.
 *
 * `?&body=` rather than `?body=` or `&body=`: iOS historically wants an ampersand after the
 * number and Android wants a question mark, and this form is the one both accept. Tested
 * folklore rather than a standard, and worth leaving alone.
 */
export function smsLink(contact: EmergencyContact, message: string): string {
  return `sms:${contact.number}?&body=${encodeURIComponent(message)}`;
}

export function callLink(contact: EmergencyContact): string {
  return `tel:${contact.number}`;
}
